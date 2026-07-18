import { TrackingPanel } from "@/components/panels/TrackingPanel";
import { PageHeader } from "@/components/PageHeader";

export default function TrackingPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        icon="check-circle"
        title="실천"
        desc="다음 한 걸음을 실천으로 옮기고, 매주 점검하며 습관을 이어가세요."
      />
      <TrackingPanel />
    </div>
  );
}
