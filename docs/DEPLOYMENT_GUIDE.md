# Deployment Guide

## 1. Supabase

Project: `resume-intelligence` (ref `pxsifchfglooqwubavpk`, region ap-south-1). A fresh project is set up by applying the migrations in order:

```bash
supabase link --project-ref <ref>
supabase db push
```

This creates the schema, RLS policies, private `resumes` bucket, write functions, read views and the V1 rubric seed. Then check **Advisors → Security**: the only expected findings are the three intentionally HR-callable security-definer functions (`is_hr`, `is_admin`, `record_review`), each of which checks the caller's role itself.

## 2. Environment

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | never prefix with `NEXT_PUBLIC_` |
| `GEMINI_API_KEY` | server only | use a billing-enabled Google Cloud project (ADR-009) |
| `GEMINI_MODEL` | server | default `gemini-2.5-flash` |
| `ASSESSMENT_REFERENCE_MONTH` | server | fixed "Present" month for reproducible durations |

Locally these live in `.env.local` (gitignored). On Vercel set them under Project → Settings → Environment Variables.

## 3. Initial data

```bash
npm run inspect:dataset -- "Software Development Assignment Resumes" --out docs/IMPORT_MANIFEST.md
npm run import:batch -- "Software Development Assignment Resumes" --concurrency 2
npm run report:quality
```

The import is idempotent: re-running it skips stored files and finished jobs and retries rate-limited ones.

## 4. Accounts

```bash
npm run admin:create-user -- reviewer@example.com HR_REVIEWER
```

The password prints once. Share it out of band. In Supabase Auth settings, disable public sign-ups so accounts exist only through this script.

## 5. Vercel

Import the GitHub repository, framework preset Next.js, set the environment variables above, deploy. Then in Supabase Auth → URL configuration add the Vercel domain as Site URL. Verify from a clean browser session: sign-in required, rankings load, original download works, upload processes.

## 6. Deleting candidate data

Until an automated retention job exists, an admin deletes a candidate by removing, in one transaction, its ranking items, criterion assessments, assessments, profiles, extractions, parsed documents, jobs, review events, resume and candidate rows, then the source row and its storage object; then rebuild rankings. Record a minimal `DATA_DELETED` audit event without resume content.
