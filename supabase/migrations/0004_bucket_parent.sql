-- 엔진 버킷 계층(parentId) 영속화.
-- 클라이언트 id는 uuid가 아님(b_1_xxx) → client_key / parent_client_key 로 보존.

alter table public.engine_buckets
  add column if not exists client_key text;

alter table public.engine_buckets
  add column if not exists parent_client_key text;

create index if not exists engine_buckets_user_client_idx
  on public.engine_buckets (user_id, client_key);
