import { GoalLoopDetail } from "@/components/loops/GoalLoopDetail";

export default async function GoalLoopDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;
  return <GoalLoopDetail goalId={goalId} />;
}
