import { GoalsPanel } from "@/components/panels/GoalsPanel";
import { GoalLoopsPanel } from "@/components/loops/GoalLoopsPanel";
import Link from "next/link";
export default function MoneyGoalsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link className="habit-text-button mb-5" href="/tools">
        도구로 돌아가기
      </Link>
      <h1 className="habit-title mb-8">재무 목표와 비전</h1>
      <GoalsPanel />
      <GoalLoopsPanel />
    </div>
  );
}
