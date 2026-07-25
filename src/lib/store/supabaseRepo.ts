import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionItem,
  Bucket,
  BucketCategory,
  DayLog,
  EngineConfig,
  IncomeSource,
  Profile,
  RoutineItem,
  Scenario,
  Scene,
  Tracking,
  UiPrefs,
} from "../types";
import type { SpendingState } from "../spending/types";
import { emptySpending } from "../spending/types";
import type { LoadedProfile } from "./mergeProfile";
import { emptyProfile } from "./defaults";
import { normalizeTracking } from "../tracking";

/** action_items jsonb: 레거시 ActionItem[] 또는 v2 { routines, logs, actions } */
function trackingFromDb(raw: unknown, checkIns: string[]): Tracking {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && (raw as { v?: number }).v === 2) {
    const o = raw as {
      routines?: RoutineItem[];
      logs?: DayLog[];
      actions?: ActionItem[];
      dismissedNextStepStage?: number | null;
    };
    return normalizeTracking({
      routines: o.routines ?? [],
      logs: o.logs ?? [],
      actions: o.actions ?? [],
      checkIns,
      dismissedNextStepStage: o.dismissedNextStepStage ?? null,
    });
  }
  return normalizeTracking({
    actions: Array.isArray(raw) ? (raw as ActionItem[]) : [],
    checkIns,
    routines: [],
    logs: [],
  });
}

function trackingToDb(t: Tracking | undefined) {
  const n = normalizeTracking(t);
  return {
    v: 2 as const,
    routines: n.routines,
    logs: n.logs,
    actions: n.actions,
    dismissedNextStepStage: n.dismissedNextStepStage ?? null,
  };
}

/**
 * Profile ↔ Supabase 정규화 테이블(0001_init.sql) 매핑.
 *
 * - engine_buckets.id 는 uuid(default). 로컬 문자열 id는 저장하지 않고 DB가 생성 →
 *   load 시 DB uuid를 bucket.id로 사용한다(재저장은 delete+insert로 치환).
 * - vision/snapshot 은 user_id PK upsert. buckets/scenarios 는 delete 후 insert.
 * - 존재하지 않는 프로필(신규 유저)은 null 반환.
 */

interface BucketRow {
  id: string;
  category: string;
  name: string;
  ratio_pct: number;
  expected_annual_return_pct: number;
  realized_yield_pct: number;
  is_locked: boolean;
  lock_until_age: number | null;
  linked_tool: string | null;
  position: number;
  /** 클라이언트 Bucket.id (계층 복원용) */
  client_key?: string | null;
  parent_client_key?: string | null;
  canvas_x?: number | null;
  canvas_y?: number | null;
}

function num(v: unknown): number | null {
  return v == null ? null : Number(v);
}

function rowToBucket(r: BucketRow): Bucket {
  return {
    // client_key가 있으면 로컬 계층 id 유지 (없으면 레거시: db uuid)
    id: r.client_key?.trim() || r.id,
    category: r.category as BucketCategory,
    name: r.name,
    ratioPct: Number(r.ratio_pct),
    parentId: r.parent_client_key?.trim() || null,
    expectedAnnualReturnPct: Number(r.expected_annual_return_pct),
    realizedYieldPct: Number(r.realized_yield_pct),
    isLocked: r.is_locked,
    lockUntilAge: r.lock_until_age ?? undefined,
    linkedTool: r.linked_tool ?? undefined,
    position: r.position,
    canvasX: num(r.canvas_x),
    canvasY: num(r.canvas_y),
  };
}

function bucketToRow(b: Bucket, userId: string) {
  return {
    user_id: userId,
    category: b.category,
    name: b.name,
    ratio_pct: b.ratioPct,
    expected_annual_return_pct: b.expectedAnnualReturnPct,
    realized_yield_pct: b.realizedYieldPct,
    is_locked: b.isLocked,
    lock_until_age: b.lockUntilAge ?? null,
    linked_tool: b.linkedTool ?? null,
    position: b.position,
    client_key: b.id,
    parent_client_key: b.parentId ?? null,
    canvas_x: b.canvasX ?? null,
    canvas_y: b.canvasY ?? null,
  };
}

