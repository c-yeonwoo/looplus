import { GoalsPanel } from "@/components/panels/GoalsPanel";

export default function GoalsPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-slate-800">🎯 목표 · 비전</h1>
        <p className="text-sm text-slate-500">
          미래의 나(도달점)를 그려요. 이 목표가 엔진의 목표선 · 달성률 · ETA 기준이 됩니다.
        </p>
      </header>
      <GoalsPanel />
    </div>
  );
}
