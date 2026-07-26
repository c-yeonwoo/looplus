-- 로컬에만 존재해서 로그인 시 소실되던 상태를 영속화.
--
-- loadProfile 은 emptyProfile() 로 시작해 DB 컬럼만 채운다. 저장 경로가 없는 필드는
-- remote 프로필에서 항상 빈 값이 되고, SyncManager 가 replaceProfile(remote) 하는
-- 순간 로컬 값이 지워졌다. 지출 기록 전체가 이 경로로 날아갔다.

-- 지출관리(E) — 금액 단위는 원. { monthlyVariableBudgetWon, logs, fixed, favorites }
alter table public.profiles
  add column if not exists spending jsonb;

-- UI 선호 — { hiddenHomeMetrics, autoSyncSpendToDiagnosis }
alter table public.profiles
  add column if not exists ui_prefs jsonb;

-- 엔진 캔버스 레이아웃(버킷 노드 제외)
-- { incomeCanvasX, incomeCanvasY, poolCanvasX, poolCanvasY, edgeControls, showIncomeSources }
alter table public.profiles
  add column if not exists engine_layout jsonb;

-- 버킷 노드의 캔버스 좌표. 사용자가 직접 배치한 위치라 유실되면 눈에 바로 띈다.
alter table public.engine_buckets
  add column if not exists canvas_x numeric;

alter table public.engine_buckets
  add column if not exists canvas_y numeric;
