import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data", "postgres");
const port = "5433";
const dbUser = "fitai";
const password = "fitai_local_dev";
const database = "fitai";
const binDir = "C:\\Program Files\\PostgreSQL\\18\\bin";

function bin(name: string) {
  return path.join(binDir, name);
}

function run(command: string, args: string[], extraEnv?: Record<string, string>) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const action = process.argv[2] ?? "up";

if (!existsSync(bin("pg_ctl.exe"))) {
  console.error(`PostgreSQL 18 non trovato in ${binDir}.`);
  process.exit(1);
}

if (action === "down") {
  run(bin("pg_ctl.exe"), ["-D", dataDir, "stop"]);
  process.exit(0);
}

if (action !== "up") {
  console.error("Uso: tsx scripts/postgres.ts [up|down]");
  process.exit(1);
}

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  mkdirSync(dataDir, { recursive: true });
  const passwordFile = path.join(root, "data", ".pgpw");
  writeFileSync(passwordFile, password, "utf8");
  run(bin("initdb.exe"), [
    "-D",
    dataDir,
    "-U",
    dbUser,
    "--pwfile",
    passwordFile,
    "-A",
    "scram-sha-256",
    "--encoding",
    "UTF8",
    "--locale-provider",
    "builtin",
    "--builtin-locale",
    "C",
  ]);
  rmSync(passwordFile, { force: true });
}

const status = spawnSync(bin("pg_ctl.exe"), ["-D", dataDir, "status"], { stdio: "ignore" });
if (status.status !== 0) {
  run(bin("pg_ctl.exe"), [
    "-D",
    dataDir,
    "-l",
    path.join(dataDir, "server.log"),
    "-o",
    `-p ${port}`,
    "start",
  ]);
}

const env = { PGPASSWORD: password };
const existing = spawnSync(
  bin("psql.exe"),
  ["-h", "localhost", "-p", port, "-U", dbUser, "-d", "postgres", "-tAc", `SELECT 1 FROM pg_database WHERE datname='${database}'`],
  { env: { ...process.env, ...env }, encoding: "utf8" },
);

if (existing.status !== 0) {
  process.exit(existing.status ?? 1);
}

if (!existing.stdout.includes("1")) {
  run(
    bin("psql.exe"),
    ["-h", "localhost", "-p", port, "-U", dbUser, "-d", "postgres", "-c", `CREATE DATABASE ${database}`],
    env,
  );
}

console.log(`PostgreSQL locale pronto su localhost:${port}, database ${database}.`);
