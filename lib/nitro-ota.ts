import Constants from "expo-constants";
import { Platform } from "react-native";

type NitroOtaModule = typeof import("react-native-nitro-ota");
type NativePlatform = "ios" | "android";

type OtaManagerInstance = InstanceType<NitroOtaModule["OTAUpdateManager"]>;

type RawCheckResult = Awaited<
  ReturnType<OtaManagerInstance["checkForUpdatesJS"]>
>;

type AppExtraNitroOta = {
  githubUrl?: string;
  versionPath?: string;
  refs?: {
    ios?: string;
    android?: string;
  };
};

export type NitroOtaSnapshot = {
  enabled: boolean;
  disabledReason: string | null;
  platform: string;
  binaryAppVersion: string;
  githubUrl: string | null;
  ref: string | null;
  versionPath: string | null;
  versionUrl: string | null;
  downloadUrl: string | null;
  currentOtaVersion: string | null;
  currentBundlePath: string | null;
};

export type NitroOtaUpdateCheck = NonNullable<RawCheckResult>;

export type NitroOtaRollbackRecord = Parameters<
  NonNullable<NitroOtaModule["onRollback"]>
>[0] extends (record: infer T) => void
  ? T
  : never;

const DEFAULT_GITHUB_URL = "https://github.com/ayushneekhar/Apex";
const DEFAULT_VERSION_PATH = "ota.version.json";
const DEFAULT_REFS: Record<NativePlatform, string> = {
  ios: "nitro-ota-ios-production",
  android: "nitro-ota-android-production",
};

let cachedNitroOtaModule: NitroOtaModule | null | undefined;

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getAppExtraNitroOta(): AppExtraNitroOta {
  const extra = Constants.expoConfig?.extra as
    | { nitroOta?: AppExtraNitroOta }
    | undefined;
  return extra?.nitroOta ?? {};
}

function getNativePlatform(): NativePlatform | null {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    return Platform.OS;
  }

  return null;
}

export function getBinaryAppVersion(): string {
  const version = toTrimmedString(Constants.expoConfig?.version);
  return version ?? "1.0.0";
}

function getRuntimeConfig() {
  const platform = getNativePlatform();

  if (!platform) {
    return {
      enabled: false as const,
      platform: Platform.OS,
      disabledReason: "Nitro OTA is only supported on iOS and Android.",
    };
  }

  const appExtra = getAppExtraNitroOta();
  const githubUrl =
    toTrimmedString(process.env.EXPO_PUBLIC_NITRO_OTA_GITHUB_URL) ??
    toTrimmedString(appExtra.githubUrl) ??
    DEFAULT_GITHUB_URL;

  const versionPath =
    toTrimmedString(process.env.EXPO_PUBLIC_NITRO_OTA_VERSION_PATH) ??
    toTrimmedString(appExtra.versionPath) ??
    DEFAULT_VERSION_PATH;

  const ref =
    toTrimmedString(
      platform === "ios"
        ? process.env.EXPO_PUBLIC_NITRO_OTA_IOS_REF
        : process.env.EXPO_PUBLIC_NITRO_OTA_ANDROID_REF
    ) ??
    toTrimmedString(
      platform === "ios" ? appExtra.refs?.ios : appExtra.refs?.android
    ) ??
    DEFAULT_REFS[platform];

  if (!githubUrl) {
    return {
      enabled: false as const,
      platform,
      disabledReason: "Missing Nitro OTA GitHub repository URL.",
    };
  }

  if (!ref) {
    return {
      enabled: false as const,
      platform,
      disabledReason: `Missing Nitro OTA branch for ${platform}.`,
    };
  }

  return {
    enabled: true as const,
    platform,
    githubUrl,
    versionPath,
    ref,
  };
}

