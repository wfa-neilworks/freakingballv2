-- Run this FIRST to clean up a partial migration, then run 001_initial_schema.sql

-- Drop triggers
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists profiles_updated_at on profiles;
drop trigger if exists clubs_updated_at on clubs;
drop trigger if exists members_updated_at on members;
drop trigger if exists open_plays_updated_at on open_plays;
drop trigger if exists tournaments_updated_at on tournaments;
drop trigger if exists tournament_events_updated_at on tournament_events;
drop trigger if exists player_stats_updated_at on player_stats;

-- Drop tables (order matters due to FK constraints)
drop table if exists titles cascade;
drop table if exists player_stats cascade;
drop table if exists tournament_matches cascade;
drop table if exists tournament_registrations cascade;
drop table if exists tournament_events cascade;
drop table if exists tournaments cascade;
drop table if exists open_play_matches cascade;
drop table if exists open_play_participants cascade;
drop table if exists open_plays cascade;
drop table if exists members cascade;
drop table if exists clubs cascade;
drop table if exists profiles cascade;

-- Drop functions (after tables so dependent policies are already gone)
drop function if exists handle_new_user() cascade;
drop function if exists handle_updated_at() cascade;
drop function if exists is_super_admin() cascade;
drop function if exists owns_club(uuid) cascade;

-- Drop enums
drop type if exists tournament_status cascade;
drop type if exists session_status cascade;
drop type if exists gender cascade;
drop type if exists partner_mode cascade;
drop type if exists doubles_category cascade;
drop type if exists play_type cascade;
drop type if exists club_status cascade;
drop type if exists user_role cascade;
