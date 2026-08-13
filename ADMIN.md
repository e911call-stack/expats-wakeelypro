# Super Admin Dashboard — ADMIN.md

Super Admin area for Expats WakeelyPro. Accessible only to users with `role = 'ADMIN'`.

## Promote a user to ADMIN

Run in the Supabase SQL Editor (or `psql`). The user must have signed in at least once
so their `User` row exists.

```sql
UPDATE "User"
SET role = 'ADMIN', "updatedAt" = NOW()
WHERE phone = '+E164_PHONE';

SELECT id, phone, name, role FROM "User" WHERE role = 'ADMIN';
```

> **Important:** the user must sign out and sign back in afterwards so their JWT
> cookie (`ewp.session`) is re-issued with the new role.

A ready-to-edit version is also in [`PROMOTE_ADMIN.sql`](./PROMOTE_ADMIN.sql).

## Routes map

| Path                 | Purpose                                    | Phase |
| -------------------- | ------------------------------------------ | ----- |
| `/admin`             | Dashboard (live counts)                    | A     |
| `/admin/services`    | Services list + filters + add              | B     |
| `/admin/services/new`| Create service form                        | B     |
| `/admin/services/[id]` | Edit service (details + procedures + docs + sources tabs) | B |
| `/admin/matters`     | Matter list + assign lawyer + status (server-side filters: search / status / assignment / needs-assignment, paginated) | C |
| `/admin/matters/[id]` | Read-only admin view (docs / tasks / timeline / messages / payments) | C |
| `/admin/lawyers`     | Lawyer verify / availability / edit        | C     |
| `/admin/users`       | User search + role changes                 | C     |
| `/admin/payments`    | Payment list + status updates              | C     |
| `/admin/sources`     | OfficialSource CRUD                        | C (full CRUD) |
| `/admin/settings`    | Env checks + operational notes             | A     |

## API map

| Endpoint             | Method(s)           | Status  |
| -------------------- | ------------------- | ------- |
| `/api/admin/seed`    | GET, POST           | ADMIN-only |
| `/api/admin/services` | GET, POST          | ADMIN-only (Phase B) |
| `/api/admin/services/[id]` | GET, PATCH, DELETE | ADMIN-only (Phase B, soft delete) |
| `/api/admin/services/[id]/procedures` | GET, POST | ADMIN-only |
| `/api/admin/services/[id]/procedures/[procId]` | PATCH, DELETE | ADMIN-only |
| `/api/admin/services/[id]/documents` | GET, POST | ADMIN-only |
| `/api/admin/services/[id]/documents/[docId]` | PATCH, DELETE | ADMIN-only |
| `/api/admin/services/[id]/sources` | GET, POST | ADMIN-only (link official sources) |
| `/api/admin/services/[id]/sources/[linkId]` | PATCH, DELETE | ADMIN-only |
| `/api/admin/practice-areas` | GET | ADMIN-only |
| `/api/admin/sources` | GET, POST | ADMIN-only (Phase C full CRUD) |
| `/api/admin/sources/[id]` | GET, PATCH, DELETE | ADMIN-only (DELETE = soft-deactivate) |
| `/api/admin/lawyers` | GET | Phase C list with search + verified filter |
| `/api/admin/lawyers/[id]` | PATCH | Phase C (verify / availability / remote / fields) |
| `/api/admin/users`   | GET | Phase C list with search + role filter |
| `/api/admin/users/[id]` | PATCH | Phase C (role / verification) |
| `/api/admin/payments`| GET | Phase C list with status / kind / search filters |
| `/api/admin/payments/[id]` | PATCH | Phase C (status / description) |
| `/api/admin/matters` | GET | Phase C list with search / status / assigned / needsAssignment filters |

Every `/api/admin/*` route returns `401` (unauthenticated) / `403` (not ADMIN) as JSON.

## Security notes

- All `/admin/*` pages are protected server-side by `src/lib/require-admin.ts` (`requireAdmin()`).
- API routes use `requireRole("ADMIN")` and return JSON — `401` when unauthenticated, `403` when authenticated but not ADMIN — never `redirect()`.
- Client-side role checks remain as a second layer only.
- No raw secrets are shown in the UI; `/admin/settings` shows masked env values.
