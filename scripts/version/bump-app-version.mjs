import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function parseSemver(input) {
  const match = input.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

function formatSemver(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function nextSemver(current, mode) {
  const parsed = parseSemver(current);

  if (!parsed) {
    throw new Error(`Current version is not semver: ${current}`);
  }

  if (mode === "major") {
    return formatSemver({ major: parsed.major + 1, minor: 0, patch: 0 });
  }

  if (mode === "minor") {
    return formatSemver({
      major: parsed.major,
      minor: parsed.minor + 1,
      patch: 0,
    });
  }

  return formatSemver({
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch + 1,
  });
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const rawArg = process.argv[2]?.trim();
const mode = rawArg || "patch";

const projectRoot = process.cwd();
const packageJsonPath = resolve(projectRoot, "package.json");
const appJsonPath = resolve(projectRoot, "app.json");

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const appJson = JSON.parse(readFileSync(appJsonPath, "utf8"));

const currentVersion = String(
  packageJson.version ?? appJson?.expo?.version ?? "1.0.0"
);
const isIncrementMode =
  mode === "patch" || mode === "minor" || mode === "major";

if (!parseSemver(mode) && !isIncrementMode) {
  console.error(
    "Usage: node scripts/version/bump-app-version.mjs [patch|minor|major|x.y.z]"
  );
  process.exit(1);
}

const targetVersion = parseSemver(mode)
  ? mode
  : nextSemver(currentVersion, mode);

if (!parseSemver(targetVersion)) {
  console.error(
    "Usage: node scripts/version/bump-app-version.mjs [patch|minor|major|x.y.z]"
  );
  process.exit(1);
}

const currentAndroidVersionCode = Number(
  appJson?.expo?.android?.versionCode ?? 0
);
const currentIosBuildNumber = Number.parseInt(
  String(appJson?.expo?.ios?.buildNumber ?? "0"),
  10
);

packageJson.version = targetVersion;
appJson.expo.version = targetVersion;
appJson.expo.android = {
  ...(appJson.expo.android ?? {}),
  versionCode: Number.isFinite(currentAndroidVersionCode)
    ? currentAndroidVersionCode + 1
    : 1,
};
appJson.expo.ios = {
  ...(appJson.expo.ios ?? {}),
  buildNumber: String(
    Number.isFinite(currentIosBuildNumber) ? currentIosBuildNumber + 1 : 1
  ),
};

writeJson(packageJsonPath, packageJson);
writeJson(appJsonPath, appJson);

console.log(`Updated app version: ${currentVersion} -> ${targetVersion}`);
console.log(
  `Android versionCode: ${currentAndroidVersionCode || 0} -> ${
    appJson.expo.android.versionCode
  }`
);
console.log(
  `iOS buildNumber: ${
    Number.isFinite(currentIosBuildNumber) ? currentIosBuildNumber : 0
  } -> ${appJson.expo.ios.buildNumber}`
);
