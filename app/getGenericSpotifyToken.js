const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_TOKEN_URL } = require('./constants.js');
const globalState = require('./globalState.js');

async function getGenericSpotifyToken() {
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

module.exports = getGenericSpotifyToken;