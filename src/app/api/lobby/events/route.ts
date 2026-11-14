import { auth } from "@/auth";
import { isAppRole } from "@/lib/auth/roles";
import { subscribeLobby } from "@/lib/lobby/bus";
import { lobbyReadDecision } from "@/lib/lobby/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isAppRole(role) || lobbyReadDecision(role) !== "allow") {
    return new Response(JSON.stringify({ error: "Non autorizzato" }), {
      status: role ? 403 : 401,
      headers: { "content-type": "application/json" },
    });
  }

  const coachUserId = session.user.id;
  const encoder = new TextEncoder();
  let close = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(`: ${" ".repeat(2048)}\n${chunk}`));
        } catch {
          close();
        }
      };
      send(`event: ready\ndata: {}\n\n`);
      const unsubscribe = subscribeLobby(coachUserId, (event) => {
        send(`event: live\ndata: ${JSON.stringify(event)}\n\n`);
      });
      const timer = setInterval(() => send(`: heartbeat\n\n`), 15_000);
      close = () => {
        clearInterval(timer);
        unsubscribe();
      };
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
