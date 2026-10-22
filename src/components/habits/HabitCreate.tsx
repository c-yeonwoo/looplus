"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  FEATURED_HABIT_IDS,
  HABIT_CATEGORIES,
  HABIT_TEMPLATES,
  searchTemplates,
  type HabitTemplate,
} from "@/lib/habits/catalog";
import {
  draftFromTemplate,
  habitScheduleLabel,
  habitTargetLabel,
  nextHabitDate,
  routineFromDraft,
  validateHabitDraft,
  weeklyProgress,
  type HabitDraft,
} from "@/lib/habits";
import { dateKey, WEEKDAY_LABEL, WEEKDAY_ORDER } from "@/lib/tracking";
import { useProfile } from "@/lib/store/useProfile";
import { Icon } from "../Icon";
import { HabitIcon } from "./HabitIcon";

const DRAFT_KEY = "looplus-habit-draft-v1";
function restoreDraft(): HabitDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (
      !value ||
      typeof value.id !== "string" ||
      !Array.isArray(value.weekdays)
    )
      return null;
    const strings = [
      "title",
      "kind",
      "target",
      "unit",
      "minimum",
      "smallAction",
      "repeat",
      "weeklyTarget",
      "cue",
      "loopId",
    ];
    return strings.every((key) => typeof value[key] === "string")
      ? value
      : null;
  } catch {
    return null;
  }
}

