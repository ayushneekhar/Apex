import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

const SPOTIFY_SCOPES = ['user-read-playback-state', 'user-read-currently-playing'];
const SESSION_STORE_KEY = 'apex.spotify.session.v1';
const REFRESH_LEEWAY_MS = 60_000;
const DEFAULT_RETRY_AFTER_MS = 15_000;

type SpotifyAuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  scope: string[];
};

type SpotifyArtist = {
  name: string;
};

type SpotifyImage = {
  url: string;
};

type SpotifyAlbum = {
  name: string;
  images?: SpotifyImage[];
};

type SpotifyTrack = {
  type?: string;
  name?: string;
  duration_ms?: number;
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
  external_urls?: {
    spotify?: string;
  };
};

type SpotifyPlaybackState = {
  is_playing?: boolean;
  progress_ms?: number | null;
  item?: SpotifyTrack | null;
};

export type SpotifyNowPlaying = {
  songName: string;
  artistNames: string;
  albumName: string;
  albumArtUrl: string | null;
  trackUrl: string | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
};

export class SpotifyRateLimitError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super('Spotify rate limit reached.');
    this.name = 'SpotifyRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

function getSpotifyClientId(): string {
  const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error('Set EXPO_PUBLIC_SPOTIFY_CLIENT_ID before connecting Spotify.');
  }

  return clientId;
}

export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID?.trim());
}

export function getSpotifyRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'apex',
    path: 'spotify-auth',
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

async function saveSpotifySession(session: SpotifyAuthSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_STORE_KEY, JSON.stringify(session));
}

async function loadSpotifySession(): Promise<SpotifyAuthSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SpotifyAuthSession>;

    if (typeof parsed.accessToken !== 'string') {
      await SecureStore.deleteItemAsync(SESSION_STORE_KEY);
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null,
      scope: Array.isArray(parsed.scope) ? parsed.scope.filter((item): item is string => typeof item === 'string') : [],
    };
  } catch {
    await SecureStore.deleteItemAsync(SESSION_STORE_KEY);
    return null;
  }
}

async function refreshSpotifySession(session: SpotifyAuthSession): Promise<SpotifyAuthSession> {
  if (!session.refreshToken) {
    throw new Error('Spotify session has expired. Reconnect Spotify in Settings.');
  }

  const refreshed = await AuthSession.refreshAsync(
    {
      clientId: getSpotifyClientId(),
      refreshToken: session.refreshToken,
    },
    SPOTIFY_DISCOVERY
  );

  const nextSession: SpotifyAuthSession = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? session.refreshToken,
    expiresAt: getExpiresAt(refreshed.expiresIn, refreshed.issuedAt),
    scope: parseScope(refreshed.scope).length > 0 ? parseScope(refreshed.scope) : session.scope,
  };

  await saveSpotifySession(nextSession);
  return nextSession;
}

async function ensureFreshSpotifySession(): Promise<SpotifyAuthSession | null> {
  const session = await loadSpotifySession();

  if (!session) {
    return null;
  }

  if (session.expiresAt === null || session.expiresAt - Date.now() > REFRESH_LEEWAY_MS) {
    return session;
  }

  try {
    return await refreshSpotifySession(session);
  } catch {
    await disconnectSpotify();
    return null;
  }
}

function getRetryAfterMs(response: Response): number {
  const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);

  if (!Number.isFinite(retryAfter) || retryAfter <= 0) {
    return DEFAULT_RETRY_AFTER_MS;
  }

  return retryAfter * 1000;
}

function toNowPlaying(playback: SpotifyPlaybackState): SpotifyNowPlaying | null {
  const track = playback.item;

  if (!track || track.type !== 'track' || !track.name) {
    return null;
  }

  const artists = (track.artists ?? []).map((artist) => artist.name).filter(Boolean);
  const artwork = (track.album?.images ?? [])[0]?.url ?? null;

  return {
    songName: track.name,
    artistNames: artists.length > 0 ? artists.join(', ') : 'Unknown artist',
    albumName: track.album?.name ?? 'Unknown album',
    albumArtUrl: artwork,
    trackUrl: track.external_urls?.spotify ?? null,
    isPlaying: Boolean(playback.is_playing),
    progressMs: typeof playback.progress_ms === 'number' ? Math.max(0, playback.progress_ms) : 0,
    durationMs: typeof track.duration_ms === 'number' ? Math.max(0, track.duration_ms) : 0,
  };
}

export async function connectSpotify(): Promise<boolean> {
  const request = new AuthSession.AuthRequest({
    clientId: getSpotifyClientId(),
    scopes: SPOTIFY_SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    redirectUri: getSpotifyRedirectUri(),
  });

  const result = await request.promptAsync(SPOTIFY_DISCOVERY);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return false;
  }

  if (result.type !== 'success') {
    const message = result.type === 'error' ? result.error?.message : 'Spotify authorization failed.';
    throw new Error(message ?? 'Spotify authorization failed.');
  }

  const code = result.params.code;
  const codeVerifier = request.codeVerifier;

  if (!code || !codeVerifier) {
    throw new Error('Spotify did not return a usable authorization code.');
  }

  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId: getSpotifyClientId(),
      code,
      redirectUri: getSpotifyRedirectUri(),
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    SPOTIFY_DISCOVERY
  );

  const session: SpotifyAuthSession = {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? null,
    expiresAt: getExpiresAt(token.expiresIn, token.issuedAt),
    scope: parseScope(token.scope),
  };

  await saveSpotifySession(session);
  return true;
}

export async function disconnectSpotify(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_STORE_KEY);
}

export async function isSpotifyConnected(): Promise<boolean> {
  const session = await ensureFreshSpotifySession();
  return session !== null;
}

export async function getSpotifyNowPlaying(): Promise<SpotifyNowPlaying | null> {
  const session = await ensureFreshSpotifySession();

  if (!session) {
    return null;
  }

  const response = await fetch('https://api.spotify.com/v1/me/player', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (response.status === 204) {
    return null;
  }

  if (response.status === 401) {
    await disconnectSpotify();
    throw new Error('Spotify session expired. Reconnect in Settings.');
  }

  if (response.status === 429) {
    throw new SpotifyRateLimitError(getRetryAfterMs(response));
  }

  if (!response.ok) {
    throw new Error(`Spotify request failed (${response.status}).`);
  }

  const payload = (await response.json()) as SpotifyPlaybackState;
  return toNowPlaying(payload);
}
