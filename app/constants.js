// ENV VARIABLES
require('dotenv').config();

exports.PORT = process.env.PORT || 3000;

exports.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
exports.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
exports.SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/spotify/playlists';

exports.SPOTDL_PATH = process.env.SPOTDL_PATH || '/spotdl_music'
exports.PLAYLIST_FILES_PATH = process.env.PLAYLIST_FILES_PATH || '/playlist_files'

exports.SPOTDL_FORMAT = process.env.SPOTDL_FORMAT || 'mp3';
exports.SPOTDL_OUTPUT = process.env.SPOTDL_OUTPUT || '{artist}/{artist} - {title}.{output-ext}';

exports.DOWNLOAD_THREADS = process.env.DOWNLOAD_THREADS || 1;

// SPOTIFY VARIABLES
exports.SPOTIFY_CURRENT_USER_URL = 'https://api.spotify.com/v1/me';
exports.SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
exports.SPOTIFY_AUTH_URL = (state) => {
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
exports.SPOTIFY_SEARCH_URL = (query) => {
  const _spotifySearchParams = new URLSearchParams({
    q: decodeURIComponent(query),
    type: 'track',
    market: 'US',
    limit: 20,
    offset: 0
  });
  return `https://api.spotify.com/v1/search?${_spotifySearchParams}`;
}