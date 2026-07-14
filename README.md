# PitchFrame — Complete Setup & Deployment Guide

> This guide is written for a business owner with limited coding experience.
> Every step includes plain-English explanations.

---

## What Is PitchFrame?

PitchFrame is a web application that lets baseball pitchers:

1. Create an account and fill out an athlete profile
2. Follow a guided camera-setup wizard and upload pitching videos
3. Pay for a remote mechanics analysis ($49)
4. Track their order status
5. View a completed report with a mechanics scorecard, personalized drills, and a four-week plan

Admins review submitted orders, enter report data, and mark orders complete — all from a protected dashboard.

---

## Folder Structure

```
pitchframe/
├── public/                  # Static files (robots.txt, images)
├── src/
│   ├── app/                 # All pages (Next.js App Router)
│   │   ├── (public pages)   # /, /pricing, /faq, /how-it-works, etc.
│   │   ├── auth/            # Auth callback handler
│   │   ├── api/             # Server-side API routes
│   │   │   ├── checkout/    # Creates Stripe Checkout session
│   │   │   ├── webhooks/stripe/  # Confirms payment server-side
│   │   │   ├── contact/     # Contact form handler
│   │   │   └── admin/email/ # Admin-triggered emails
│   │   ├── dashboard/       # Athlete dashboard (protected)
│   │   └── admin/           # Admin dashboard (protected, admin-only)
│   ├── components/          # Reusable UI components
│   │   ├── layout/          # Navbar, Footer
│   │   ├── forms/           # Multi-step intake form steps
│   │   └── ui/              # Badge, ProgressBar, StatusTimeline, etc.
│   ├── lib/                 # Core utilities
│   │   ├── supabase/        # Supabase client (browser + server)
│   │   ├── stripe.ts        # Stripe helpers
│   │   ├── resend.ts        # Email helpers
│   │   └── utils.ts         # Shared constants and formatters
│   └── types/               # TypeScript type definitions
├── supabase/migrations/     # Database migration SQL files
├── .env.example             # Environment variable template
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Step 1 — Prerequisites

Before you begin, you need accounts at these services (all have free tiers to start):

| Service | Purpose | URL |
|---------|---------|-----|
| Vercel | Hosting the website | vercel.com |
| Supabase | Database, auth, file storage | supabase.com |
| Stripe | Payments | stripe.com |
| Resend | Transactional emails | resend.com |
| GitHub | Code repository | github.com |

You also need **Node.js 20+** installed on your computer.
Download it at: https://nodejs.org

---

## Step 2 — Clone and Install

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/pitchframe.git
cd pitchframe

# Install dependencies
npm install
```

---

## Step 3 — Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

Open `.env.local` in a text editor and fill in every value. See the sections below for where to find each key.

### Supabase Keys

1. Go to https://supabase.com and create a new project
2. Open **Project Settings → API**
3. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **NEVER share the `service_role` key.** It bypasses all security rules.

### Stripe Keys

1. Go to https://dashboard.stripe.com
2. Enable **Test Mode** (toggle in the top-right during development)
3. Open **Developers → API keys**
4. Copy:
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`
5. Create a Product:
   - Go to **Products → Add product**
   - Name: "Complete Pitching Analysis"
   - Price: $49.00 one-time
   - Copy the **Product ID** → `STRIPE_PRODUCT_ID`
   - Copy the **Price ID** → `STRIPE_PRICE_ID`
6. Create a webhook (covered in Step 7)

### Resend Keys

1. Go to https://resend.com and create an account
2. Open **API Keys → Create API Key**
3. Copy it → `RESEND_API_KEY`
4. Verify your sending domain under **Domains**
5. Set `RESEND_FROM_EMAIL` to `noreply@yourdomain.com`

### Other Variables

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000        # Change to https://yourdomain.com in production
NEXT_PUBLIC_APP_NAME=PitchFrame
ADMIN_EMAILS=youremail@example.com               # Comma-separated admin emails
CONTACT_DESTINATION_EMAIL=youremail@example.com  # Where contact form submissions go
```

---

## Step 4 — Set Up the Database

### Run migrations

The database schema lives in `supabase/migrations/`. Run them in order:

#### Option A — Supabase Dashboard (easiest)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Open and run each file in this order:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_storage_policies.sql`
   - `004_demo_data.sql`

#### Option B — Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

### Storage buckets

The migrations create three private storage buckets automatically:
- `pitch-videos` — athlete-submitted pitching videos
- `analysis-assets` — admin-uploaded screenshots, voice-over videos, PDFs
- `radar-screenshots` — optional radar images

