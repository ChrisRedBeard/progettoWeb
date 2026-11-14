import { requireRole } from "@/lib/auth/current-user";
import { LobbyBoard } from "@/components/lobby/lobby-board";
import { loadRoster } from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";

export default async function LobbyPage() {
  const user = await requireRole("COACH");
  const [profile, athletes] = await Promise.all([
    prisma.coachProfile.findUnique({ where: { userId: user.id }, include: { lobby: true } }),
    loadRoster(user.id),
  ]);

  if (!profile?.lobby || !athletes) {
    return (
      <section>
        <h1 className="text-3xl font-extrabold">Lobby non disponibile</h1>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold tracking-tight">{profile.lobby.name}</h1>
      <p className="mt-3 text-lg text-muted">
        Vedi solo i tuoi atleti. Lo stato arriva dall'avviso e, se quello manca, da un aggiornamento ogni 30 secondi.
      </p>
      <LobbyBoard initial={athletes} />
    </section>
  );
}
