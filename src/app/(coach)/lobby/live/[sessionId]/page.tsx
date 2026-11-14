import { LiveSession } from "@/components/lobby/live-session";

export default async function LiveSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <LiveSession sessionId={sessionId} />;
}
