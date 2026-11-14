import Link from "next/link";
import { auth } from "@/auth";
import { AcceptInvite } from "@/components/lobby/accept-invite";
import { isAppRole } from "@/lib/auth/roles";
import { inspectInvite } from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";

const messages = {
  not_found: "Questo invito non esiste.",
  expired: "Questo invito è scaduto.",
  revoked: "Questo invito è stato revocato.",
  used: "Questo invito è già stato usato.",
  email: "Questo invito è legato a un'altra email.",
} as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const role = session?.user?.role;
  const account = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } })
    : null;
  const inspection = await inspectInvite(token, account?.email ?? null);
  const callback = `/invite/${token}`;

  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-line bg-panel p-6">
      <h1 className="text-3xl font-extrabold">Invito alla lobby</h1>
      {inspection.view !== "valid" ? (
        <p className="mt-4 text-lg leading-7">{messages[inspection.view]}</p>
      ) : !session?.user?.id || !isAppRole(role) ? (
        <LoggedOut callback={callback} coachName={inspection.coachName} />
      ) : role !== "ATHLETE" ? (
        <p className="mt-4 text-lg leading-7">Questo invito è per un atleta.</p>
      ) : (
        <AthleteInvite token={token} athleteId={session.user.id} lobbyId={inspection.lobbyId} coachName={inspection.coachName} />
      )}
    </section>
  );
}

function LoggedOut({ callback, coachName }: { callback: string; coachName: string | null }) {
  const login = `/login?callbackUrl=${encodeURIComponent(callback)}`;
  const register = `/register?callbackUrl=${encodeURIComponent(callback)}`;
  return (
    <div className="mt-4">
      <p className="text-lg leading-7">
        {coachName ? `${coachName} ti invita in lobby.` : "Hai un invito valido."} Entra o registrati per accettarlo.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Link href={login} className="flex min-h-14 items-center justify-center rounded-2xl bg-accent text-lg font-extrabold text-white">
          Entra
        </Link>
        <Link href={register} className="flex min-h-14 items-center justify-center rounded-2xl border border-line text-lg font-bold">
          Registrati
        </Link>
      </div>
    </div>
  );
}

async function AthleteInvite({
  token,
  athleteId,
  lobbyId,
  coachName,
}: {
  token: string;
  athleteId: string;
  lobbyId: string | null;
  coachName: string | null;
}) {
  const membership = await prisma.membership.findUnique({
    where: { athleteId },
    include: { lobby: { include: { coach: { include: { user: { select: { name: true } } } } } } },
  });
  if (membership && membership.lobbyId === lobbyId) {
    return <p className="mt-4 text-lg">Sei già nella lobby di {coachName ?? "questo coach"}.</p>;
  }
  if (membership) {
    return (
      <div className="mt-4">
        <p className="text-lg leading-7">
          Sei già seguito da {membership.lobby.coach.user.name}. Per entrare da {coachName ?? "un altro coach"} devi lasciare il coach attuale.
        </p>
        <div className="mt-5">
          <AcceptInvite token={token} confirmLeave />
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4">
      <p className="text-lg leading-7">{coachName ?? "Un coach"} ti invita in lobby.</p>
      <div className="mt-5">
        <AcceptInvite token={token} confirmLeave={false} />
      </div>
    </div>
  );
}
