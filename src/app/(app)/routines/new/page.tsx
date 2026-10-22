import { HabitCreate } from "@/components/habits/HabitCreate";
export default async function NewRoutinePage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const params = await searchParams;
  return (
    <HabitCreate goalId={typeof params.goal === "string" ? params.goal : ""} />
  );
}
