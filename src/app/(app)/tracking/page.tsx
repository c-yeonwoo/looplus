import { TrackingPanel } from "@/components/panels/TrackingPanel";
import { PageHeader } from "@/components/PageHeader";

export default function TrackingPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        icon="loop"
        title="작은 루프"
        desc="큰 목표를 밀어 주는 실행을 반복하고, 이번 주 얼마나 굴렸는지 확인하세요."
      />
      <TrackingPanel />
    </div>
  );
}
