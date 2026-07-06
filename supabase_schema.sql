-- ============================================================
-- SOLAR Archive — Phase 2A Database Schema
-- Run this entire file in the Supabase SQL Editor once.
-- ============================================================

-- ── Table 1: users_profile ──────────────────────────────────
-- Created/updated automatically by AuthContext.jsx on sign-in.
create table if not exists users_profile (
  id          uuid        primary key default gen_random_uuid(),
  clerk_id    text        unique not null,
  username    text        not null,
  email       text        not null default '',
  first_name  text        not null default '',
  last_name   text        not null default '',
  points      integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Migration for databases created from the earlier version of this file
alter table users_profile add column if not exists first_name text not null default '';
alter table users_profile add column if not exists last_name  text not null default '';
alter table users_profile add column if not exists updated_at timestamptz not null default now();

-- ── Table 2: archive_entries ────────────────────────────────
-- Holds both seeded static subjects AND user submissions.
create table if not exists archive_entries (
  id                    uuid        primary key default gen_random_uuid(),
  title                 text        not null,
  content               text        not null default '',
  short_summary         text        not null default '',
  layer                 integer     not null default 4
                          check (layer between 4 and 8),
  planet_id             text        not null,
  hub_id                text        not null default '',
  coord_x               integer     not null default 0,
  coord_y               integer     not null default 0,
  status                text        not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected')),
  submitted_by          uuid        references users_profile(id) on delete set null,
  tags                  text[]      not null default '{}',
  attachments           jsonb       not null default '[]',
  alternate_perspectives jsonb      not null default '[]',
  difficulty            integer     check (difficulty between 1 and 5),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Index for the main query pattern (by planet + status)
create index if not exists idx_archive_entries_planet_status
  on archive_entries (planet_id, status);

-- Index for directory / leaderboard queries
create index if not exists idx_archive_entries_submitted_by
  on archive_entries (submitted_by);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_archive_entries_updated_at on archive_entries;
create trigger trg_archive_entries_updated_at
  before update on archive_entries
  for each row execute function update_updated_at();
