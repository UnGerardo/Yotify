
const express = require('express');
const { randomBytes } = require('node:crypto');
const path = require('node:path');

const app = express();
const port = 3000;

let SPOTIFY_ACCESS_TOKEN = '';
let SPOTIFY_TOKEN_TYPE = '';
let SPOTIFY_TOKEN_EXPIRATION = 0;

const USER_ID_STATE_MAP = new Map();
let userId = 0;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/index.html'));
});

app.get('/spotSearch', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/spotSearch.html'));
});

app.get('/getPlaylists', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/getPlaylists.html'));
});

app.get('/spotifyAuth', (req, res) => {
  const randomStr = randomBytes(16).toString('hex');
  let stateStr = `${userId}:${randomStr}`;
  USER_ID_STATE_MAP.set(userId, randomStr);
  userId++;

  const scope = 'user-library-read playlist-read-private';

  const spotifyAuthParams = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CLIENT_ID,
    scope: scope,
    redirect_uri: process.env.REDIRECT_URI,
    state: stateStr,
    show_dialog: true
  });

  res.redirect(302, `https://accounts.spotify.com/authorize?${spotifyAuthParams}`);
});

app.get('/spotifyAuthToken', async (req, res) => {
  const code = req.query['code'];
  const error = req.query['error'];

  // need .toString() because URLSearchParams converts ':' to '%3A'; converts back
  const state = req.query['state'].toString();
  const [ stateUserId, returnedStateStr ] = state.split(':');
  const stateStrToCheck = authStateMap.get(parseInt(stateUserId));
  authStateMap.delete(stateUserId);

  if (returnedStateStr !== stateStrToCheck) {
    res.status(404).sendFile('Error: authState did not match state from /spotifyAuth');
    return;
  }

  if (error) {
    res.status(404).sendFile(`Error: ${error}`);
    return;
  }

  const spotifyTokenParams = new URLSearchParams({
    code: code.toString(),
    redirect_uri: process.env.REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  const spotifyTokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body: spotifyTokenParams,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
    }
  });

  const spotifyTokenJson = await spotifyTokenResponse.json();
  const { access_token, token_type } = spotifyTokenJson;

  res.json({
    access_token,
    token_type
  });
});

// middleware that handles 404 errors
app.use(function(req, res, next) {
  res.status(404).sendFile(path.join(__dirname, '/html/404.html'));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

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

  ({ access_token: SPOTIFY_ACCESS_TOKEN, token_type: SPOTIFY_TOKEN_TYPE } = spotifyApiJson);
  SPOTIFY_TOKEN_EXPIRATION = Date.now() + 3500000;
}