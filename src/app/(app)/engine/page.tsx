import { EngineBuilder } from "@/components/engine/EngineBuilder";

export default function EnginePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-slate-800">⚙️ 재테크 엔진</h1>
        <p className="text-sm text-slate-500">
          팔레트에서 버킷을 끌어다 내 포트폴리오를 조립하세요. 복리 결과가 실시간으로 갱신됩니다.
        </p>
      </header>
      <EngineBuilder />
    </div>
  );
}
