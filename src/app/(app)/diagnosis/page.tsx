import { DiagnosisPanel } from "@/components/panels/DiagnosisPanel";

export default function DiagnosisPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-slate-800">📊 현재 진단</h1>
        <p className="text-sm text-slate-500">
          최소 입력 · 즉시 결과. 8단계 중 내 위치와 다음 한 걸음을 확인하세요.
        </p>
      </header>
      <DiagnosisPanel />
    </div>
  );
}
