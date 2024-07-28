
const { platform } = require('node:os');
const path = require('node:path');

exports.APP_DIR_PATH = process.cwd();

// ENV VARIABLES
require('dotenv').config();

exports.PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

exports.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
exports.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
exports.SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/spotify/playlists';

exports.SPOTDL_DIR = process.env.SPOTDL_DIR || 'spotdl_music';
exports.ZOTIFY_DIR = process.env.ZOTIFY_DIR || 'zotify_music';
exports.PLAYLIST_FILES_DIR = process.env.PLAYLIST_FILES_DIR || 'playlist_files';

exports.SPOTDL_WAIT_MIN = process.env.SPOTDL_WAIT_MIN ? parseInt(process.env.SPOTDL_WAIT_MIN) : 30000;
exports.SPOTDL_WAIT_MAX = process.env.SPOTDL_WAIT_MAX ? parseInt(process.env.SPOTDL_WAIT_MAX) : 60000;
exports.SPOTDL_FORMAT = process.env.SPOTDL_FORMAT || 'mp3';
exports.SPOTDL_OUTPUT = process.env.SPOTDL_OUTPUT || '{artist}/{artist} - {title}.{output-ext}';

exports.ZOTIFY_WAIT_MIN = process.env.ZOTIFY_WAIT_MIN ? parseInt(process.env.ZOTIFY_WAIT_MIN) : 30000;
exports.ZOTIFY_WAIT_MAX = process.env.ZOTIFY_WAIT_MAX ? parseInt(process.env.ZOTIFY_WAIT_MAX) : 60000;
exports.ZOTIFY_FORMAT = process.env.ZOTIFY_FORMAT || 'mp3';
exports.ZOTIFY_OUTPUT = process.env.ZOTIFY_OUTPUT || '{artist}/{artist} - {song_name}.{ext}';

exports.SPOTIFY_USERNAME = process.env.SPOTIFY_USERNAME;
exports.SPOTIFY_PASSWORD = process.env.SPOTIFY_PASSWORD;

exports.DOWNLOAD_THREADS = process.env.DOWNLOAD_THREADS ? parseInt(process.env.DOWNLOAD_THREADS) : 1;

// SPOTIFY VARIABLES
exports.SPOTIFY_CURRENT_USER_URL = 'https://api.spotify.com/v1/me';
exports.SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
exports.SPOTIFY_PLAYLIST_TRACKS_FIELDS = 'next,items(track(artists(name),name,external_urls))';
exports.CREATE_SPOTIFY_AUTH_URL = (state) => {
  const _spotifyAuthParams = new URLSearchParams({
    client_id: this.SPOTIFY_CLIENT_ID,
    redirect_uri: this.SPOTIFY_REDIRECT_URI,
    response_type: 'code',
    scope: 'user-library-read playlist-read-private',
    show_dialog: true,
    state: state
  });

  return `https://accounts.spotify.com/authorize?${_spotifyAuthParams}`;
}
exports.CREATE_SPOTIFY_SEARCH_URL = (query) => {
  const _spotifySearchParams = new URLSearchParams({
    q: decodeURIComponent(query),
    type: 'track',
    market: 'US',
    limit: 20,
    offset: 0
  });
  return `https://api.spotify.com/v1/search?${_spotifySearchParams}`;
}
exports.CREATE_SPOTIFY_SNAPSHOT_URL = (playlistId) => {
  const _snapshotParams = new URLSearchParams({ fields: 'snapshot_id' });
  return `https://api.spotify.com/v1/playlists/${playlistId}?${_snapshotParams}`;
}
exports.CREATE_SPOTIFY_SAVED_TRACKS_URL = () => {
  const _likedSongsParams = new URLSearchParams({ limit: 50, offset: 0, market: 'US' });
  return `https://api.spotify.com/v1/me/tracks?${_likedSongsParams}`;
}
exports.CREATE_SPOTIFY_PLAYLIST_TRACKS_URL = (playlistId) => {
  const _playlistParams = new URLSearchParams({ market: 'US', fields: this.SPOTIFY_PLAYLIST_TRACKS_FIELDS });
  return `https://api.spotify.com/v1/playlists/${playlistId}/tracks?${_playlistParams}`;
}
exports.GET_SPOTIFY_USER_TOKEN = async (code) => {
  const _tokensRes = await fetch(this.SPOTIFY_TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      code: code.toString(),
      redirect_uri: this.SPOTIFY_REDIRECT_URI,
      grant_type: 'authorization_code'
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${ new Buffer.from(`${this.SPOTIFY_CLIENT_ID}:${this.SPOTIFY_CLIENT_SECRET}`).toString('base64') }`
    }
  });

  if (_tokensRes.status === 400) {
    const { error } = await _tokensRes.json();
    throw new Error(error);
  }

  return await _tokensRes.json();
}

// SPOTDL
exports.SPOTDL = 'spotdl';
exports.SPOTDL_ARGS = (trackUrl) => {
  return [
    this.SPOTDL,
    [
      `--output=${path.join(this.APP_DIR_PATH, this.SPOTDL_DIR, this.SPOTDL_OUTPUT)}`,
      `--format=${this.SPOTDL_FORMAT}`,
      `--print-errors`,
      trackUrl,
    ],
    platform() === 'win32' ? { env: { PYTHONIOENCODING: 'utf-8' } } : {}
  ];
}

// ZOTIFY
exports.ZOTIFY = 'zotify';
exports.ZOTIFY_ARGS = (trackUrl) => {
  return [
    this.ZOTIFY,
    [
      `--username=${this.SPOTIFY_USERNAME}`,
      `--password=${this.SPOTIFY_PASSWORD}`,
      `--root-path=${path.join(this.APP_DIR_PATH, this.ZOTIFY_DIR)}`,
      `--output=${this.ZOTIFY_OUTPUT}`,
      `--download-format=${this.ZOTIFY_FORMAT}`,
      `--download-quality=high`,
      `--save-credentials=False`,
      trackUrl,
    ],
    platform() === 'win32' ? { env: { PYTHONIOENCODING: 'utf-8' } } : {}
  ];
}