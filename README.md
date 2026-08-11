<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Lindner International School — Academic Portal

A React + Vite school portal with a public marketing site and three portal roles
(parent, teacher, administrator) backed by Supabase (Postgres + Auth), plus an
optional Node export server that writes `.xlsx` registries and emails them to the
school office.

View your app in AI Studio: https://ai.studio/apps/67615602-d558-4280-824c-589c10c901fd

## Run locally

**Prerequisites:** Node.js 18+, a [Supabase](https://supabase.com) project (free tier is fine)

```bash
npm install
cp .env.example .env    # then edit .env — see "Configuration" below
npm run dev             # http://localhost:3000
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | `tsc --noEmit` — full strict typecheck |
| `npm run start-server` | Start the export server (`server.cjs`) |
| `npm run clean` | Remove `dist/` |

## Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings → API → copy the **Project URL** and **anon public key** into
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env` (and in AI Studio's
   Secrets panel before deploying — see "Configuration" below).
3. SQL Editor → run [`supabase/schema.sql`](supabase/schema.sql) (tables, Row Level
   Security policies, triggers), then optionally [`supabase/seed.sql`](supabase/seed.sql)
   for sample students/grades/events.

### Parent accounts — self-service

Parents create their own login from the **Parent Portal → Create Account** tab
(email + a password they choose). The `handle_new_user` trigger (`supabase/schema.sql`)
automatically links the new account to a student if the signup email matches that
student's `parent_email` on file — no admin step needed. That match is only
trustworthy if Supabase's **email confirmation** is enabled (Authentication →
Settings), since it proves the parent actually owns that inbox rather than just
knowing a public fact about the child. If a parent signs up with an email that
doesn't match any student's `parent_email`, their account is created but stays
unlinked — the UI tells them to contact the office; an admin can then link it via
the "Link Parent Account" control on that student's detail panel in the Admin Panel.

### Creating a new staff account

There's no self-service or in-app invite flow for staff — every admin/teacher
login is created by hand:

1. Supabase Dashboard → Authentication → Users → **Add user** (email + password).
2. New users default to the `parent` role via a trigger, so promote them in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin'   where id = (select id from auth.users where email = 'someone@example.com');
   -- or role = 'teacher'
   ```
3. **Teacher → student assignments:** insert rows directly for now —
   ```sql
   insert into public.teacher_students (teacher_user_id, student_id)
   values ((select id from auth.users where email = 'teacher@example.com'),
           (select id from public.students where student_code = 'LIS-2026-001'));
   ```

## Configuration

All variables are documented in [.env.example](.env.example). The ones that matter most:

- **`VITE_SUPABASE_URL`** / **`VITE_SUPABASE_ANON_KEY`** — required. The anon key is
  meant to ship in the client bundle; Row Level Security (`supabase/schema.sql`) is
  what actually protects data, not this key's secrecy. `VITE_*` vars are baked into
  the bundle at **build time**, so set them in AI Studio's Secrets panel before
  deploying, not just locally.
- **`EXPORT_API_TOKEN`** — required by the optional export server. Without it every
  `/export/*` request is rejected, because those endpoints write files and email
  student PII.

## Security model — read before deploying

Auth and data are real now: Supabase Auth (email + password) issues sessions, and
every student/teacher/event record lives in a shared Postgres database rather than
each visitor's own browser. Row Level Security policies (`supabase/schema.sql`)
enforce — at the database level, not just in the UI — that a parent only ever sees
their own child, a teacher only their assigned roster, and only admins can write.

**Known limitations, on purpose (see the migration plan for what's deferred):**

- Parents can self-service sign up (see above); staff (admin/teacher) accounts
  still require an admin to create them by hand in the Supabase Dashboard, and
  there's no in-app "invite a teacher" flow yet — building that would need a
  server-side action holding the Supabase `service_role` key, which must never
  reach the browser.
- No teacher-management UI (add/edit/delete teachers) — teachers are set up the
  same manual way as admins.
- The "Backroom" panel in the Admin console is a password re-confirmation step
  (step-up auth) around what is still mostly a decorative/mock control room.

The "Prototype" badge/banner that used to mark the Parent Portal and Admin Panel
during the localStorage-to-Supabase migration has been removed now that the
real Supabase-backed flow has been verified end-to-end in production.

### Known dependency issue

`xlsx@0.18.5` carries two unfixed high-severity advisories on the npm registry
(prototype pollution and ReDoS). Both are triggered by *parsing* untrusted
workbooks; this project only *writes* them, so exposure is limited. The maintained
build is published outside npm — see <https://cdn.sheetjs.com/> — if you want the fix.

## Project layout

```
supabase/
  schema.sql           Tables, Row Level Security policies, triggers, RPCs
  seed.sql             Sample students/grades/events
src/
  App.tsx              Auth-state tracking, data fetching, top-level handlers
  types.ts             Shared domain types
  lib/
    supabaseClient.ts  Supabase client instance
    api.ts             Data-access layer — maps DB rows <-> app types
    auth.ts            Sign-in/out, session -> PortalUser resolution
    grading.ts         Score clamping, score -> letter mapping, averages
  components/
    HeaderNav.tsx      Global navigation and session strip
    HomeSection.tsx    Landing page
    CalendarSection.tsx  Campus events calendar
    ParentPortal.tsx   Parent-facing report card (email + password login)
    AdminPortal.tsx    Registrar console and teacher dashboard (email + password login)
    TeacherMessages.tsx  Teacher<->parent messaging (built, not currently routed)
  data/mockData.ts     Public-site marketing content only (no portal data)
server.cjs             Optional .xlsx export + email service
```
# Trigger AI Studio sync 2026-08-11T06:10:58.0402224+01:00
