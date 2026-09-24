import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];

    if (!raw.startsWith("--")) {
      continue;
    }

    const key = raw.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isSemver(value) {
  return /^\d+\.\d+\.\d+$/.test(value.trim());
}

const args = parseArgs(process.argv.slice(2));
const platform = args.platform;
const otaVersion = args["ota-version"];

if (platform !== "ios" && platform !== "android") {
  console.error(
    "Usage: node scripts/ota/build-nitro-ota.mjs --platform <ios|android> --ota-version <version> [--output-dir <dir>] [--target-app-version <x.y.z>] [--release-notes <text>]"
  );
  process.exit(1);
}

if (!otaVersion || otaVersion.trim().length === 0) {
  console.error("Missing required --ota-version");
  process.exit(1);
}

const projectRoot = process.cwd();
const appConfigPath = resolve(projectRoot, "app.json");
const appConfig = readJson(appConfigPath);
// Target the exact binary ("<version>+<build>") so a bundle built for one native
// build is never applied to another. Must match getBinaryTargetVersion() in lib/nitro-ota.ts.
function resolveBinaryTargetVersion() {
  const version = String(appConfig?.expo?.version ?? "1.0.0");
  const build =
    platform === "android"
      ? appConfig?.expo?.android?.versionCode
      : appConfig?.expo?.ios?.buildNumber;
  const trimmedBuild = build === undefined || build === null ? "" : String(build).trim();
  return trimmedBuild ? `${version}+${trimmedBuild}` : version;
}

const appVersion =
  typeof args["target-app-version"] === "string" &&
  args["target-app-version"].trim().length > 0
    ? args["target-app-version"].trim()
    : resolveBinaryTargetVersion();

const outputDir = resolve(
  projectRoot,
  args["output-dir"] || `.artifacts/nitro-ota/${platform}`
);
// Nitro OTA Android loader expects the JS bundle at the snapshot root (or one folder deep in the GitHub zip).
// Keep the bundle and exported assets at the OTA snapshot root so the GitHub branch ZIP layout stays compatible.
const bundleDir = outputDir;
const bundleName =
  platform === "ios" ? "main.jsbundle" : "index.android.bundle";
const bundleOutput = resolve(bundleDir, bundleName);
const releaseNotes =
  typeof args["release-notes"] === "string" ? args["release-notes"].trim() : "";

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });

const expoCliPath = require.resolve("expo/bin/cli");
const expoArgs = [
  expoCliPath,
  "export:embed",
  "--platform",
  platform,
  "--dev",
  "false",
  "--bundle-output",
  bundleOutput,
  "--assets-dest",
  bundleDir,
];

console.log(`Building Nitro OTA bundle (${platform})...`);
const bundleResult = spawnSync(process.execPath, expoArgs, {
  cwd: projectRoot,
  stdio: "inherit",
  // Inlined into the bundle so the app knows which OTA version its JS is.
  env: { ...process.env, EXPO_PUBLIC_BUNDLED_OTA_VERSION: otaVersion.trim() },
});

if (bundleResult.status !== 0) {
  process.exit(bundleResult.status ?? 1);
}

if (!existsSync(bundleOutput)) {
  console.error(`Expected OTA bundle was not generated at: ${bundleOutput}`);
  process.exit(1);
}

const versionManifest = {
  version: otaVersion.trim(),
  isSemver: isSemver(otaVersion),
  targetVersions: {
    [platform]: [appVersion],
  },
  ...(releaseNotes ? { releaseNotes } : {}),
};

writeFileSync(
  resolve(outputDir, "ota.version"),
  `${otaVersion.trim()}\n`,
  "utf8"
);
writeJson(resolve(outputDir, "ota.version.json"), versionManifest);
writeJson(resolve(outputDir, "ota.meta.json"), {
  platform,
  appVersion,
  otaVersion: otaVersion.trim(),
  bundleName,
  generatedAt: new Date().toISOString(),
});

console.log(`Nitro OTA bundle generated at: ${outputDir}`);
console.log(`- Bundle: ${bundleOutput}`);
console.log(`- Version file: ${resolve(outputDir, "ota.version.json")}`);
console.log(`- Target app version (${platform}): ${appVersion}`);
