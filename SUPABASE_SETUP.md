# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New Project**.
3. Choose your organisation, give the project a name (e.g. `pos-pole`), set a secure database password, and pick the region closest to you.
4. Click **Create new project** and wait for provisioning to complete (~1–2 minutes).

## 2. Get Your Project URL and Anon Key

1. In the Supabase dashboard, go to **Project Settings → API**.
2. Copy the **Project URL** — this is your `EXPO_PUBLIC_SUPABASE_URL`.
3. Copy the **anon / public** key — this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## 3. Create the Required Tables

Open the **SQL Editor** (left sidebar) and run the following SQL:

```sql
-- Canonical trick library (admin-managed, synced to clients)
CREATE TABLE public.tricks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pole_type TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  has_sides BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] NOT NULL DEFAULT '{}',
  diagram_url TEXT,
  reference_video_url TEXT,
  is_official BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trick submissions from users (crowdsourcing)
CREATE TABLE public.trick_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  pole_type TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  has_sides BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.trick_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own submissions" ON public.trick_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own submissions" ON public.trick_submissions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tricks are public read" ON public.tricks
  FOR SELECT USING (true);
```

## 4. Enable Apple and Google OAuth Providers

### Apple Sign In
1. Go to **Authentication → Providers** in the Supabase dashboard.
2. Find **Apple** and enable it.
3. Follow Supabase's Apple OAuth guide: you will need an Apple Developer account, a **Services ID**, and a **private key**. See [Supabase Apple auth docs](https://supabase.com/docs/guides/auth/social-login/auth-apple).

### Google Sign In
1. In the same **Authentication → Providers** section, find **Google** and enable it.
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/):
   - Create an OAuth 2.0 Client ID (Web application type).
   - Add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI.
3. Paste the **Client ID** and **Client Secret** into the Supabase Google provider settings.
4. See [Supabase Google auth docs](https://supabase.com/docs/guides/auth/social-login/auth-google) for full details.

## 5. Configure Environment Variables

Create a `.env.local` file in the project root (it is already in `.gitignore`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Then restart the Expo dev server:

```bash
npx expo start --clear
```

> **Note:** `EXPO_PUBLIC_` prefix is required for Expo to expose the variables to the client bundle.
