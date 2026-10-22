import { TodayPanel } from "@/components/habits/TodayPanel";
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; loop?: string }>;
}) {
  const params = await searchParams;
  return (
    <TodayPanel
      added={typeof params.added === "string" ? params.added : ""}
      loopId={typeof params.loop === "string" ? params.loop : ""}
    />
  );
}
