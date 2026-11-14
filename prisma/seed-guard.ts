export function refuseProductionSeed(env: string | undefined) {
  if (env === "production") {
    console.error("Seed rifiutato: NODE_ENV=production.");
    process.exit(1);
  }
}