/** profiles.engine_layout jsonb — 버킷 노드를 제외한 캔버스 배치 */
type EngineLayout = Omit<EngineConfig, "buckets">;

function layoutToDb(e: EngineConfig): EngineLayout {
  return {
    incomeCanvasX: e.incomeCanvasX ?? null,
    incomeCanvasY: e.incomeCanvasY ?? null,
    poolCanvasX: e.poolCanvasX ?? null,
    poolCanvasY: e.poolCanvasY ?? null,
    edgeControls: e.edgeControls ?? {},
    showIncomeSources: e.showIncomeSources ?? true,
  };
}

function layoutFromDb(raw: unknown): EngineLayout {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as EngineLayout;
  return {
    incomeCanvasX: o.incomeCanvasX ?? null,
    incomeCanvasY: o.incomeCanvasY ?? null,
    poolCanvasX: o.poolCanvasX ?? null,
    poolCanvasY: o.poolCanvasY ?? null,
    edgeControls: o.edgeControls ?? {},
    showIncomeSources: o.showIncomeSources ?? true,
  };
}

function spendingFromDb(raw: unknown): SpendingState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptySpending();
  const o = raw as Partial<SpendingState>;
  return {
    monthlyVariableBudgetWon: Number(o.monthlyVariableBudgetWon ?? 0),
    logs: o.logs ?? [],
    fixed: o.fixed ?? [],
    favorites: o.favorites ?? [],
  };
}

function uiPrefsFromDb(raw: unknown): UiPrefs | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as UiPrefs;
  return {
    hiddenHomeMetrics: o.hiddenHomeMetrics ?? [],
    autoSyncSpendToDiagnosis: o.autoSyncSpendToDiagnosis ?? false,
  };
}

