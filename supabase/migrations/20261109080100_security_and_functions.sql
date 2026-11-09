-- RLS, private storage, atomic write functions and read views (Security §5, LLD §17).
-- Default deny: HR users can READ candidate data; every WRITE goes through a
-- server-side function. The browser never holds the service-role key.

-- ---------------------------------------------------------------- role helpers
create or replace function public.is_hr() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_users where user_id = (select auth.uid()));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'ADMIN');
$$;

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array[
    'app_users','jobs','job_criteria','source_documents','candidates','resume_documents','parsed_documents',
    'processing_jobs','document_extractions','candidate_profiles','candidate_assessments',
    'criterion_assessments','ranking_snapshots','ranking_snapshot_items','review_events','audit_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  -- Read access for HR reviewers only; no insert/update/delete policies exist for clients.
  foreach t in array array[
    'jobs','job_criteria','source_documents','candidates','resume_documents','parsed_documents',
    'processing_jobs','document_extractions','candidate_profiles','candidate_assessments',
    'criterion_assessments','ranking_snapshots','ranking_snapshot_items','review_events']
  loop
    execute format('create policy hr_read on public.%I for select to authenticated using ((select public.is_hr()))', t);
  end loop;
end $$;

create policy own_role_read on public.app_users for select to authenticated using (user_id = (select auth.uid()));
create policy admin_audit_read on public.audit_logs for select to authenticated using ((select public.is_admin()));

-- Belt and braces: clients never write these tables directly.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;
revoke usage, select on sequence public.candidate_ref_seq from anon, authenticated;

-- ---------------------------------------------------------------- private storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880,
  array['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'])
on conflict (id) do update set public = false;
-- No storage.objects policies are created for this bucket: only the server (service role)
-- reads or writes objects, and HR access is via short-lived signed URLs issued after an
-- authorization check.

-- ---------------------------------------------------------------- reviewer action
create or replace function public.record_review(
  p_candidate_id uuid, p_status text, p_notes text, p_idempotency_key text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  prev text;
  ev_id uuid;
begin
  if not public.is_hr() then raise exception 'AUTHORIZATION_ERROR' using errcode = '42501'; end if;
  select id into ev_id from public.review_events where idempotency_key = p_idempotency_key;
  if ev_id is not null then return ev_id; end if;

  select review_status into prev from public.candidates where id = p_candidate_id for update;
  if not found then raise exception 'candidate not found' using errcode = 'P0002'; end if;

  if p_status is not null and p_status is distinct from prev then
    update public.candidates set review_status = p_status where id = p_candidate_id;
    insert into public.review_events (candidate_id, actor_id, event_type, previous_value, new_value, notes, idempotency_key)
    values (p_candidate_id, auth.uid(), 'STATUS_CHANGE', to_jsonb(prev), to_jsonb(p_status), nullif(trim(p_notes), ''), p_idempotency_key)
    returning id into ev_id;
  elsif nullif(trim(coalesce(p_notes, '')), '') is not null then
    insert into public.review_events (candidate_id, actor_id, event_type, notes, idempotency_key)
    values (p_candidate_id, auth.uid(), 'NOTE', trim(p_notes), p_idempotency_key)
    returning id into ev_id;
  end if;

  insert into public.audit_logs (actor_id, event_type, resource_type, resource_id, metadata)
  values (auth.uid(), 'REVIEW_RECORDED', 'candidate', p_candidate_id, jsonb_build_object('status', p_status));
  return ev_id;
end $$;

-- ---------------------------------------------------------------- job lease (LLD §17.2)
create or replace function public.claim_processing_job(p_job_id uuid, p_owner text, p_lease_seconds integer default 180)
returns setof public.processing_jobs
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.processing_jobs j
     set lease_owner = p_owner,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds),
         attempt_count = j.attempt_count + 1,
         status = 'PARSING',
         started_at = coalesce(j.started_at, now()),
         updated_at = now()
   where j.id = (
     select id from public.processing_jobs
      where id = p_job_id
        and attempt_count < max_attempts
        and (status in ('QUEUED', 'RETRY_WAIT')
             or (status not in ('COMPLETED', 'FAILED', 'CANCELLED', 'REVIEW_REQUIRED') and lease_expires_at < now()))
      for update skip locked)
  returning j.*;
end $$;

