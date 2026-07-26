-- 버킷별 현재 보유액 (만원). 없으면 0으로 취급.
alter table public.engine_buckets
  add column if not exists current_balance numeric;

comment on column public.engine_buckets.current_balance is
  '이 버킷에 지금 모아 둔 금액(만원). 투자·저축 리프용. null/0 = 없음';
