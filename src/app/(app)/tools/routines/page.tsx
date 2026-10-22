import { TrackingPanel } from "@/components/panels/TrackingPanel";
import Link from "next/link";
import { HabitManage } from "@/components/habits/HabitManage";
export default function LegacyRoutinesPage() {
  return (
    <>
      <Link className="habit-text-button mb-5" href="/tools">
        도구로 돌아가기
      </Link>
      <h1 className="habit-title mb-8">루틴 관리</h1>
      <HabitManage />
      <section id="legacy-routines">
        <h2 className="habit-heading mb-4">기존 체크형 루틴</h2>
        <p className="mb-5 text-sm text-ink-600">
          금융 도구에서 사용하던 체크형 루틴을 관리해요. 새 일상 루틴은 위
          목록에서 관리해 주세요.
        </p>
        <TrackingPanel />
      </section>
    </>
  );
}
