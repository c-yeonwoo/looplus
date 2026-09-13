import { GoalsPanel } from "@/components/panels/GoalsPanel";
import { GoalLoopsPanel } from "@/components/loops/GoalLoopsPanel";
import { PageHeader } from "@/components/PageHeader";

export default function GoalsPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        icon="loop"
        title="큰 루프"
        desc="큰 목표를 숫자로 보고, 작은 실행을 반복해 하나씩 완성하세요."
      />
      <GoalsPanel />
      <GoalLoopsPanel />
    </div>
  );
}
