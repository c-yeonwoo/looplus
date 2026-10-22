import { redirect } from "next/navigation";

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ loop?: string; review?: string }>;
}) {
  const { loop, review } = await searchParams;
  if (review) {
    const params = new URLSearchParams({ review });
    if (loop) params.set("loop", loop);
    redirect(`/tools/routines?${params.toString()}#legacy-routines`);
  }
  redirect(loop ? `/home?loop=${encodeURIComponent(loop)}` : "/home");
}
