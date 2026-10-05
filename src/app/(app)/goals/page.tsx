import { GoalsPanel } from "@/components/panels/GoalsPanel";
import { GoalLoopsPanel } from "@/components/loops/GoalLoopsPanel";
import { PageHeader } from "@/components/PageHeader";

export default function GoalsPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        icon="loop"
        title="목표 로드맵"
        desc="원하는 미래를 정하고, 그곳까지의 마일스톤과 루틴을 연결하세요."
      />
      <GoalsPanel />
      <GoalLoopsPanel />
    </div>
  );
}