If you need to create them manually:
1. Go to **Storage** in your Supabase dashboard
2. Create each bucket
3. Set all three to **Private** (not public)

---

## Step 5 — Set Up an Admin Account

After the database is set up:

1. Go to `http://localhost:3000/signup` and create an account using an email listed in `ADMIN_EMAILS`
2. Open your Supabase dashboard → **Table Editor → profiles**
3. Find your row and set `is_admin = true`

You now have admin access to `/admin`.

Alternatively, run this SQL in the Supabase SQL Editor:

```sql
UPDATE profiles
SET is_admin = true
WHERE email = 'youremail@example.com';
```

---

## Step 6 — Local Development

```bash
npm run dev
```

Open http://localhost:3000

The site will hot-reload as you make changes.

---

## Step 7 — Stripe Webhook (Required for Payments)

Stripe needs to send a secret "payment confirmed" signal to your server. This is how you ensure no one fakes a payment.

### For local development:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret it shows you → `STRIPE_WEBHOOK_SECRET` in `.env.local`

### For production (Vercel):

1. Go to **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. URL: `https://yourdomain.com/api/webhooks/stripe`
3. Events to listen for:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the **Signing secret** → add to Vercel environment variables

---

## Step 8 — Deploy to Vercel

### First deployment:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Follow the prompts. Vercel will detect Next.js automatically.

### Set environment variables on Vercel:

1. Go to your project on vercel.com
2. Open **Settings → Environment Variables**
3. Add every variable from your `.env.local`
4. Make sure `NEXT_PUBLIC_APP_URL` is set to your production URL

### Redeploy after adding variables:

```bash
vercel --prod
```

---

## Step 9 — Connect a Custom Domain

1. In Vercel: **Settings → Domains → Add**
2. Enter your domain (e.g., `pitchframe.com`)
3. Follow the DNS instructions Vercel provides
4. Update `NEXT_PUBLIC_APP_URL` to `https://pitchframe.com`
5. Update `NEXT_PUBLIC_SUPABASE_URL` redirect settings in Supabase:
   - **Authentication → URL Configuration**
   - Set **Site URL** to `https://pitchframe.com`
   - Add `https://pitchframe.com/**` to **Redirect URLs**

---

## Testing Checklist

Run through this checklist before launching.

### Account creation and auth
- [ ] Sign up with a new email
- [ ] Receive verification email and click link
- [ ] Sign in successfully
- [ ] Reset password via "Forgot password"
- [ ] Sign out

### Intake form
- [ ] Complete all 5 steps
- [ ] Age validation (under-13 blocked, under-18 shows guardian fields)
- [ ] Health screening warning appears when current pain = yes
- [ ] Form data saves correctly to Supabase

### Video upload
- [ ] Upload an open-side video
- [ ] Upload a rear-view video
- [ ] Video previews appear
- [ ] File size and format shown correctly
- [ ] Cannot proceed to checkout with only one video

### Stripe payment (use test cards)
- [ ] Checkout page loads correctly
- [ ] Agreement checkbox required
- [ ] Test card `4242 4242 4242 4242` (any future date, any CVC) completes payment
- [ ] Webhook fires and order status changes to "submitted"
- [ ] Confirmation email received
- [ ] Success page shows confirmation (not duplicate on refresh)
- [ ] Failed card `4000 0000 0000 0002` shows correct error

### Athlete dashboard
- [ ] Order appears in dashboard
- [ ] Status timeline is correct
- [ ] Videos are accessible via signed URLs

### Admin workflow
- [ ] Log in as admin, visit `/admin`
- [ ] Order appears in `/admin/orders`
- [ ] Change status to "In Analysis"
- [ ] Approve videos
- [ ] Enter scorecard data
- [ ] Assign drills
- [ ] Save report narrative
- [ ] Change status to "Complete"
- [ ] Athlete can view completed report at `/dashboard/reports/[id]`

### Data deletion
- [ ] Athlete can submit a deletion request from profile settings
- [ ] Request appears in `/admin/athletes`
- [ ] Admin can mark request as processed

---

## Pre-Launch Security Checklist

- [ ] All environment variables are in Vercel (not hardcoded anywhere)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is only used in server-side API routes
- [ ] Stripe webhook signature is verified (`constructWebhookEvent`)
- [ ] All dashboard routes redirect unauthenticated users to `/login`
- [ ] `/admin` routes check `is_admin = true` in the `profiles` table
- [ ] RLS is enabled on all Supabase tables
- [ ] Storage buckets are set to **Private**
- [ ] Contact form honeypot is in place
- [ ] No real API keys appear in the git repository
- [ ] `.env.local` is in `.gitignore`
- [ ] Signed URLs expire after 1 hour (not indefinitely accessible)

