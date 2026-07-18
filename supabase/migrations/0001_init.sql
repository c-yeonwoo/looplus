-- 재테크 엔진 플랫폼 — 초기 스키마 (핸드오프 §7)
-- 단위 규약: 모든 금액 컬럼은 '만원' 단위 numeric. 비율은 퍼센트(numeric).
-- 모든 수치는 '예시·가정'. RLS로 사용자별 격리.

-- ─────────────────────────────────────────────
-- 확장
-- ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- 사용자 프로필 (auth.users 1:1)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarded_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- A. Vision / 목표
-- ─────────────────────────────────────────────
create table if not exists public.visions (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  goal_networth       numeric not null default 0,   -- 만원
  goal_passive_income numeric not null default 0,   -- 월 만원
  target_years        integer not null default 15,
  current_age         integer,
  why                 text default '',
  scenes              jsonb  not null default '[]', -- [{type, text, emoji, image_url}]
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- B. 재무 스냅샷 (C 엔진과 공유하는 원천 데이터)
-- ─────────────────────────────────────────────
create table if not exists public.snapshots (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  cash             numeric not null default 0,   -- 현금·예적금(만원)
  invest_assets    numeric not null default 0,   -- 투자자산(만원)
  real_estate      numeric not null default 0,   -- 부동산(만원)
  liabilities      numeric not null default 0,   -- 부채(만원)
  income_sources   jsonb  not null default '[]', -- [{type(labor/capital/platform/freelance), monthly}]
  monthly_spending numeric not null default 0,   -- 월 지출(만원)
  emergency_months numeric not null default 0,
  updated_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- C. 엔진 버킷 (팔레트에서 사용자가 조립)
-- ─────────────────────────────────────────────
create table if not exists public.engine_buckets (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.profiles(id) on delete cascade,
  category                    text not null check (category in ('invest','save','spend')),
  name                        text not null,
  ratio_pct                   numeric not null default 0,
  expected_annual_return_pct  numeric not null default 0,   -- 가정
  realized_yield_pct          numeric not null default 0,   -- 실현(배당·임대·이자) 몫
  is_locked                   boolean not null default false,
  lock_until_age              integer,
  linked_tool                 text,
  position                    integer not null default 0,
  created_at                  timestamptz not null default now()
);
create index if not exists engine_buckets_user_idx on public.engine_buckets(user_id);

-- ─────────────────────────────────────────────
-- 시나리오 (엔진 배분안 저장 · A/B 비교). buckets는 스냅샷 형태 jsonb.
-- ─────────────────────────────────────────────
create table if not exists public.scenarios (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  buckets    jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists scenarios_user_idx on public.scenarios(user_id);

-- ─────────────────────────────────────────────
-- updated_at 자동 갱신 트리거
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists trg_visions_updated on public.visions;
create trigger trg_visions_updated before update on public.visions
  for each row execute function public.set_updated_at();
drop trigger if exists trg_snapshots_updated on public.snapshots;
create trigger trg_snapshots_updated before update on public.snapshots
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 신규 auth 유저 → profiles 자동 생성
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- RLS — 사용자별 격리
-- ─────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.visions        enable row level security;
alter table public.snapshots      enable row level security;
alter table public.engine_buckets enable row level security;
alter table public.scenarios      enable row level security;

-- profiles
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 나머지 테이블: user_id = auth.uid()
drop policy if exists "own vision" on public.visions;
create policy "own vision" on public.visions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own snapshot" on public.snapshots;
create policy "own snapshot" on public.snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own buckets" on public.engine_buckets;
create policy "own buckets" on public.engine_buckets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own scenarios" on public.scenarios;
create policy "own scenarios" on public.scenarios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
