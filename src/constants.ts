
import { platform } from 'node:os';
import path from 'node:path';
import globalState from './classes/GlobalState.js';

const PLATFORM: string = platform();
export const ROOT_DIR_PATH: string = process.cwd();

type SpotdlArgs = [
  Downloader,
  [
    output :string,
    format: string,
    print_errors: `--print-errors`,
    url: string
  ],
  env: object
];
type ZotifyArgs = [
  Downloader,
  [
    username: string,
    password: string,
    root_path: string,
    output: string,
    format: string,
    quality: `--download-quality=high`,
    save_creds: `--save-credentials=False`,
    url: string
  ],
  env: object
];

interface _SpotifyUserTokenRes {
  access_token: string,
  token_type: string,
  scope: string,
  expires_in: number,
  refresh_token: string
}

// ENV VARIABLES
import 'dotenv/config';

export const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
export const DOWNLOAD_THREADS: number = process.env.DOWNLOAD_THREADS ? parseInt(process.env.DOWNLOAD_THREADS) : 1;
export const MAX_DOWNLOADING_TRIES: number = process.env.MAX_DOWNLOADING_TRIES ? parseInt(process.env.MAX_DOWNLOADING_TRIES) : 4;

export const SPOTIFY_CLIENT_ID: string = process.env.SPOTIFY_CLIENT_ID || '';
export const SPOTIFY_CLIENT_SECRET: string = process.env.SPOTIFY_CLIENT_SECRET || '';
export const SPOTIFY_REDIRECT_URI: string = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/spotify/playlists';

export const SPOTDL_DIR: string = process.env.SPOTDL_DIR || 'spotdl_music';
export const ZOTIFY_DIR: string = process.env.ZOTIFY_DIR || 'zotify_music';
export const PLAYLIST_FILES_DIR: string = process.env.PLAYLIST_FILES_DIR || 'playlist_files';

export const SPOTDL_WAIT_MIN: number = process.env.SPOTDL_WAIT_MIN ? parseInt(process.env.SPOTDL_WAIT_MIN) : 30000;
export const SPOTDL_WAIT_MAX: number = process.env.SPOTDL_WAIT_MAX ? parseInt(process.env.SPOTDL_WAIT_MAX) : 60000;
export const SPOTDL_FORMAT: string = process.env.SPOTDL_FORMAT || 'mp3';
export const SPOTDL_OUTPUT: string = process.env.SPOTDL_OUTPUT || '{artist}/{artist} - {title}.{output-ext}';

export const ZOTIFY_WAIT_MIN: number = process.env.ZOTIFY_WAIT_MIN ? parseInt(process.env.ZOTIFY_WAIT_MIN) : 30000;
export const ZOTIFY_WAIT_MAX: number = process.env.ZOTIFY_WAIT_MAX ? parseInt(process.env.ZOTIFY_WAIT_MAX) : 60000;
export const ZOTIFY_FORMAT: string = process.env.ZOTIFY_FORMAT || 'mp3';
export const ZOTIFY_OUTPUT: string = process.env.ZOTIFY_OUTPUT || '{artist}/{artist} - {song_name}.{ext}';

export const SPOTIFY_USERNAME: string = process.env.SPOTIFY_USERNAME || '';
export const SPOTIFY_PASSWORD: string = process.env.SPOTIFY_PASSWORD || '';