export function HabitCreate({ goalId = "" }: { goalId?: string }) {
  const router = useRouter();
  const profile = useProfile((s) => s.profile);
  const addHabit = useProfile((s) => s.addHabit);
  const [draft, setDraft] = useState<HabitDraft | null>(restoreDraft);
  const [screen, setScreen] = useState<"pick" | "library" | "setup">("pick");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<HabitTemplate | null>(null);
  const busy = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const goals = profile.tracking.goalLoops.filter((g) => !g.completedAt);

  useEffect(() => {
    if (!draft) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* 저장 실패 시 현재 입력은 유지한다. */
    }
  }, [draft]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const choose = (template?: HabitTemplate, force = false) => {
    if (
      template &&
      !force &&
      profile.tracking.routines.some(
        (r) => r.habit?.templateId === template.id && !r.archivedAt,
      )
    ) {
      setDuplicate(template);
      return;
    }
    if (draft && !window.confirm("작성 중인 초안을 새 루틴으로 바꿀까요?"))
      return;
    const next = draftFromTemplate(template, query.trim());
    if (goals.some((g) => g.id === goalId)) next.loopId = goalId;
    setDraft(next);
    setScreen("setup");
    setDuplicate(null);
    setError("");
    window.scrollTo(0, 0);
  };
  const patch = (value: Partial<HabitDraft>) =>
    setDraft((d) => (d ? { ...d, ...value } : d));
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft || busy.current) return;
    const message = validateHabitDraft(draft);
    if (message) {
      setError(message);
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const id = addHabit(draft);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* 생성 자체에는 영향 없음 */
      }
      router.replace(`/home?added=${encodeURIComponent(id)}`);
    } catch (e) {
      setError(
        e instanceof Error &&
          /목표|입력|기준|선택|주기|이름|설명/.test(e.message)
          ? e.message
          : "이 기기에 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인한 뒤 다시 시도해 주세요. 입력은 그대로 남아 있어요.",
      );
      busy.current = false;
      setSaving(false);
    }
  };
  const back = () => {
    setScreen("pick");
    setError("");
  };
  const templateRows = (items: readonly HabitTemplate[]) => (
    <ul className="habit-list">
      {items.map((t) => {
        const existing = profile.tracking.routines.some(
          (r) => r.habit?.templateId === t.id && !r.archivedAt,
        );
        return (
          <li key={t.id}>
            <button className="habit-choice" onClick={() => choose(t)}>
              <HabitIcon templateId={t.id} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-semibold">{t.title}</span>
                <span className="mt-1 block text-sm text-ink-600">
                  {t.kind === "check" ? "체크" : `${t.target}${t.unit}`} ·{" "}
                  {t.weeklyTarget ? `주 ${t.weeklyTarget}일` : "매일"}
                  {existing ? " · 이미 사용 중" : ""}
                </span>
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );

  let preview = null;
  if (draft && !validateHabitDraft(draft)) {
    const r = routineFromDraft(draft, 0),
      first = nextHabitDate(r, dateKey());
    const week = weeklyProgress(r, [], dateKey());
    preview = (
      <p className="habit-preview">
        <Icon name="calendar" size={20} />
        <span>
          {first === dateKey() ? "오늘부터" : `${first}부터`} ·{" "}
          {habitTargetLabel(r)} · {habitScheduleLabel(r)}
          {r.habit?.weeklyTarget && week.target < r.habit.weeklyTarget && (
            <span className="mt-1 block text-sm font-normal">
              이번 주는 남은 {week.target}일, 다음 주부터 {r.habit.weeklyTarget}
              일
            </span>
          )}
        </span>
      </p>
    );
  }
  return (
    <div className="habit-page habit-flow">
      <header className="habit-flow-header">
        {screen === "pick" ? (
          <Link
            className="habit-icon-button"
            href="/home"
            aria-label="오늘로 돌아가기"
          >
            <Icon name="chevron-left" />
          </Link>
        ) : (
          <button
            className="habit-icon-button"
            onClick={back}
            aria-label="루틴 고르기로 돌아가기"
          >
            <Icon name="chevron-left" />
          </button>
        )}
        <span>
          {screen === "setup"
            ? "루틴 설정"
            : screen === "library"
              ? "모든 루틴"
              : "루틴 고르기"}
        </span>
      </header>
      {screen !== "setup" ? (
        <>
          <h1 className="habit-title">
            {screen === "library" ? (
              "나에게 맞는 실천"
            ) : (
              <>
                하나 골라,
                <br />
                나답게 시작해요.
              </>
            )}
          </h1>
          <p className="mt-3 text-ink-600">시간과 횟수는 바꿀 수 있어요.</p>
          {draft && (
            <div className="habit-notice mt-5">
              <p>작성 중인 루틴이 있어요.</p>
              <button
                className="habit-text-button"
                onClick={() => {
                  setScreen("setup");
                  setError("");
                }}
              >
                이어서 작성하기
              </button>
              <button
                className="habit-text-button"
                onClick={() => {
                  setDraft(null);
                  try {
                    sessionStorage.removeItem(DRAFT_KEY);
                  } catch {}
                }}
              >
                초안 지우기
              </button>
            </div>
          )}
          <label className="habit-search">
            <Icon name="search" size={20} />
            <span className="sr-only">루틴 검색</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="독서, 산책, 정리..."
              type="search"
            />
          </label>
          {duplicate && (
            <div className="habit-notice mb-5" role="status">
              <p>‘{duplicate.title}’는 이미 사용 중이에요.</p>
              <Link className="habit-text-button" href="/home">
                내 루틴 보기
              </Link>
              <button
                className="habit-text-button"
                onClick={() => choose(duplicate, true)}
              >
                별도 루틴으로 만들기
              </button>
              <button
                className="habit-text-button"
                onClick={() => setDuplicate(null)}
              >
                닫기
              </button>
            </div>
          )}
          {query.trim() ? (
            <>
              <h2 className="habit-section-title">
                검색 결과 {searchTemplates(query).length}개
              </h2>
              {templateRows(searchTemplates(query))}
              {!searchTemplates(query).length && (
                <p className="py-6 text-ink-600">
                  찾는 루틴이 없나요? 직접 만들어 보세요.
                </p>
              )}
            </>
          ) : screen === "pick" ? (
            <>
              <h2 className="habit-section-title">처음 시작하기 좋은 루틴</h2>
              {templateRows(
                FEATURED_HABIT_IDS.map(
                  (id) => HABIT_TEMPLATES.find((t) => t.id === id)!,
                ),
              )}
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-600">6개 분야 · 24개 루틴</p>
              {HABIT_CATEGORIES.map((category) => (
                <details className="habit-category" key={category}>
                  <summary>
                    {category}
                    <span className="ml-auto text-ink-600">4개</span>
                  </summary>
                  {templateRows(
                    HABIT_TEMPLATES.filter((t) => t.category === category),
                  )}
                </details>
              ))}
            </>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {screen === "pick" && (
              <button
                className="habit-secondary flex-1"
                onClick={() => setScreen("library")}
              >
                모든 루틴 보기 · 24개
              </button>
            )}
            <button className="habit-secondary flex-1" onClick={() => choose()}>
              <Icon name="plus" size={18} />
              직접 만들기
            </button>
          </div>
        </>
      ) : (
        draft && (
          <form onSubmit={save}>
            <h1 className="habit-title">내 생활에 맞춰요.</h1>
            <details
              className="habit-category mt-6"
              open={!draft.templateId || undefined}
            >
              <summary>
                <HabitIcon templateId={draft.templateId} />
                <span className="min-w-0 flex-1 break-words">
                  {draft.title || "새 루틴"}
                </span>
                <span className="text-sm text-gold-600">바꾸기</span>
              </summary>
              <div className="space-y-5 p-4">
                <label className="habit-field">
                  루틴 이름
                  <input
                    maxLength={80}
                    value={draft.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </label>
                <fieldset>
                  <legend className="mb-2">기록 방식</legend>
                  <div className="habit-segments">
                    {(["check", "time", "count"] as const).map((kind) => (
                      <button
                        type="button"
                        key={kind}
                        aria-pressed={draft.kind === kind}
                        onClick={() =>
                          patch({
                            kind,
                            target:
                              kind === "check"
                                ? "1"
                                : kind === "time"
                                  ? "10"
                                  : "3",
                            unit:
                              kind === "time"
                                ? "분"
                                : kind === "count"
                                  ? "개"
                                  : "",
                            minimum: "",
                            smallAction: "",
                          })
                        }
                      >
                        {kind === "check"
                          ? "체크"
                          : kind === "time"
                            ? "시간"
                            : "수량"}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </details>
            <p className="mt-3 text-sm text-ink-600">
              {draft.kind === "check"
                ? "했는지 체크하는 루틴"
                : draft.kind === "time"
                  ? "시간으로 기록하는 루틴"
                  : "수량으로 기록하는 루틴"}
            </p>
            {draft.kind !== "check" && (
              <div className="mt-6 flex items-end gap-3">
                <label className="habit-field flex-1">
                  한 번에 얼마나 할까요?
                  <input
                    inputMode="decimal"
                    value={draft.target}
                    onChange={(e) => patch({ target: e.target.value })}
                  />
                </label>
                {draft.kind === "time" ? (
                  <span className="pb-3">분</span>
                ) : (
                  <label className="habit-field w-24">
                    단위
                    <input
                      maxLength={8}
                      value={draft.unit}
                      onChange={(e) => patch({ unit: e.target.value })}
                    />
                  </label>
                )}
              </div>
            )}
            <fieldset className="mt-6">
              <legend className="mb-3">언제 반복할까요?</legend>
              <div className="habit-segments">
                {(["daily", "weekdays", "weekly"] as const).map((repeat) => (
                  <button
                    type="button"
                    key={repeat}
                    aria-pressed={draft.repeat === repeat}
                    onClick={() => patch({ repeat })}
                  >
                    {repeat === "daily"
                      ? "매일"
                      : repeat === "weekdays"
                        ? "요일 선택"
                        : "주 N일"}
                  </button>
                ))}
              </div>
              {draft.repeat === "weekdays" && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {WEEKDAY_ORDER.map((day) => (
                    <button
                      type="button"
                      key={day}
                      className="habit-day"
                      aria-pressed={draft.weekdays.includes(day)}
                      onClick={() =>
                        patch({
                          weekdays: draft.weekdays.includes(day)
                            ? draft.weekdays.filter((d) => d !== day)
                            : [...draft.weekdays, day],
                        })
                      }
                    >
                      {WEEKDAY_LABEL[day]}
                    </button>
                  ))}
                </div>
              )}
              {draft.repeat === "weekly" && (
                <label className="habit-field mt-3">
                  한 주에 실천할 날 · 아무 요일에나
                  <input
                    inputMode="numeric"
                    value={draft.weeklyTarget}
                    onChange={(e) => patch({ weeklyTarget: e.target.value })}
                  />
                </label>
              )}
            </fieldset>
            <div className="mt-6 space-y-2">
              {draft.kind !== "check" && (
                <details className="habit-category">
                  <summary>
                    작게 할 때
                    <span className="ml-auto text-sm text-ink-600">
                      {draft.minimum
                        ? `${draft.minimum}${draft.unit}`
                        : "설정 안 함"}
                    </span>
                  </summary>
                  <label className="habit-field p-4">
                    바쁜 날의 작은 기준 (선택)
                    <input
                      inputMode="decimal"
                      value={draft.minimum}
                      onChange={(e) => patch({ minimum: e.target.value })}
                    />
                    <span className="text-sm font-normal text-ink-600">
                      평소 기준보다 작은 값. 비워 두어도 괜찮아요.
                    </span>
                  </label>
                </details>
              )}
              <details className="habit-category">
                <summary>
                  떠올릴 계기
                  <span className="ml-auto text-sm text-ink-600">
                    {draft.cue || "나중에"}
                  </span>
                </summary>
                <label className="habit-field p-4">
                  언제 떠올릴까요? (선택)
                  <input
                    maxLength={120}
                    placeholder="예: 잠자리 준비 후"
                    value={draft.cue}
                    onChange={(e) => patch({ cue: e.target.value })}
                  />
                </label>
              </details>
              <details className="habit-category">
                <summary>
                  목표 연결
                  <span className="ml-auto text-sm text-ink-600">
                    {draft.loopId ? "연결됨" : "나중에"}
                  </span>
                </summary>
                <label className="habit-field p-4">
                  함께 이어갈 목표
                  <select
                    value={draft.loopId}
                    onChange={(e) => patch({ loopId: e.target.value })}
                  >
                    <option value="">연결하지 않기</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </label>
              </details>
            </div>
            <p className="mt-4 text-sm text-ink-600">
              알림은 아직 제공하지 않아요. 알림 없이도 기록할 수 있어요.
            </p>
            <div className="mt-6">{preview}</div>
            {error && (
              <p
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="my-4 text-red-700"
              >
                {error}
              </p>
            )}
            <button
              className="habit-primary mt-4 w-full"
              disabled={saving}
              type="submit"
            >
              {saving ? "저장 중…" : "내 루틴에 추가"}
            </button>
            <p className="mt-3 text-center text-sm text-ink-600">
              추가만으로 실천이 기록되지는 않아요.
            </p>
          </form>
        )
      )}
    </div>
  );
}
