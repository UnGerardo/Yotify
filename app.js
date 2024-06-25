
const express = require('express');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { createReadStream, stat, writeFileSync } = require('node:fs');
const { platform } = require('node:os');
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
    res.status(404).send('Error: authState did not match state from /spotifyAuth');
    return;
  }

  if (error) {
    res.status(404).send(`Error: ${error}`);
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

app.post('/searchTrack', async (req, res) => {
  if (SPOTIFY_ACCESS_TOKEN === '' || Date.now() > SPOTIFY_TOKEN_EXPIRATION) {
    await getSpotifyAccessToken();
  }

  const searchQuery = req.query['searchQuery'];
  const spotifySearchParams = new URLSearchParams({
    q: searchQuery,
    type: 'track',
    market: 'US',
    limit: 20,
    offset: 0
  });

  const spotifyResponse = await fetch(`https://api.spotify.com/v1/search?${spotifySearchParams}`, {
    method: 'GET',
    headers: {'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  });
  const spotifyResponseJson = await spotifyResponse.json();

  res.json(spotifyResponseJson['tracks']);
});

app.post('/downloadTrack', (req, res) => {
  const trackUrl = req.query['trackUrl'];
  const artistName = req.query['artistName'];
  const trackName = req.query['trackName'];

  const zotifyInstance = spawnSync('zotify',
    [
      trackUrl,
      `--root-path=${__dirname}/${process.env.MUSIC_ROOT_PATH}`,
      `--username=${process.env.SPOTIFY_USERNAME}`,
      `--password=${process.env.SPOTIFY_PASSWORD}`,
      `--output=${process.env.ZOTIFY_OUTPUT}`,
      `--download-format=mp3`,
      `--save-credentials=False`
    ],
    platform() === 'win32' ? {
      env: { PYTHONIOENCODING: 'utf-8' }
    } : {}
  );

  if (zotifyInstance.error) {
    console.log(`Error: ${zotifyInstance.error.message}`);
  } else {
    console.log(`STDOUT: \n${zotifyInstance.stdout}`);
    console.log(`STDERR: \n${zotifyInstance.stderr}`);
    console.log(`STATUS: ${zotifyInstance.status}`);
  }

  const trackFilePath = `${__dirname}/${process.env.MUSIC_ROOT_PATH}/${artistName}/${artistName} - ${trackName}.mp3`;
  stat(trackFilePath, (err, stats) => {
    if (err) {
      res.status(404).send('File not found');
      return;
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': stats.size,
      'Content-Disposition': `attachment; filename='${encodeURIComponent(`${artistName} - ${trackName}.mp3`)}'`
    });

    const readStream = createReadStream(trackFilePath);
    readStream.pipe(res);
  });
});

app.post('/getSavedTracks', async (req, res) => {
  const access_token = req.query['access_token'];
  const token_type = req.query['token_type'];

  const spotifyProfileResponse = await fetch('https://api.spotify.com/v1/me', {
    headers: { 'Authorization': `${token_type} ${access_token}`}
  });
  const spotifyProfileJson = await spotifyProfileResponse.json();
  const { display_name } = spotifyProfileJson;

  const savedTracksParams = new URLSearchParams({
    limit: 50,
    offset: 0,
    market: 'US'
  })
  const savedTracksResponse = await fetch(`https://api.spotify.com/v1/me/tracks?${savedTracksParams}`, {
    headers: { 'Authorization': `${token_type} ${access_token}`}
  });
  const savedTracksJson = await savedTracksResponse.json();

  savedTracksJson['items'].forEach(item => {
    writeFileSync(
      `${__dirname}/${process.env.TRACK_DATA_PATH}/${display_name}.txt`,
      `${item['track']['artists'][0]['name']},${item['track']['name']},${item['track']['external_urls']['spotify']}\n`,
      { flag: 'a' },
      err => console.log(err)
    );
  });

  res.send('Tracks retrieved');
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