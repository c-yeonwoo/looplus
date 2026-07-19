import { GoalsPanel } from "@/components/panels/GoalsPanel";
import { PageHeader } from "@/components/PageHeader";

export default function GoalsPage() {
  return (
    <div className="space-y-10">
      <PageHeader icon="target" title="목표" desc="어디까지 가고 싶은지, 대략만 적어도 돼요." />
      <GoalsPanel />
    </div>
  );
}
