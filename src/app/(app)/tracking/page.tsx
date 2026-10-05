import { TrackingPanel } from "@/components/panels/TrackingPanel";
import { PageHeader } from "@/components/PageHeader";

export default function TrackingPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        icon="loop"
        title="루틴"
        desc="마일스톤을 향해 반복할 행동을 정하고, 이번 주 실천을 돌아보세요."
      />
      <TrackingPanel />
    </div>
  );
}
