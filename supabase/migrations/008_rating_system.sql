-- ============================================================
-- FreakingBall — Rating System
-- Adds skill_level, rating, total_rated_games to members
-- Creates member_rating_history table
-- ============================================================

-- ENUM for skill level
create type skill_level as enum ('beginner', 'novice', 'intermediate', 'advanced', 'expert');

-- ENUM for rating match source
create type rating_match_source as enum ('open_play', 'tournament', 'manual');

-- Add rating columns to members
alter table members
  add column if not exists skill_level skill_level not null default 'beginner',
  add column if not exists rating int not null default 200 check (rating >= 100 and rating <= 1000),
  add column if not exists total_rated_games int not null default 0;

-- Rating history — one row per rating change
create table if not exists member_rating_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  match_id uuid,
  match_source rating_match_source,
  rating_before int not null,
  rating_after int not null,
  change int not null,
  reason text,
  created_at timestamptz not null default now()
);

create index mrh_member_id_idx on member_rating_history(member_id);
create index mrh_match_id_idx on member_rating_history(match_id);

-- RLS on member_rating_history
alter table member_rating_history enable row level security;

create policy "Club admin reads rating history" on member_rating_history for select
  using (
    exists (
      select 1 from members m
      where m.id = member_id and owns_club(m.club_id)
    )
  );

create policy "Service role manages rating history" on member_rating_history for all
  using (true);
