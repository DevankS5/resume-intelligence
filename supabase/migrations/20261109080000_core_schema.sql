-- Resume Intelligence: core schema (LLD §16).
-- Integrity lives in the database, not only in TypeScript: composite foreign keys make it
-- impossible to attach a profile, assessment, criterion or ranking row to the wrong
-- candidate, resume or job (LLD §16.4).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- access roles
create table public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'HR_REVIEWER')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- jobs & rubrics
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null check (job_key in ('LCA_CONSULTANT', 'UIUX_INTERN')),
  title text not null,
  jd_version text not null,
  description text not null,
  location_label text,
  work_mode text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (job_key, jd_version),
  unique (id, job_key)
);

create table public.job_criteria (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  rubric_version text not null,
  criterion_key text not null,
  label text not null,
  description text not null,
  weight numeric(6,2) not null check (weight >= 0),
  mandatory_verification boolean not null default false,
  evidence_guidance jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  unique (job_id, rubric_version, criterion_key),
  unique (id, job_id)
);

-- ---------------------------------------------------------------- sources & identity
create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('COMPOSITE_DOCX', 'INDIVIDUAL_DOCX', 'INDIVIDUAL_PDF')),
  original_filename text,
  storage_bucket text not null,
  storage_path text not null unique,
  sha256 char(64) not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size bigint not null check (byte_size >= 0 and byte_size <= 5242880),
  detected_mime_type text,
  upload_status text not null default 'PENDING_UPLOAD' check (upload_status in ('PENDING_UPLOAD', 'STORED', 'REJECTED')),
  source_metadata jsonb not null default '{}'::jsonb,
  imported_by uuid,
  created_at timestamptz not null default now()
);

create sequence public.candidate_ref_seq;

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_ref text not null unique default ('CAND-' || lpad(nextval('public.candidate_ref_seq')::text, 4, '0')),
  review_status text not null default 'UNREVIEWED'
    check (review_status in ('UNREVIEWED', 'NEEDS_REVIEW', 'IN_REVIEW', 'VERIFIED', 'SHORTLISTED', 'NOT_SHORTLISTED')),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  source_document_id uuid not null references public.source_documents(id) on delete restrict,
  -- Non-null key so individual uploads (no segment index) are still unique (LLD §16.4).
  source_record_key text not null unique,
  source_segment_index integer,
  original_filename text,
  display_reference text not null,
  segmentation_status text not null default 'CONFIRMED' check (segmentation_status in ('CONFIRMED', 'REVIEW_REQUIRED', 'REJECTED')),
  processing_status text not null default 'RECEIVED',
  last_error_code text,
  created_at timestamptz not null default now(),
  unique (id, candidate_id)
);

-- Raw and normalized text are separate immutable layers (Workflow standard §13.1).
create table public.parsed_documents (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resume_documents(id) on delete restrict,
  parser_name text not null,
  parser_version text not null,
  raw_text text not null,
  normalized_text text not null,
  blocks jsonb not null,
  page_count integer,
  warnings jsonb not null default '[]'::jsonb,
  unsupported_structures jsonb not null default '[]'::jsonb,
  content_fingerprint char(64) not null,
  created_at timestamptz not null default now(),
  unique (resume_id, parser_version)
);

-- ---------------------------------------------------------------- processing
create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resume_documents(id) on delete restrict,
  job_type text not null default 'PROCESS_RESUME',
  idempotency_key char(64) not null unique,
  correlation_id uuid not null default gen_random_uuid(),
  status text not null default 'QUEUED' check (status in (
    'RECEIVED','VALIDATING','STORED','PARSING','SEGMENTING','QUEUED','EXTRACTING','VALIDATING_OUTPUT',
    'NORMALIZING','SCORING','COMPLETED','REVIEW_REQUIRED','RETRY_WAIT','FAILED','CANCELLED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  lease_owner text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  last_error_code text,
  last_error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resume_documents(id) on delete restrict,
  parsed_document_id uuid not null references public.parsed_documents(id) on delete restrict,
  extraction_version integer not null check (extraction_version > 0),
  model_provider text not null,
  model_name text not null,
  prompt_version text not null,
  schema_version text not null,
  raw_model_output jsonb,
  validation_status text not null check (validation_status in ('VALID', 'INVALID_SCHEMA')),
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (resume_id, extraction_version)
);

create table public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  resume_id uuid not null,
  extraction_id uuid not null references public.document_extractions(id) on delete restrict,
  profile_version integer not null check (profile_version > 0),
  normalization_version text not null,
  normalized_profile jsonb not null,
  extraction_quality jsonb not null,
  classification text not null check (classification in ('LCA_STRONGER','UIUX_STRONGER','BOTH','NEITHER_EVIDENCED','UNCERTAIN')),
  classification_version text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (resume_id, profile_version),
  unique (id, candidate_id, resume_id),
  foreign key (resume_id, candidate_id) references public.resume_documents(id, candidate_id) on delete restrict
);
create unique index candidate_profiles_one_current on public.candidate_profiles (resume_id) where is_current;

