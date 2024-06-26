const globalState = require('./globalState.js');

async function getSpotifyAccessToken() {
  const spotifyCredParams = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  });

  const spotifyApiResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body: spotifyCredParams,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  });

  const spotifyApiJson = await spotifyApiResponse.json();

  ({ access_token: globalState.spotifyToken, token_type: globalState.spotifyTokenType } = spotifyApiJson);
  globalState.spotifyTokenExpiry = Date.now() + 3500000;
}

module.exports = getSpotifyAccessToken;