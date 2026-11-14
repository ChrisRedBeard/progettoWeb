import bcrypt from "bcryptjs";
import { PrismaClient, type AnalysisType, type Visibility } from "@prisma/client";
import { refuseProductionSeed } from "./seed-guard";

refuseProductionSeed(process.env.NODE_ENV);

const prisma = new PrismaClient();

const password = "Password123!";

const catalog: Array<{
  title: string;
  description: string;
  analysisKey: string;
  defaultSets: number;
  defaultReps: number;
  defaultTempo: string | null;
  defaultRestSeconds: number;
  visibility: Visibility;
  analysisType: AnalysisType;
}> = [
  {
    title: "Squat",
    description: "Piedi alla larghezza delle spalle, schiena neutra, ginocchia in linea con le punte dei piedi.",
    analysisKey: "squat",
    defaultSets: 3,
    defaultReps: 12,
    defaultTempo: "3-1-2-0",
    defaultRestSeconds: 60,
    visibility: "PUBLIC",
    analysisType: "CATALOG",
  },
  {
    title: "Push-up",
    description: "Corpo allineato, gomiti a circa 45 gradi, petto che scende verso il pavimento.",
    analysisKey: "pushup",
    defaultSets: 3,
    defaultReps: 10,
    defaultTempo: "2-1-2-0",
    defaultRestSeconds: 60,
    visibility: "PUBLIC",
    analysisType: "CATALOG",
  },
  {
    title: "Plank",
    description: "Corpo in linea dai talloni alle spalle. Le ripetizioni indicano i secondi di tenuta.",
    analysisKey: "plank",
    defaultSets: 3,
    defaultReps: 30,
    defaultTempo: null,
    defaultRestSeconds: 45,
    visibility: "PUBLIC",
    analysisType: "CATALOG",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  const coach = await prisma.user.upsert({
    where: { email: "martina.greco@fitai.local" },
    update: { name: "Martina Greco", role: "COACH", passwordHash },
    create: { email: "martina.greco@fitai.local", name: "Martina Greco", role: "COACH", passwordHash },
  });

  const profile = await prisma.coachProfile.upsert({
    where: { userId: coach.id },
    update: {},
    create: { userId: coach.id, bio: "Coach di esempio per lo sviluppo." },
  });

  const lobby = await prisma.lobby.upsert({
    where: { coachId: profile.id },
    update: { name: "Lobby di Martina" },
    create: { coachId: profile.id, name: "Lobby di Martina" },
  });

  const giulia = await prisma.user.upsert({
    where: { email: "giulia.bianchi@fitai.local" },
    update: { name: "Giulia Bianchi", role: "ATHLETE", passwordHash },
    create: { email: "giulia.bianchi@fitai.local", name: "Giulia Bianchi", role: "ATHLETE", passwordHash },
  });

  await prisma.user.upsert({
    where: { email: "marco.rossi@fitai.local" },
    update: { name: "Marco Rossi", role: "ATHLETE", passwordHash },
    create: { email: "marco.rossi@fitai.local", name: "Marco Rossi", role: "ATHLETE", passwordHash },
  });

  await prisma.membership.upsert({
    where: { athleteId: giulia.id },
    update: { lobbyId: lobby.id },
    create: { athleteId: giulia.id, lobbyId: lobby.id },
  });

  const exercises = [];
  for (const item of catalog) {
    const existing = await prisma.exercise.findFirst({
      where: { analysisKey: item.analysisKey, coachId: null, visibility: "PUBLIC" },
    });
    const exercise = existing
      ? await prisma.exercise.update({ where: { id: existing.id }, data: item })
      : await prisma.exercise.create({ data: item });
    exercises.push(exercise);
  }

  const workout = await prisma.workout.upsert({
    where: { id: "seed_full_body_week_1" },
    update: { title: "Full body · Settimana 1", coachId: profile.id },
    create: { id: "seed_full_body_week_1", title: "Full body · Settimana 1", coachId: profile.id },
  });

  for (const [index, exercise] of exercises.entries()) {
    await prisma.workoutExercise.upsert({
      where: { workoutId_position: { workoutId: workout.id, position: index + 1 } },
      update: { exerciseId: exercise.id },
      create: { workoutId: workout.id, exerciseId: exercise.id, position: index + 1 },
    });
  }

  const stretch = await prisma.exercise.upsert({
    where: { id: "seed_none_stretch" },
    update: {
      coachId: profile.id,
      title: "Stretching collo",
      description: "Movimento lento. L'atleta conta le ripetizioni: questo esercizio non viene analizzato.",
      visibility: "PRIVATE",
      analysisType: "NONE",
      analysisKey: null,
      defaultSets: 2,
      defaultReps: 8,
      defaultTempo: null,
      defaultRestSeconds: 30,
      archivedAt: null,
    },
    create: {
      id: "seed_none_stretch",
      coachId: profile.id,
      title: "Stretching collo",
      description: "Movimento lento. L'atleta conta le ripetizioni: questo esercizio non viene analizzato.",
      visibility: "PRIVATE",
      analysisType: "NONE",
      analysisKey: null,
      defaultSets: 2,
      defaultReps: 8,
      defaultRestSeconds: 30,
    },
  });

  for (const kind of ["EXPLANATION", "EXECUTION"] as const) {
    await prisma.exerciseVideo.upsert({
      where: { exerciseId_kind: { exerciseId: stretch.id, kind } },
      update: { storageKey: `placeholder://${kind.toLowerCase()}` },
      create: { exerciseId: stretch.id, kind, storageKey: `placeholder://${kind.toLowerCase()}` },
    });
  }

  await prisma.workoutExercise.upsert({
    where: { workoutId_position: { workoutId: workout.id, position: 4 } },
    update: { exerciseId: stretch.id },
    create: { workoutId: workout.id, exerciseId: stretch.id, position: 4 },
  });

  const existingAssignment = await prisma.workoutAssignment.findFirst({
    where: { workoutId: workout.id, athleteId: giulia.id },
  });
  if (existingAssignment) {
    await prisma.workoutAssignment.update({
      where: { id: existingAssignment.id },
      data: { active: true },
    });
  } else {
    await prisma.workoutAssignment.create({
      data: { workoutId: workout.id, athleteId: giulia.id, active: true },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
