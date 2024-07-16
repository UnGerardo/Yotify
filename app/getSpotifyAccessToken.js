const globalState = require('./globalState.js');

async function getSpotifyAccessToken() {
  const _spotifyCredParams = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  });

  const _spotifyApiRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body: _spotifyCredParams,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  }).then(res => res.json());

  ({ access_token: globalState.spotifyToken, token_type: globalState.spotifyTokenType } = _spotifyApiRes);
  globalState.spotifyTokenExpiry = Date.now() + 3500000;
}

module.exports = getSpotifyAccessToken;