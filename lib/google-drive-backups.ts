import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { exportDatabaseBackupBytes } from '@/lib/database';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_SESSION_STORE_KEY = 'apex.google-drive.session.v1';
const GOOGLE_REFRESH_LEEWAY_MS = 60_000;
const GOOGLE_BACKUP_APP_PROPERTY_KEY = 'apex_backup';
const GOOGLE_BACKUP_APP_PROPERTY_VALUE = 'sqlite_v1';
const GOOGLE_DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_BASE_URL = 'https://www.googleapis.com/upload/drive/v3';
const DEFAULT_BACKUP_LIST_LIMIT = 20;

type GoogleDriveAuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  scope: string[];
};

type GoogleDriveApiErrorPayload = {
  error?:
    | {
        message?: string;
      }
    | string;
};

type GoogleDriveFileResponse = {
  id?: string;
  name?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
};

type GoogleDriveListFilesResponse = {
  files?: GoogleDriveFileResponse[];
};

export type GoogleDriveBackupFile = {
  id: string;
  name: string;
  createdTime: string | null;
  modifiedTime: string | null;
  sizeBytes: number | null;
};

function getGoogleDriveClientId(): string {
  const platformClientId =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_GOOGLE_DRIVE_IOS_CLIENT_ID?.trim()
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_GOOGLE_DRIVE_ANDROID_CLIENT_ID?.trim()
        : process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID?.trim();
  const fallbackClientId = process.env.EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID?.trim();
  const clientId = platformClientId || fallbackClientId;

  if (!clientId) {
    if (Platform.OS === 'ios') {
      throw new Error('Set EXPO_PUBLIC_GOOGLE_DRIVE_IOS_CLIENT_ID before connecting Google Drive.');
    }

    if (Platform.OS === 'android') {
      throw new Error('Set EXPO_PUBLIC_GOOGLE_DRIVE_ANDROID_CLIENT_ID before connecting Google Drive.');
    }

    throw new Error('Set EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID before connecting Google Drive.');
  }

  return clientId;
}

export function isGoogleDriveConfigured(): boolean {
  try {
    return Boolean(getGoogleDriveClientId());
  } catch {
    return false;
  }
}

export function getGoogleDriveRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'apex',
    path: 'google-drive-auth',
  });
}

function parseScope(scope: string | undefined): string[] {
  if (!scope) {
    return [];
  }

  return scope
    .split(' ')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getExpiresAt(expiresInSeconds: number | undefined, issuedAtSeconds: number): number | null {
  if (typeof expiresInSeconds !== 'number' || !Number.isFinite(expiresInSeconds)) {
    return null;
  }

  return (issuedAtSeconds + expiresInSeconds) * 1000;
}

async function saveGoogleDriveSession(session: GoogleDriveAuthSession): Promise<void> {
  await SecureStore.setItemAsync(GOOGLE_SESSION_STORE_KEY, JSON.stringify(session));
}

async function loadGoogleDriveSession(): Promise<GoogleDriveAuthSession | null> {
  const raw = await SecureStore.getItemAsync(GOOGLE_SESSION_STORE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GoogleDriveAuthSession>;

    if (typeof parsed.accessToken !== 'string') {
      await SecureStore.deleteItemAsync(GOOGLE_SESSION_STORE_KEY);
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null,
      scope: Array.isArray(parsed.scope)
        ? parsed.scope.filter((item): item is string => typeof item === 'string')
        : [],
    };
  } catch {
    await SecureStore.deleteItemAsync(GOOGLE_SESSION_STORE_KEY);
    return null;
  }
}

async function refreshGoogleDriveSession(session: GoogleDriveAuthSession): Promise<GoogleDriveAuthSession> {
  if (!session.refreshToken) {
    throw new Error('Google Drive session expired. Reconnect Google Drive in Backups.');
  }

  const refreshed = await AuthSession.refreshAsync(
    {
      clientId: getGoogleDriveClientId(),
      refreshToken: session.refreshToken,
    },
    GOOGLE_DISCOVERY
  );

  const nextSession: GoogleDriveAuthSession = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? session.refreshToken,
    expiresAt: getExpiresAt(refreshed.expiresIn, refreshed.issuedAt),
    scope: parseScope(refreshed.scope).length > 0 ? parseScope(refreshed.scope) : session.scope,
  };

  await saveGoogleDriveSession(nextSession);
  return nextSession;
}

async function ensureFreshGoogleDriveSession(): Promise<GoogleDriveAuthSession | null> {
  const session = await loadGoogleDriveSession();

  if (!session) {
    return null;
  }

  if (session.expiresAt === null || session.expiresAt - Date.now() > GOOGLE_REFRESH_LEEWAY_MS) {
    return session;
  }

  try {
    return await refreshGoogleDriveSession(session);
  } catch {
    await disconnectGoogleDrive();
    return null;
  }
}

async function getGoogleDriveApiErrorMessage(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as GoogleDriveApiErrorPayload;

    if (typeof payload.error === 'string') {
      return payload.error.trim() || null;
    }

    if (typeof payload.error?.message === 'string') {
      return payload.error.message.trim() || null;
    }

    return null;
  } catch {
    return null;
  }
}

async function throwGoogleDriveResponseError(response: Response): Promise<never> {
  if (response.status === 401) {
    await disconnectGoogleDrive();
    throw new Error('Google Drive session expired. Reconnect and try again.');
  }

  const apiMessage = await getGoogleDriveApiErrorMessage(response);
  throw new Error(apiMessage ?? `Google Drive request failed (${response.status}).`);
}