function getNitroOtaModule(): NitroOtaModule | null {
  if (cachedNitroOtaModule !== undefined) {
    return cachedNitroOtaModule;
  }

  const platform = getNativePlatform();
  if (!platform) {
    cachedNitroOtaModule = null;
    return cachedNitroOtaModule;
  }

  try {
    cachedNitroOtaModule = require("react-native-nitro-ota") as NitroOtaModule;
  } catch {
    cachedNitroOtaModule = null;
  }

  return cachedNitroOtaModule;
}

function createOtaManager(): {
  module: NitroOtaModule;
  manager: OtaManagerInstance;
  urls: { downloadUrl: string; versionUrl: string };
  config: Extract<ReturnType<typeof getRuntimeConfig>, { enabled: true }>;
} | null {
  const config = getRuntimeConfig();
  if (!config.enabled) {
    return null;
  }

  const module = getNitroOtaModule();
  if (!module) {
    return null;
  }

  try {
    const urls = module.githubOTA({
      githubUrl: config.githubUrl,
      otaVersionPath: config.versionPath,
      ref: config.ref,
    });
    const manager = new module.OTAUpdateManager(
      urls.downloadUrl,
      urls.versionUrl
    );
    return { module, manager, urls, config };
  } catch {
    return null;
  }
}

export function getNitroOtaSnapshot(): NitroOtaSnapshot {
  const binaryAppVersion = getBinaryAppVersion();
  const config = getRuntimeConfig();

  if (!config.enabled) {
    return {
      enabled: false,
      disabledReason: config.disabledReason,
      platform: config.platform,
      binaryAppVersion,
      githubUrl: null,
      ref: null,
      versionPath: null,
      versionUrl: null,
      downloadUrl: null,
      currentOtaVersion: null,
      currentBundlePath: null,
    };
  }

  const context = createOtaManager();

  if (!context) {
    return {
      enabled: false,
      disabledReason:
        "Nitro OTA native module is unavailable. Rebuild the app after installing and running pods.",
      platform: config.platform,
      binaryAppVersion,
      githubUrl: config.githubUrl,
      ref: config.ref,
      versionPath: config.versionPath,
      versionUrl: null,
      downloadUrl: null,
      currentOtaVersion: null,
      currentBundlePath: null,
    };
  }

  return {
    enabled: true,
    disabledReason: null,
    platform: config.platform,
    binaryAppVersion,
    githubUrl: config.githubUrl,
    ref: config.ref,
    versionPath: config.versionPath,
    versionUrl: context.urls.versionUrl,
    downloadUrl: context.urls.downloadUrl,
    currentOtaVersion: context.manager.getVersion(),
    currentBundlePath: context.manager.getUnzippedPath(),
  };
}

export async function checkNitroOtaForUpdates(): Promise<NitroOtaUpdateCheck | null> {
  const context = createOtaManager();
  if (!context) {
    return null;
  }

  return context.manager.checkForUpdatesJS(getBinaryAppVersion());
}

export async function downloadNitroOtaUpdate(
  onProgress?: (received: number, total: number) => void
): Promise<string | null> {
  const context = createOtaManager();
  if (!context) {
    return null;
  }

  return context.manager.downloadUpdate(onProgress);
}

export function reloadNitroOtaApp(): boolean {
  const context = createOtaManager();
  if (!context) {
    return false;
  }

  context.manager.reloadApp();
  return true;
}

export async function rollbackNitroOtaToPreviousBundle(): Promise<boolean> {
  const context = createOtaManager();
  if (!context) {
    return false;
  }

  return context.manager.rollback();
}

export function confirmNitroOtaBundleIfAvailable(): boolean {
  const context = createOtaManager();
  if (!context) {
    return false;
  }

  if (!context.manager.getVersion()) {
    return false;
  }

  context.manager.confirm();
  return true;
}

export function subscribeNitroOtaRollbacks(
  callback: (record: NitroOtaRollbackRecord) => void
): () => void {
  const module = getNitroOtaModule();
  if (!module) {
    return () => {};
  }

  return module.onRollback(callback);
}