-- ---------------------------------------------------------------- atomic result write (LLD §17.3)
create or replace function public.persist_assessment_bundle(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_resume uuid := (p->>'resume_id')::uuid;
  v_candidate uuid := (p->>'candidate_id')::uuid;
  v_parsed uuid := (p->>'parsed_document_id')::uuid;
  v_extraction uuid;
  v_profile uuid;
  v_assessment uuid;
  v_job uuid;
  a jsonb;
  c jsonb;
  existing uuid;
begin
  -- Idempotent: the same parsed document + prompt/schema/model + normalization version
  -- resolves to the profile already written by an earlier attempt.
  select pr.id into existing
    from public.candidate_profiles pr
    join public.document_extractions x on x.id = pr.extraction_id
   where pr.resume_id = v_resume and x.parsed_document_id = v_parsed
     and x.prompt_version = p#>>'{extraction,prompt_version}'
     and x.schema_version = p#>>'{extraction,schema_version}'
     and x.model_name = p#>>'{extraction,model_name}'
     and pr.normalization_version = p#>>'{profile,normalization_version}'
   limit 1;
  if existing is not null then
    v_profile := existing;
  else
    insert into public.document_extractions (resume_id, parsed_document_id, extraction_version, model_provider, model_name,
      prompt_version, schema_version, raw_model_output, validation_status)
    values (v_resume, v_parsed,
      coalesce((select max(extraction_version) from public.document_extractions where resume_id = v_resume), 0) + 1,
      p#>>'{extraction,model_provider}', p#>>'{extraction,model_name}', p#>>'{extraction,prompt_version}',
      p#>>'{extraction,schema_version}', p#>'{extraction,raw_model_output}', 'VALID')
    returning id into v_extraction;

    update public.candidate_profiles set is_current = false where resume_id = v_resume and is_current;
    insert into public.candidate_profiles (candidate_id, resume_id, extraction_id, profile_version, normalization_version,
      normalized_profile, extraction_quality, classification, classification_version)
    values (v_candidate, v_resume, v_extraction,
      coalesce((select max(profile_version) from public.candidate_profiles where resume_id = v_resume), 0) + 1,
      p#>>'{profile,normalization_version}', p#>'{profile,normalized_profile}', p#>'{profile,extraction_quality}',
      p#>>'{profile,classification}', p#>>'{profile,classification_version}')
    returning id into v_profile;
  end if;

  for a in select * from jsonb_array_elements(p->'assessments') loop
    select id into v_job from public.jobs where job_key = a->>'job_key' and jd_version = a->>'jd_version';
    if v_job is null then raise exception 'unknown job %', a->>'job_key'; end if;

    insert into public.candidate_assessments (candidate_id, resume_id, profile_id, job_id, jd_version, rubric_version,
      scoring_version, score, score_band, primary_points, review_flags, mandatory)
    values (v_candidate, v_resume, v_profile, v_job, a->>'jd_version', a->>'rubric_version', a->>'scoring_version',
      (a->>'score')::numeric, a->>'score_band', (a->>'primary_points')::numeric, a->'review_flags', a->'mandatory')
    on conflict (profile_id, job_id, jd_version, rubric_version, scoring_version) do nothing
    returning id into v_assessment;

    if v_assessment is not null then
      for c in select * from jsonb_array_elements(a->'criteria') loop
        insert into public.criterion_assessments (assessment_id, job_id, criterion_id, evidence_state, multiplier,
          criterion_weight, points_awarded, evidence, explanation, review_required)
        select v_assessment, v_job, jc.id, c->>'evidence_state', (c->>'multiplier')::numeric,
          (c->>'criterion_weight')::numeric, (c->>'points_awarded')::numeric, c->'evidence', c->>'explanation',
          (c->>'review_required')::boolean
          from public.job_criteria jc
         where jc.job_id = v_job and jc.rubric_version = a->>'rubric_version' and jc.criterion_key = c->>'criterion_key';
        if not found then raise exception 'unknown criterion %', c->>'criterion_key'; end if;
      end loop;
    end if;
  end loop;

  return jsonb_build_object('profile_id', v_profile, 'reused', existing is not null);
end $$;

-- ---------------------------------------------------------------- ranking snapshot (LLD §15)
create or replace function public.save_ranking_snapshot(
  p_job_key text, p_jd_version text, p_rubric_version text, p_scoring_version text, p_items jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_job uuid;
  v_snapshot uuid;
begin
  select id into v_job from public.jobs where job_key = p_job_key and jd_version = p_jd_version;
  if v_job is null then raise exception 'unknown job %', p_job_key; end if;
  perform pg_advisory_xact_lock(hashtext('ranking:' || p_job_key));

  insert into public.ranking_snapshots (job_id, jd_version, rubric_version, scoring_version, snapshot_version, item_count)
  values (v_job, p_jd_version, p_rubric_version, p_scoring_version,
    coalesce((select max(snapshot_version) from public.ranking_snapshots
               where job_id = v_job and jd_version = p_jd_version and rubric_version = p_rubric_version
                 and scoring_version = p_scoring_version), 0) + 1,
    jsonb_array_length(p_items))
  returning id into v_snapshot;

  insert into public.ranking_snapshot_items (snapshot_id, job_id, assessment_id, candidate_id, rank_position, score, tie_break)
  select v_snapshot, v_job, (i->>'assessment_id')::uuid, (i->>'candidate_id')::uuid,
         (i->>'rank_position')::int, (i->>'score')::numeric, i->>'tie_break'
    from jsonb_array_elements(p_items) i;
  return v_snapshot;
end $$;

revoke all on function public.record_review(uuid, text, text, text) from public, anon;
grant execute on function public.record_review(uuid, text, text, text) to authenticated;
revoke all on function public.claim_processing_job(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.persist_assessment_bundle(jsonb) from public, anon, authenticated;
revoke all on function public.save_ranking_snapshot(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.claim_processing_job(uuid, text, integer) to service_role;
grant execute on function public.persist_assessment_bundle(jsonb) to service_role;
grant execute on function public.save_ranking_snapshot(text, text, text, text, jsonb) to service_role;
revoke all on function public.is_hr() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_hr() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------- read views (RLS applies: security_invoker)
create view public.v_candidate_overview with (security_invoker = true) as
select
  c.id as candidate_id, c.candidate_ref, c.review_status, c.created_at,
  r.id as resume_id, r.display_reference, r.original_filename, r.processing_status, r.last_error_code,
  s.source_kind, s.source_metadata->>'batch' as batch,
  pr.id as profile_id, pr.classification, pr.extraction_quality->>'status' as quality_status,
  (pr.extraction_quality->>'reviewRequired')::boolean as quality_review_required,
  (pr.normalized_profile#>>'{experienceSummary,lcaProfessionalMonths}')::int as lca_professional_months,
  (pr.normalized_profile#>>'{experienceSummary,uiuxMonths}')::int as uiux_months,
  lca.score as lca_score, lca.score_band as lca_band,
  ux.score as uiux_score, ux.score_band as uiux_band
from public.candidates c
join public.resume_documents r on r.candidate_id = c.id
join public.source_documents s on s.id = r.source_document_id
left join public.candidate_profiles pr on pr.resume_id = r.id and pr.is_current
left join lateral (
  select a.score, a.score_band from public.candidate_assessments a join public.jobs j on j.id = a.job_id
   where a.profile_id = pr.id and j.job_key = 'LCA_CONSULTANT' order by a.created_at desc limit 1) lca on true
left join lateral (
  select a.score, a.score_band from public.candidate_assessments a join public.jobs j on j.id = a.job_id
   where a.profile_id = pr.id and j.job_key = 'UIUX_INTERN' order by a.created_at desc limit 1) ux on true
where c.archived_at is null;

create view public.v_latest_rankings with (security_invoker = true) as
with latest as (
  select distinct on (job_id) id, job_id, snapshot_version, scoring_version, rubric_version, jd_version, created_at
    from public.ranking_snapshots order by job_id, created_at desc
)
select
  j.job_key, l.id as snapshot_id, l.snapshot_version, l.scoring_version, l.rubric_version, l.jd_version,
  l.created_at as snapshot_created_at,
  i.rank_position, i.score, i.tie_break, i.candidate_id, i.assessment_id,
  c.candidate_ref, c.review_status,
  a.score_band, a.review_flags, a.mandatory, a.primary_points,
  pr.classification, pr.extraction_quality->>'status' as quality_status,
  pr.normalized_profile->'experienceSummary' as experience_summary,
  pr.normalized_profile->>'summary' as summary
from latest l
join public.jobs j on j.id = l.job_id
join public.ranking_snapshot_items i on i.snapshot_id = l.id
join public.candidates c on c.id = i.candidate_id
join public.candidate_assessments a on a.id = i.assessment_id
join public.candidate_profiles pr on pr.id = a.profile_id;

grant select on public.v_candidate_overview, public.v_latest_rankings to authenticated;