async function authorizedGoogleDriveFetch(
  url: string,
  init: RequestInit = {},
  retryOnUnauthorized = true
): Promise<Response> {
  const session = await ensureFreshGoogleDriveSession();

  if (!session) {
    throw new Error('Google Drive is not connected. Connect it in Backups first.');
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const latestSession = await loadGoogleDriveSession();

    if (latestSession === null) {
      await throwGoogleDriveResponseError(response);
      return response;
    }

    try {
      const refreshed = await refreshGoogleDriveSession(latestSession);
      return fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${refreshed.accessToken}`,
          ...(init.headers ?? {}),
        },
      });
    } catch {
      await throwGoogleDriveResponseError(response);
    }
  }

  return response;
}

function normalizeDriveFile(file: GoogleDriveFileResponse): GoogleDriveBackupFile | null {
  if (typeof file.id !== 'string' || typeof file.name !== 'string') {
    return null;
  }

  const parsedSize =
    typeof file.size === 'string' && file.size.trim().length > 0
      ? Number.parseInt(file.size, 10)
      : Number.NaN;

  return {
    id: file.id,
    name: file.name,
    createdTime: typeof file.createdTime === 'string' ? file.createdTime : null,
    modifiedTime: typeof file.modifiedTime === 'string' ? file.modifiedTime : null,
    sizeBytes: Number.isFinite(parsedSize) && parsedSize >= 0 ? parsedSize : null,
  };
}

function buildBackupFileName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `apex-backup-${timestamp}.db`;
}

function buildGoogleDriveBackupQuery(): string {
  return [
    'trashed = false',
    `appProperties has { key='${GOOGLE_BACKUP_APP_PROPERTY_KEY}' and value='${GOOGLE_BACKUP_APP_PROPERTY_VALUE}' }`,
  ].join(' and ');
}

export async function connectGoogleDrive(): Promise<boolean> {
  const request = new AuthSession.AuthRequest({
    clientId: getGoogleDriveClientId(),
    scopes: [GOOGLE_DRIVE_SCOPE],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    redirectUri: getGoogleDriveRedirectUri(),
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return false;
  }

  if (result.type !== 'success') {
    const message = result.type === 'error' ? result.error?.message : 'Google authorization failed.';
    throw new Error(message ?? 'Google authorization failed.');
  }

  const code = result.params.code;
  const codeVerifier = request.codeVerifier;

  if (!code || !codeVerifier) {
    throw new Error('Google did not return a usable authorization code.');
  }

  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId: getGoogleDriveClientId(),
      code,
      redirectUri: getGoogleDriveRedirectUri(),
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    GOOGLE_DISCOVERY
  );

  const session: GoogleDriveAuthSession = {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? null,
    expiresAt: getExpiresAt(token.expiresIn, token.issuedAt),
    scope: parseScope(token.scope),
  };

  await saveGoogleDriveSession(session);
  return true;
}

export async function disconnectGoogleDrive(): Promise<void> {
  await SecureStore.deleteItemAsync(GOOGLE_SESSION_STORE_KEY);
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  const session = await ensureFreshGoogleDriveSession();
  return session !== null;
}

export async function listGoogleDriveBackups(limit = DEFAULT_BACKUP_LIST_LIMIT): Promise<GoogleDriveBackupFile[]> {
  const query = new URLSearchParams({
    q: buildGoogleDriveBackupQuery(),
    spaces: 'drive',
    pageSize: String(Math.max(1, Math.min(limit, 100))),
    orderBy: 'createdTime desc',
    fields: 'files(id,name,createdTime,modifiedTime,size)',
  });

  const response = await authorizedGoogleDriveFetch(`${GOOGLE_DRIVE_API_BASE_URL}/files?${query.toString()}`);

  if (!response.ok) {
    await throwGoogleDriveResponseError(response);
  }

  const payload = (await response.json()) as GoogleDriveListFilesResponse;

  return (payload.files ?? [])
    .map(normalizeDriveFile)
    .filter((file): file is GoogleDriveBackupFile => file !== null);
}

export async function uploadDatabaseBackupToGoogleDrive(): Promise<GoogleDriveBackupFile> {
  const bytes = await exportDatabaseBackupBytes();
  const bodyBytes = Uint8Array.from(bytes);
  const fileName = buildBackupFileName();
  const boundary = `apex-backup-${Date.now().toString(36)}`;
  const metadata = {
    name: fileName,
    mimeType: 'application/octet-stream',
    appProperties: {
      [GOOGLE_BACKUP_APP_PROPERTY_KEY]: GOOGLE_BACKUP_APP_PROPERTY_VALUE,
    },
  };

  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    bodyBytes,
    `\r\n--${boundary}--\r\n`,
  ]);

  const query = new URLSearchParams({
    uploadType: 'multipart',
    fields: 'id,name,createdTime,modifiedTime,size',
  });

  const response = await authorizedGoogleDriveFetch(
    `${GOOGLE_DRIVE_UPLOAD_BASE_URL}/files?${query.toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    await throwGoogleDriveResponseError(response);
  }

  const payload = (await response.json()) as GoogleDriveFileResponse;
  const file = normalizeDriveFile(payload);

  if (!file) {
    throw new Error('Google Drive upload succeeded but returned incomplete file metadata.');
  }

  return file;
}

export async function downloadGoogleDriveBackupBytes(fileId: string): Promise<Uint8Array> {
  const response = await authorizedGoogleDriveFetch(
    `${GOOGLE_DRIVE_API_BASE_URL}/files/${encodeURIComponent(fileId)}?alt=media`
  );

  if (!response.ok) {
    await throwGoogleDriveResponseError(response);
  }

  const data = await response.arrayBuffer();
  return new Uint8Array(data);
}
