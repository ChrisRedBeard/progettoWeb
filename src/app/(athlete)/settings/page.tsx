import { requireRole } from "@/lib/auth/current-user";
import { AthleteSettings } from "@/components/settings/athlete-settings";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await requireRole("ATHLETE");
  const membership = await prisma.membership.findUnique({
    where: { athleteId: user.id },
    include: { lobby: { include: { coach: { include: { user: { select: { name: true } } } } } } },
  });

  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight">Impostazioni</h1>
      <AthleteSettings
        hasCoach={Boolean(membership)}
        coachName={membership?.lobby.coach.user.name ?? null}
        privateLive={membership?.privateLive ?? false}
      />
    </section>
  );
}
