-- pos-pole Supabase schema
-- Run this in the Supabase SQL Editor to set up the database from scratch.
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trick_submissions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,                          -- nullable: anonymous submissions allowed
  name        TEXT        NOT NULL,
  pole_type   TEXT        NOT NULL,          -- 'both' | 'static_only' | 'spin_only'
  difficulty  INTEGER     NOT NULL,          -- 1–5
  has_sides   BOOLEAN     NOT NULL DEFAULT true,
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  notes       TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.trick_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert
DROP POLICY IF EXISTS "Anyone can submit" ON public.trick_submissions;
CREATE POLICY "Anyone can submit" ON public.trick_submissions
  FOR INSERT WITH CHECK (true);

-- Authenticated users can see their own submissions + anonymous submissions;
-- admins can see everything
DROP POLICY IF EXISTS "Own submissions visible" ON public.trick_submissions;
CREATE POLICY "Own submissions visible" ON public.trick_submissions
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
    OR user_id = auth.uid()
    OR user_id IS NULL
  );

-- Only admins can approve / reject
DROP POLICY IF EXISTS "Admin can review" ON public.trick_submissions;
CREATE POLICY "Admin can review" ON public.trick_submissions
  FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- ─── Admin setup ─────────────────────────────────────────────────────────────
-- To grant admin access to a user, run:
--
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'
--   WHERE email = 'your@email.com';
--
-- The app reads app_metadata.is_admin from the JWT — this field is set by the
-- service role only and cannot be spoofed by the client.
