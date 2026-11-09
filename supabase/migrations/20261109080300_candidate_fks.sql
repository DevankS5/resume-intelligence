-- Direct candidate foreign keys alongside the composite ones. They add no new rule the
-- composite keys did not already imply, but let PostgREST embed candidates in queries.
alter table public.candidate_profiles
  add constraint candidate_profiles_candidate_fk foreign key (candidate_id) references public.candidates(id) on delete restrict;
alter table public.candidate_assessments
  add constraint candidate_assessments_candidate_fk foreign key (candidate_id) references public.candidates(id) on delete restrict;
alter table public.candidate_assessments
  add constraint candidate_assessments_resume_fk foreign key (resume_id) references public.resume_documents(id) on delete restrict;
create index on public.candidate_assessments (resume_id);
