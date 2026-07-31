function parseEnvFile(text: string): Record<string, string> {
  return Object.fromEntries(
    text.split(/\r?\n/).flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return [];
      const separator = trimmed.indexOf("=");
      if (separator < 1) return [];
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^("|')|("|')$/g, "");
      return [[key, value]];
    }),
  );
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\\"'\\\"'")}'`;
}

const deployEnvFile = Bun.file(".env.deploy");
const fileEnv = (await deployEnvFile.exists())
  ? parseEnvFile(await deployEnvFile.text())
  : {};
const config = { ...fileEnv, ...Bun.env };
const host = config.DEPLOY_HOST;
const path = config.DEPLOY_PATH;
const healthUrl = config.DEPLOY_HEALTH_URL;

if (!host || !path) {
  console.error("Set DEPLOY_HOST and DEPLOY_PATH in .env.deploy or the environment.");
  process.exit(1);
}
if (host.startsWith("-")) {
  console.error("DEPLOY_HOST must be an SSH host name or destination.");
  process.exit(1);
}

const commands = [
  "set -eu",
  `cd ${shellQuote(path)}`,
  "git pull --ff-only",
  "docker compose up -d --build",
  "docker compose ps",
  healthUrl ? `curl --fail --silent --show-error ${shellQuote(healthUrl)} >/dev/null` : "",
].filter(Boolean).join("; ");

console.log(`Deploying to ${host}...`);
const deploy = Bun.spawn(["ssh", host, commands], { stdout: "inherit", stderr: "inherit" });
const exitCode = await deploy.exited;
process.exit(exitCode);
