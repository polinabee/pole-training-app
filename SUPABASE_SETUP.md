# Supabase Setup

## 1. Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 2. Configure environment variables

Create a `.env` file in the project root (already in `.gitignore`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Run the schema

Open the **SQL Editor** in the Supabase dashboard and paste the contents of
[`supabase/schema.sql`](supabase/schema.sql), then click **Run**.

The file is safe to re-run (uses `IF NOT EXISTS` / `DROP IF EXISTS`).

## 4. Disable email confirmation (recommended)

Authentication → Providers → Email → toggle **"Confirm email"** OFF.

Without this, users must click a confirmation link before they can sign in,
which is a poor experience for a mobile app.

## 5. Grant yourself admin access

Run this in the SQL Editor, replacing the email with yours:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'
WHERE email = 'your@email.com';
```

Then sign out and back in so the app picks up the updated JWT.

## 6. Rebuild the app

```bash
npx expo run:ios
```
