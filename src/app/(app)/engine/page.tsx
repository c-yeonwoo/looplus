import { EngineBuilder } from "@/components/engine/EngineBuilder";
import { PageHeader } from "@/components/PageHeader";

export default function EnginePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        icon="engine"
        title="자산 설계"
        desc="돈을 어디에 나눌지 정하면, 몇 년 뒤 자산이 어떻게 되는지 바로 보여줍니다."
      />
      <EngineBuilder />
    </div>
  );
}