// SPOTIFY VARIABLES
export const SPOTIFY_CURRENT_USER_URL: string = 'https://api.spotify.com/v1/me';
export const SPOTIFY_TOKEN_URL: string = 'https://accounts.spotify.com/api/token';
export const SPOTIFY_PLAYLIST_TRACKS_FIELDS: string = 'next,items(track(artists(name),name,external_urls,is_playable))';
export const CREATE_SPOTIFY_AUTH_URL = (state: string): string => {
  return `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    response_type: 'code',
    scope: 'user-library-read playlist-read-private',
    show_dialog: 'true',
    state: state
  })}`;
}
export const CREATE_SPOTIFY_SEARCH_URL = (query: string): string => {
  return `https://api.spotify.com/v1/search?${new URLSearchParams({
    q: decodeURIComponent(query),
    type: 'track',
    market: 'US',
    limit: '20',
    offset: '0'
  })}`;
}
export const CREATE_SPOTIFY_SNAPSHOT_URL = (playlistId: string): string => {
  return `https://api.spotify.com/v1/playlists/${playlistId}?${new URLSearchParams({ fields: 'snapshot_id' })}`;
}
export const CREATE_SPOTIFY_SAVED_TRACKS_URL = (): string => {
  return `https://api.spotify.com/v1/me/tracks?${new URLSearchParams({ limit: '50', offset: '0', market: 'US' })}`;
}
export const CREATE_SPOTIFY_PLAYLIST_TRACKS_URL = (playlistId: string): string => {
  return `https://api.spotify.com/v1/playlists/${playlistId}/tracks?${new URLSearchParams({ market: 'US', fields: SPOTIFY_PLAYLIST_TRACKS_FIELDS })}`;
}
export const GET_SPOTIFY_USER_TOKEN = async (code: string): Promise<_SpotifyUserTokenRes> => {
  const _tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      code: code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      grant_type: 'authorization_code'
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${ Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64') }`
    }
  });

  if (!_tokenRes.ok) {
    const { error } = await _tokenRes.json();
    throw error;
  }

  const _tokenResJson: _SpotifyUserTokenRes = await _tokenRes.json();
  return _tokenResJson;
}
export const SET_GENERIC_SPOTIFY_TOKEN = async (): Promise<void> => {
  if (globalState.spotifyToken === '' || Date.now() > globalState.spotifyTokenExpiry) {
    const _spotifyCredParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET
    });

    const _spotifyApiRes = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      body: _spotifyCredParams,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    }).then(res => res.json());

    ({ access_token: globalState.spotifyToken, token_type: globalState.spotifyTokenType } = _spotifyApiRes);
    globalState.spotifyTokenExpiry = Date.now() + 3500000;
  }
}

// SPOTDL
export const SPOTDL: Downloader = 'spotdl';
export const SPOTDL_ARGS = (trackUrl: string): SpotdlArgs => {
  return [
    SPOTDL,
    [
      `--output=${path.join(ROOT_DIR_PATH, SPOTDL_DIR, SPOTDL_OUTPUT)}`,
      `--format=${SPOTDL_FORMAT}`,
      `--print-errors`,
      trackUrl,
    ],
    PLATFORM === 'win32' ? { env: { PYTHONIOENCODING: 'utf-8' } } : {}
  ];
}
export const spotdlFileSanitize = (string: string): string => {
  return string.replace(/[/\\*|<>":]/g, (char: string) => {
    switch (char) {
      case '"': return "'";
      case ':': return '-';
      default: return '';
    }
  });
}

// ZOTIFY
export const ZOTIFY: Downloader = 'zotify';
export const ZOTIFY_ARGS = (trackUrl: string): ZotifyArgs => {
  return [
    ZOTIFY,
    [
      `--username=${SPOTIFY_USERNAME}`,
      `--password=${SPOTIFY_PASSWORD}`,
      `--root-path=${path.join(ROOT_DIR_PATH, ZOTIFY_DIR)}`,
      `--output=${ZOTIFY_OUTPUT}`,
      `--download-format=${ZOTIFY_FORMAT}`,
      `--download-quality=high`,
      `--save-credentials=False`,
      trackUrl,
    ],
    PLATFORM === 'win32' ? { env: { PYTHONIOENCODING: 'utf-8' } } : {}
  ];
}
export const zotifyFileSanitize = (string: string): string => {
  if (PLATFORM === 'win32') {
    const winPattern: RegExp = /[/\\:|<>"?*\0-\x1f]|^(AUX|COM[1-9]|CON|LPT[1-9]|NUL|PRN)(?![^.])|^\s|[\s.]$/gi;
    return string.replace(winPattern, "_");
  } else if (PLATFORM === 'linux') {
    const linuxPattern: RegExp = /[/\0]/gi;
    return string.replace(linuxPattern, "_");
  } else {
    const macPattern: RegExp = /[/:\0]/gi;
    return string.replace(macPattern, "_");
  }
}