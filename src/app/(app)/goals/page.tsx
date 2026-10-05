import { GoalsPanel } from "@/components/panels/GoalsPanel";
import { GoalLoopsPanel } from "@/components/loops/GoalLoopsPanel";
import { PageHeader } from "@/components/PageHeader";

export default function GoalsPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        icon="loop"
        title="마일스톤"
        desc="완성하고 싶은 목표를 정하고, 루틴을 쌓아 하나씩 도달하세요."
      />
      <GoalsPanel />
      <GoalLoopsPanel />
    </div>
  );
}
