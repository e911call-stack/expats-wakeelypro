# Deployment Guide — Vercel + Supabase

This guide walks you through deploying Expats WakeelyPro to production.

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) account (free tier works)
- (Optional) A [Twilio](https://twilio.com) account for SMS

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Fill in:
   - **Name**: `expats-wakeelypro` (or any name)
   - **Database password**: generate a strong password and **save it somewhere safe**
   - **Region**: choose the closest to your users (e.g., `Frankfurt` for Europe, `Singapore` for Asia)
3. Wait 2–3 minutes for the project to provision

### Get your database connection strings

1. Go to **Project Settings** → **Database**
2. Find the **Connection string** section
3. Copy both:

   **Transaction pooler** (for `DATABASE_URL`):
   ```
   postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   Append `?pgbouncer=true&connection_limit=1` to the end.

   **Session pooler** (for `DIRECT_URL`):
   ```
   postgresql://postgres.<project>:<password>@aws-0-<region>.supabase.com:5432/postgres
   ```

### Get your Storage credentials

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL**: `https://<project>.supabase.co`
   - **service_role** key (the long one starting with `eyJ...`) — keep this secret!

### Create the Storage bucket

1. Go to **Storage** in the Supabase sidebar
2. Click **New bucket**
3. Name: `matter-documents`
4. **Public bucket**: OFF (keep it private — files are accessed via signed URLs)
5. Click **Create bucket**

---

## Step 2 — Push the code to GitHub

From your local machine (after cloning this repo or applying the patch):

```bash
git clone https://github.com/e911call-stack/expats-wakeelypro.git
cd expats-wakeelypro

# If you have the code locally but haven't pushed yet:
git add .
git commit -m "Initial commit — Phase 1 MVP"
git push origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your `e911call-stack/expats-wakeelypro` repo
3. Vercel will auto-detect Next.js — keep the default settings
4. **Before clicking Deploy**, expand **Environment Variables** and add these:

### Required environment variables

| Name | Value | Where to get it |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | Supabase → Settings → Database → Transaction pooler |
| `DIRECT_URL` | `postgresql://postgres.<project>:<password>@aws-0-<region>.supabase.com:5432/postgres` | Supabase → Settings → Database → Session pooler |
| `JWT_SECRET` | (random 32+ char string) | Run `openssl rand -hex 32` locally |
| `SUPABASE_URL` | `https://<project>.supabase.co` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` (long string) | Supabase → Settings → API → service_role key |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL (add after first deploy) |

### Optional environment variables (for SMS)

| Name | Value | Where to get it |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | `AC...` | Twilio console |
| `TWILIO_AUTH_TOKEN` | (auth token) | Twilio console |
| `TWILIO_PHONE_FROM` | `+1234567890` | Your Twilio phone number |

**If you skip Twilio**: OTP codes are logged to the Vercel function logs and returned in the API response. This is fine for testing but **not secure for production** — anyone can read the code from the response.

5. Click **Deploy**
6. Wait 2–3 minutes for the build to complete

---

## Step 4 — Set up the database

After your first deployment, you need to create the database tables and seed them.

### Option A — Via Vercel CLI (recommended)

```bash
npm i -g vercel
vercel login
vercel link  # link to your expats-wakeelypro project

# Pull env vars to .env.local
vercel env pull .env.local

# Push the schema to Supabase
bun run db:push

# Seed the database
bun run db:seed
```

### Option B — Via local with env vars

1. Copy your Vercel env vars to a local `.env` file
2. Run:
   ```bash
   bun run db:push
   bun run db:seed
   ```

### Verify the seed worked

Go to your Supabase dashboard → **Table Editor** → you should see:
- 7 rows in `LegalService`
- 7 rows in `LegalProcedure`
- 30 rows in `LegalDocumentRequirement`
- 7 rows in `OfficialSource`
- 8 rows in `PracticeArea`
- 5 rows in `Jurisdiction`

---

## Step 5 — Test the production site

1. Visit your Vercel URL (e.g., `https://expats-wakeelypro.vercel.app`)
2. Click **Sign in** → enter any phone number in E.164 format (e.g., `+962790000001`)
3. In dev mode (no Twilio), the code will be shown on the sign-in page
4. Verify the code → you should be logged in
5. Click **I need to handle something in Jordan** → complete the 3-step intake
6. Click **Create matter** → verify the matter dashboard loads

---

## Step 6 — Enable real SMS (production)

1. Create a Twilio account (free trial gives you $15 credit)
2. Buy a phone number (free with trial)
3. Get your Account SID, Auth Token, and phone number
4. Add them as Vercel env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_FROM`
5. Redeploy

Now OTP codes will be sent via SMS instead of being logged.

---

## Troubleshooting

### "Prisma cannot reach database"
- Verify `DATABASE_URL` ends with `?pgbouncer=true&connection_limit=1`
- Verify `DIRECT_URL` uses port `5432` (not `6543`)
- Check your Supabase project isn't paused (free tier pauses after 1 week of inactivity)

### "File upload fails"
- Verify the `matter-documents` bucket exists in Supabase Storage
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (not the anon key)

### "OTP codes don't arrive"
- If `TWILIO_ACCOUNT_SID` is not set, codes are logged to Vercel function logs (check the Logs tab)
- If Twilio is set, verify your phone number is valid E.164 format and your Twilio account has credit

### "Build fails with Prisma error"
- Make sure `postinstall` script ran: `prisma generate`
- On Vercel, this runs automatically. If it didn't, check the build logs.

---

## Post-deployment checklist

- [ ] Site loads at your Vercel URL
- [ ] Sign-in works (OTP received + verified)
- [ ] Homepage CTA works → intake wizard loads
- [ ] 3-step intake completes → recommendation shown
- [ ] Matter creation works → 11 tasks auto-cloned
- [ ] Document upload works (file appears in Supabase Storage)
- [ ] Messages work (real-time between client and lawyer)
- [ ] Payment records (simulated PAID status)
- [ ] Notifications bell shows unread count
- [ ] Mobile layout is responsive (test on phone)
- [ ] Language toggle works (AR ↔ EN)
- [ ] Twilio SMS works (if configured)
- [ ] Custom domain set up (optional — Vercel → Settings → Domains)

---

## Costs

- **Vercel**: Free for hobby tier (100 GB bandwidth, 100 GB-hours serverless)
- **Supabase**: Free for 500 MB database + 1 GB storage (sufficient for Phase 1)
- **Twilio**: ~$0.05 per SMS — budget $5–10/month for a small user base
- **Domain** (optional): ~$10/year

**Total monthly cost for a small launch: $0–10**
