import { requireRole } from "@/lib/auth/current-user";
import { InviteCreator } from "@/components/lobby/invite-creator";
import { RevokeInviteButton } from "@/components/lobby/revoke-invite";
import { listLobbyInvites } from "@/lib/lobby/service";

const labels = {
  PENDING: "In attesa",
  ACCEPTED: "Accettato",
  REVOKED: "Revocato",
  EXPIRED: "Scaduto",
} as const;

export default async function InvitesPage() {
  const user = await requireRole("COACH");
  const invites = await listLobbyInvites(user.id);

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold tracking-tight">Inviti</h1>
      <p className="mt-3 text-lg text-muted">Il token resta visibile solo al momento della creazione. Nel database c&apos;è soltanto l&apos;hash.</p>
      <div className="mt-6">
        <InviteCreator />
      </div>
      {!invites ? (
        <p className="mt-6 text-lg">Lobby non disponibile.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {invites.length === 0 ? <li className="text-lg text-muted">Nessun invito.</li> : null}
          {invites.map((invite) => (
            <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4">
              <div>
                <p className="text-lg font-extrabold">{labels[invite.status]}</p>
                <p className="text-base text-muted">{invite.email ?? "Qualsiasi atleta"}</p>
                <p className="text-sm text-muted">Scade il {formatWhen(invite.expiresAt)}</p>
              </div>
              {invite.status === "PENDING" || invite.status === "EXPIRED" ? <RevokeInviteButton inviteId={invite.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatWhen(value: Date) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