export async function loadProfile(
  sb: SupabaseClient,
  userId: string,
): Promise<LoadedProfile | null> {
  const { data: prof, error } = await sb
    .from("profiles")
    .select(
      "onboarded_at, action_items, check_ins, spending, ui_prefs, engine_layout, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!prof) return null;

  const [visionRes, snapRes, bucketRes, scenRes] = await Promise.all([
    sb.from("visions").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("snapshots").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("engine_buckets").select("*").eq("user_id", userId).order("position"),
    sb.from("scenarios").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  const profile = emptyProfile();
  profile.onboardedAt = prof.onboarded_at ?? null;
  // 원격 행의 실제 시각. now() 를 넣으면 어느 쪽이 최신인지 판단할 근거가 사라진다.
  profile.updatedAt = prof.updated_at ?? new Date(0).toISOString();
  profile.tracking = trackingFromDb(prof.action_items, (prof.check_ins as string[]) ?? []);
  profile.spending = spendingFromDb(prof.spending);
  const uiPrefs = uiPrefsFromDb(prof.ui_prefs);
  if (uiPrefs) profile.uiPrefs = uiPrefs;

  if (visionRes.data) {
    const v = visionRes.data;
    profile.vision = {
      goalNetworth: Number(v.goal_networth),
      goalPassiveIncome: Number(v.goal_passive_income),
      targetYears: v.target_years,
      currentAge: v.current_age ?? undefined,
      why: v.why ?? "",
      scenes: (v.scenes as Scene[]) ?? [],
    };
  }
  if (snapRes.data) {
    const s = snapRes.data;
    profile.snapshot = {
      cash: Number(s.cash),
      investAssets: Number(s.invest_assets),
      realEstate: Number(s.real_estate),
      liabilities: Number(s.liabilities),
      incomeSources: (s.income_sources as IncomeSource[]) ?? [],
      monthlySpending: Number(s.monthly_spending),
      emergencyMonths: Number(s.emergency_months),
    };
  }
  profile.engine = {
    ...layoutFromDb(prof.engine_layout),
    buckets: (bucketRes.data ?? []).map((r) => rowToBucket(r as BucketRow)),
  };
  profile.scenarios = (scenRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    buckets: r.buckets as Bucket[],
    createdAt: r.created_at,
  })) as Scenario[];

  return {
    profile,
    stored: {
      spending: prof.spending != null,
      uiPrefs: prof.ui_prefs != null,
      engineLayout: prof.engine_layout != null,
    },
  };
}

/**
 * 저장 단계와 원인을 담은 에러.
 * 이전에는 각 쿼리의 `{ error }` 를 버려서, 권한·제약 위반으로 저장이 실패해도
 * Promise 가 정상 resolve 했다. 호출자의 catch 는 한 번도 실행되지 않았고
 * 사용자는 저장된 줄 알았다.
 */
export class ProfileSaveError extends Error {
  constructor(
    readonly step: string,
    readonly detail: string,
  ) {
    super(`프로필 저장 실패 (${step}): ${detail}`);
    this.name = "ProfileSaveError";
  }
}

async function must(
  step: string,
  op: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const { error } = await op;
  if (error) throw new ProfileSaveError(step, error.message);
}

export async function saveProfile(
  sb: SupabaseClient,
  userId: string,
  profile: Profile,
): Promise<void> {
  // profiles (+ tracking + 로컬 전용이던 상태)
  await must(
    "프로필",
    sb.from("profiles").upsert(
      {
        id: userId,
        onboarded_at: profile.onboardedAt,
        action_items: trackingToDb(profile.tracking),
        check_ins: profile.tracking?.checkIns ?? [],
        spending: profile.spending ?? emptySpending(),
        ui_prefs: profile.uiPrefs ?? {},
        engine_layout: layoutToDb(profile.engine),
      },
      { onConflict: "id" },
    ),
  );

  // vision
  if (profile.vision) {
    const v = profile.vision;
    await must(
      "목표",
      sb.from("visions").upsert(
        {
          user_id: userId,
          goal_networth: v.goalNetworth,
          goal_passive_income: v.goalPassiveIncome,
          target_years: v.targetYears,
          current_age: v.currentAge ?? null,
          why: v.why,
          scenes: v.scenes,
        },
        { onConflict: "user_id" },
      ),
    );
  }

  // snapshot
  if (profile.snapshot) {
    const s = profile.snapshot;
    await must(
      "현황",
      sb.from("snapshots").upsert(
        {
          user_id: userId,
          cash: s.cash,
          invest_assets: s.investAssets,
          real_estate: s.realEstate,
          liabilities: s.liabilities,
          income_sources: s.incomeSources,
          monthly_spending: s.monthlySpending,
          emergency_months: s.emergencyMonths,
        },
        { onConflict: "user_id" },
      ),
    );
  }

  // engine_buckets: 치환. delete 후 insert 가 실패하면 원격이 비므로 반드시 throw 한다
  // (로컬 persist 가 원본으로 남아 다음 저장에서 복구된다).
  await must("배분 정리", sb.from("engine_buckets").delete().eq("user_id", userId));
  if (profile.engine.buckets.length > 0) {
    await must(
      "배분",
      sb.from("engine_buckets").insert(profile.engine.buckets.map((b) => bucketToRow(b, userId))),
    );
  }

  // scenarios: 치환
  await must("시나리오 정리", sb.from("scenarios").delete().eq("user_id", userId));
  if (profile.scenarios.length > 0) {
    await must(
      "시나리오",
      sb.from("scenarios").insert(
        profile.scenarios.map((sc) => ({
          user_id: userId,
          name: sc.name,
          buckets: sc.buckets,
          created_at: sc.createdAt,
        })),
      ),
    );
  }
}

/**
 * 로컬 프로필에 실데이터가 있는지 (신규 로그인 시 remote로 이관할지 판단).
 * 지출·실천 기록만 있는 사용자도 이관 대상이다 — 이전에는 제외돼서 백업되지 않았다.
 */
export function profileHasData(p: Profile): boolean {
  const s = p.spending;
  const hasSpending = Boolean(
    s && (s.logs.length > 0 || s.fixed.length > 0 || s.monthlyVariableBudgetWon > 0),
  );
  const t = p.tracking;
  const hasTracking = Boolean(t && (t.routines?.length > 0 || t.logs?.length > 0));
  return Boolean(
    p.snapshot || p.vision || p.engine.buckets.length > 0 || hasSpending || hasTracking,
  );
}
