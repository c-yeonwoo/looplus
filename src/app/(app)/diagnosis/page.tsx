import { DiagnosisPanel } from "@/components/panels/DiagnosisPanel";
import { PageHeader } from "@/components/PageHeader";

export default function DiagnosisPage() {
  return (
    <div className="space-y-10">
      <PageHeader icon="diagnosis" title="진단" desc="아는 숫자만 넣어도 됩니다." />
      <DiagnosisPanel />
    </div>
  );
}
