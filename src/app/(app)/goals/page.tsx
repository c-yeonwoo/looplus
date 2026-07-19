import { GoalsPanel } from "@/components/panels/GoalsPanel";
import { PageHeader } from "@/components/PageHeader";

export default function GoalsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        icon="target"
        title="목표 · 비전"
        desc="어디까지 가고 싶은지 적어 두세요. 설계 화면의 목표선으로 쓰입니다."
      />
      <GoalsPanel />
    </div>
  );
}
