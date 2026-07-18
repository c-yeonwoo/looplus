-- F. 실천·트래킹 (리텐션 루프) — profiles에 tracking 컬럼 추가.
-- 최소 버전이라 별도 테이블 대신 jsonb 컬럼으로 보관.

alter table public.profiles
  add column if not exists action_items jsonb not null default '[]',
  add column if not exists check_ins    jsonb not null default '[]';
