# Expats WakeelyPro — Jordan Remote Legal Services

A standalone Next.js application that lets Jordanian expats and foreigners get
legal matters done in Jordan remotely. Bilingual (Arabic/English), mobile-first,
and production-ready for Vercel + Supabase.

## ⚠️ Safety rules (enforced in code)

- **AI never invents services** — the matcher only returns services from the catalog
- **Never claims fully-remote** — all 7 services are honestly marked `partially_remote`
- **Never fakes e-signatures or e-notary** — zero claims in code
- **Government fees always separated** — `governmentFeeIncluded` defaults to `false`
- **Lawyer notes are private** — stripped from API responses when the client requests

## What's included

- **7 bilingual legal services** with procedures + document checklists + official sources
- **Guided 3-step intake** (Where are you? → Status → What do you need?)
- **Phone OTP authentication** (Twilio or dev mode)
- **Matter workflow** with 13 status stops, tasks, timeline, documents, messages, payments
- **Lawyer workspace** with document review, fee setting, private notes
- **Admin assign-lawyer UI** with auto-ranking
- **Notifications system** with bell + unread badge
- **Mobile-responsive** (iPhone SE → desktop)

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Auth**: Phone OTP + JWT cookies (jose)
- **Storage**: Supabase Storage (for document uploads)
- **SMS**: Twilio (optional — dev mode logs to console)
- **UI**: Tailwind CSS + shadcn/ui + Lucide icons
- **Deployment**: Vercel

## Quick start (local development)

### Prerequisites

- Node.js 18+ or Bun
- A Supabase project (free tier works)
- (Optional) A Twilio account for SMS

### 1. Install dependencies

```bash
bun install
# or: npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your real Supabase + JWT values
```

### 3. Set up the database

```bash
bun run db:push     # Creates all tables in your Supabase project
bun run db:seed     # Seeds 7 services + official sources + demo users
```

### 4. Run the dev server

```bash
bun run dev
# Open http://localhost:3000
```

### 5. Sign in

In dev mode (no Twilio configured), OTP codes are logged to your terminal and
returned in the API response. Use any phone number in E.164 format (e.g.,
`+962790000001`) — the code will be displayed on the sign-in page.

## Database schema

All schema is in `prisma/schema.prisma`. Key models:

- `User`, `LawyerProfile`, `LawyerPracticeArea`, `PracticeArea`, `Jurisdiction`
- `LegalService`, `LegalProcedure`, `LegalDocumentRequirement`, `OfficialSource`
- `LegalMatter`, `MatterDocument`, `MatterTask`, `MatterTimelineEvent`
- `LegalIntake`, `Conversation`, `Message`, `Notification`, `Payment`, `OtpChallenge`

## Project structure

```
src/
├── app/
│   ├── api/                    # 19 API routes
│   │   ├── auth/otp/{request,verify}/
│   │   ├── auth/{me,logout}/
│   │   ├── legal/services/
│   │   ├── legal/intake/
│   │   ├── legal/matters/[id]/{status,assign,fees,timeline,documents,tasks,messages,payments}/
│   │   ├── lawyer/matters/
│   │   ├── lawyers/
│   │   └── notifications/
│   ├── auth/signin/            # Phone OTP sign-in page
│   ├── intake/                 # 3-step guided intake wizard
│   ├── services/               # Service catalog + detail
│   ├── matters/                # Client matter list + dashboard
│   ├── lawyer/                 # Lawyer dashboard + workspace
│   ├── admin/matters/          # Admin assign-lawyer UI
│   ├── notifications/          # Notifications page
│   ├── page.tsx                # Homepage with CTA
│   ├── layout.tsx              # Root layout (header + footer + providers)
│   └── globals.css
├── components/
│   ├── ui/                     # 48 shadcn/ui components
│   └── site-header.tsx         # Bilingual header with mobile menu
├── lib/
│   ├── db.ts                   # Prisma client
│   ├── auth.ts                 # JWT session management
│   ├── session-server.ts       # Server-side session helpers
│   ├── session-provider.tsx    # Client-side session context
│   ├── locale-provider.tsx     # Bilingual AR/EN context
│   ├── api-error.ts            # Unified error handling
│   ├── rate-limit.ts           # In-memory rate limiter
│   ├── audit.ts                # Audit log helper
│   ├── storage.ts              # Supabase Storage helpers
│   ├── otp.ts                  # Phone OTP generation + verification
│   ├── utils.ts                # Date/JOD formatters
│   └── legal/
│       ├── service-matcher.ts  # Strict catalog matcher (never invents)
│       └── matter-tasks.ts     # Task template cloning + progress recompute
└── hooks/
    └── use-mobile.ts, use-toast.ts
```

## Deployment

See `DEPLOYMENT.md` for step-by-step Vercel + Supabase setup instructions.

## Safety disclaimers

The footer of every page displays:

> **For demonstration only — no real legal advice is provided. AI is for
> navigation only. All legal work is performed by licensed Jordanian lawyers
> and official Jordanian authorities. This platform does not provide electronic
> signatures or e-notary services. Government fees are always paid directly to
> the relevant authority.**

(In both English and Arabic.)

## License

Private — all rights reserved.