---

## Legal Sections Requiring Attorney Review

The following pages contain `[PLACEHOLDER]` markers where legal review is required before launch. **Do not launch with placeholder text.**

**Privacy Policy** (`/privacy`):
- Data retention periods
- Third-party service providers list
- COPPA compliance language (athletes under 13)
- CCPA/state privacy rights (if applicable)
- Cookie policy

**Terms of Service** (`/terms`):
- Limitation of liability language
- Governing law / jurisdiction
- Dispute resolution / arbitration clause
- Refund policy specifics

**Disclaimer** (`/disclaimer`):
- Velocity claim limitations
- Medical disclaimer scope
- State-specific disclaimers (if needed)

**Parent/Guardian Consent** (intake form Step 1):
- COPPA-compliant consent language for under-18 athletes
- Video use consent for educational purposes

**Recommended:** Have a sports-business or internet-law attorney review all four pages before accepting paying customers.

---

## Placeholder Content to Replace Before Launch

| Location | Placeholder | Action Required |
|----------|-------------|-----------------|
| `/` — Testimonials section | Fictional athlete quotes clearly marked | Replace with real testimonials (with permission) or remove |
| `/sample-report` | Fictional athlete "Marcus T." | This is intentional demo data — keep or expand |
| `src/lib/resend.ts` — email templates | Generic branded HTML | Customize with your logo, colors, contact links |
| All legal pages | `[PLACEHOLDER — Attorney Review Required]` blocks | Legal review and rewrite |
| `public/` | No OG social image present | Create a 1200×630 PNG and add to `src/app/layout.tsx` |
| Navbar | PitchFrame logo text | Replace with actual SVG or image logo |
| Footer | Social links use `#` as href | Add real social profile URLs or remove |
| Contact page | `support@pitchframe.com` placeholder | Replace with real support email |
| Contact page | Business hours placeholder | Add real business hours |
| Admin Settings | Default delivery estimate text | Customize before first order |

---

## Admin Quick-Reference

### Adding a new drill to the library

1. Sign in as admin
2. Go to `/admin/drills`
3. Click **New Drill** and fill in the form
4. Set **Active** = true

### Changing the package price

1. Go to your Stripe Dashboard → Products
2. Create a new price on the existing product (do not edit the existing price)
3. Update `STRIPE_PRICE_ID` in Vercel environment variables
4. Redeploy: `vercel --prod`

### Configuring delivery estimate wording

1. Sign in as admin
2. Go to `/admin/settings`
3. Edit **Delivery Estimate Wording** (e.g., "Estimated delivery: 5–7 business days")
4. Click **Save All**

### Pausing new orders

1. Go to `/admin/settings`
2. Set **Analysis Available** to `false`
3. Add logic to your checkout page to check this setting before allowing new orders

---

## Environment Variable Reference

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Your project URL (safe to expose)
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Anon/public key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY=          # SECRET — server only, never client

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Safe to expose
STRIPE_SECRET_KEY=                  # SECRET — server only
STRIPE_WEBHOOK_SECRET=              # SECRET — webhook signature verification
STRIPE_PRODUCT_ID=                  # Stripe product ID
STRIPE_PRICE_ID=                    # Stripe price ID (e.g. price_xxx)

# Resend (email)
RESEND_API_KEY=                     # SECRET — server only
RESEND_FROM_EMAIL=                  # e.g. noreply@pitchframe.com

# App
NEXT_PUBLIC_APP_URL=                # e.g. https://pitchframe.com
NEXT_PUBLIC_APP_NAME=PitchFrame
ADMIN_EMAILS=                       # Comma-separated admin emails
CONTACT_DESTINATION_EMAIL=          # Where contact form goes
```

---

## Common Issues

**"Error: Missing Supabase environment variables"**
Make sure `.env.local` exists and has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Payment goes through but order doesn't update**
The Stripe webhook isn't connected. Check Step 7 and verify `STRIPE_WEBHOOK_SECRET` matches your Stripe dashboard webhook secret.

**Emails aren't sending**
Verify `RESEND_API_KEY` is correct and your sending domain is verified in Resend.

**Videos won't upload**
Check that the three storage buckets exist in Supabase and the RLS migration (`003_storage_policies.sql`) ran successfully.

**Admin dashboard says "Access Denied"**
Your account's `is_admin` column is not set to `true`. Run the SQL in Step 5.

**Build errors on Vercel**
Run `npm run build` locally first and fix any TypeScript errors before pushing.

---

## Support

For application-level questions, open an issue on GitHub.

PitchFrame is not a medical or emergency service.
If an athlete is experiencing a medical emergency, call 911.