-- ---------------------------------------------------------------- assessments
create table public.candidate_assessments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  resume_id uuid not null,
  profile_id uuid not null,
  job_id uuid not null references public.jobs(id) on delete restrict,
  jd_version text not null,
  rubric_version text not null,
  scoring_version text not null,
  score numeric(6,2) not null check (score >= 0 and score <= 100),
  score_band text not null check (score_band in ('STRONG','POTENTIAL','LIMITED','WEAK','UNASSESSABLE')),
  primary_points numeric(7,3) not null default 0,
  review_flags jsonb not null default '[]'::jsonb,
  mandatory jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  -- An exact retry resolves to the same row; a new version creates a new row (LLD §16.4).
  unique (profile_id, job_id, jd_version, rubric_version, scoring_version),
  unique (id, job_id),
  unique (id, candidate_id, job_id),
  foreign key (profile_id, candidate_id, resume_id)
    references public.candidate_profiles(id, candidate_id, resume_id) on delete restrict
);

create table public.criterion_assessments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null,
  job_id uuid not null,
  criterion_id uuid not null,
  evidence_state text not null check (evidence_state in ('DIRECT','RELATED','NOT_EVIDENCED','UNCERTAIN')),
  multiplier numeric(4,3) not null check (multiplier >= 0 and multiplier <= 1),
  criterion_weight numeric(6,2) not null check (criterion_weight >= 0),
  points_awarded numeric(7,3) not null check (points_awarded >= 0 and points_awarded = criterion_weight * multiplier),
  evidence jsonb not null default '[]'::jsonb,
  explanation text not null,
  review_required boolean not null default false,
  unique (assessment_id, criterion_id),
  foreign key (assessment_id, job_id) references public.candidate_assessments(id, job_id) on delete restrict,
  foreign key (criterion_id, job_id) references public.job_criteria(id, job_id) on delete restrict
);

create table public.ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  jd_version text not null,
  rubric_version text not null,
  scoring_version text not null,
  snapshot_version integer not null check (snapshot_version > 0),
  item_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (job_id, jd_version, rubric_version, scoring_version, snapshot_version),
  unique (id, job_id)
);

create table public.ranking_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null,
  job_id uuid not null,
  assessment_id uuid not null,
  candidate_id uuid not null,
  rank_position integer not null check (rank_position > 0),
  score numeric(6,2) not null,
  tie_break text,
  unique (snapshot_id, candidate_id),
  unique (snapshot_id, rank_position),
  foreign key (snapshot_id, job_id) references public.ranking_snapshots(id, job_id) on delete restrict,
  foreign key (assessment_id, candidate_id, job_id)
    references public.candidate_assessments(id, candidate_id, job_id) on delete restrict
);

-- ---------------------------------------------------------------- review & audit (append-only)
create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('STATUS_CHANGE', 'NOTE')),
  previous_value jsonb,
  new_value jsonb,
  notes text check (char_length(notes) <= 4000),
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  event_type text not null,
  resource_type text not null,
  resource_id uuid,
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- indexes (LLD §16.3)
create index on public.resume_documents (candidate_id);
create index on public.resume_documents (source_document_id);
create index on public.parsed_documents (resume_id);
create index on public.processing_jobs (status, next_attempt_at, created_at);
create index on public.processing_jobs (resume_id);
create index on public.document_extractions (parsed_document_id);
create index on public.candidate_profiles (candidate_id, is_current);
create index on public.candidate_profiles (extraction_id);
create index on public.candidate_assessments (job_id, scoring_version, score desc);
create index on public.candidate_assessments (candidate_id);
create index on public.candidate_assessments (profile_id, candidate_id, resume_id);
create index on public.criterion_assessments (assessment_id, job_id);
create index on public.criterion_assessments (criterion_id, job_id);
create index on public.job_criteria (job_id);
create index on public.ranking_snapshots (job_id, created_at desc);
create index on public.ranking_snapshot_items (snapshot_id, rank_position);
create index on public.ranking_snapshot_items (snapshot_id, job_id);
create index on public.ranking_snapshot_items (assessment_id, candidate_id, job_id);
create index on public.review_events (candidate_id, created_at desc);
create index on public.review_events (actor_id);
create index on public.app_users (role);
