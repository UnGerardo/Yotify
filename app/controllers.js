require('dotenv').config();

const { randomBytes } = require('node:crypto');
const { createReadStream, writeFileSync, mkdirSync, existsSync, stat } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { platform } = require('node:os');
const path = require('node:path');

const getSpotifyAccessToken = require('./getSpotifyAccessToken.js');
const globalState = require('./globalState.js');


exports.homePage = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
}
exports.spotifySearch = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/spotifySearch.html'));
}
exports.getUserTracks = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/getUserTracks.html'));
}

exports.spotifyAuth = (req, res) => {
  const randomStr = randomBytes(16).toString('hex');
  let stateStr = `${globalState.userId}:${randomStr}`;
  globalState.setUserIdStateMap(globalState.userId, randomStr);
  globalState.incrementUserId();

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
}
exports.spotifyAuthToken = async (req, res) => {
  const code = req.query['code'];
  const error = req.query['error'];
  // need .toString() because URLSearchParams converts ':' to '%3A'; converts back
  const state = req.query['state'].toString();
  const [ stateUserId, returnedState ] = state.split(':');
  const savedState = globalState.getUserIdStateMap(stateUserId);
  globalState.deleteUserIdStateMap(stateUserId);

  if (returnedState !== savedState) {
    res.status(400).json({
      error: 'AUTH_STATE',
      error_msg: 'Error: authState did not match state from /spotifyAuth'
    });
    return;
  }

  if (error) {
    res.status(400).json({ error });
    return;
  }

  const spotifyTokenParams = new URLSearchParams({
    code: code.toString(),
    redirect_uri: process.env.REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  const _spotifyTokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body: spotifyTokenParams,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
    }
  }).then(res => res.json());

  const { access_token, token_type } = _spotifyTokenRes;

  const _spotifyProfileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { 'Authorization': `${token_type} ${access_token}`}
  }).then(res => res.json());
  const { display_name } = _spotifyProfileRes;

  res.json({
    access_token,
    token_type,
    display_name
  });
}
exports.searchTrack = async (req, res) => {
  if (globalState.spotifyToken === '' || Date.now() > globalState.spotifyTokenExpiry) {
    await getSpotifyAccessToken();
  }

  const searchQuery = req.query['search_query'].toString();
  const spotifySearchParams = new URLSearchParams({
    q: searchQuery,
    type: 'track',
    market: 'US',
    limit: 20,
    offset: 0
  });

  const spotifyResponse = await fetch(`https://api.spotify.com/v1/search?${spotifySearchParams}`, {
    method: 'GET',
    headers: {'Authorization': `${globalState.spotifyTokenType} ${globalState.spotifyToken}`}
  });
  const spotifyResponseJson = await spotifyResponse.json();

  res.json(spotifyResponseJson['tracks']);
}

exports.downloadTrack = (req, res) => {
  const trackUrl = req.body['track_url'];
  const artistName = req.body['artist_name'];
  const trackName = req.body['track_name'];

  const zotifyInstance = spawnSync('zotify',
    [
      trackUrl,
      `--root-path=${__dirname}/${process.env.MUSIC_ROOT_PATH}`,
      `--username=${process.env.SPOTIFY_USERNAME}`,
      `--password=${process.env.SPOTIFY_PASSWORD}`,
      `--output=${process.env.ZOTIFY_OUTPUT}`,
      `--download-quality=high`,
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
      'Content-Disposition': `attachment; filename=${encodeURIComponent(`${artistName} - ${trackName}.mp3`)}`
    });

    const readStream = createReadStream(trackFilePath);
    readStream.pipe(res);
  });
}
exports.getSavedTracks = async (req, res) => {
  const access_token = req.body['access_token'];
  const token_type = req.body['token_type'];
  const display_name = req.body['display_name'];

  const savedTracksParams = new URLSearchParams({
    limit: 50,
    offset: 0,
    market: 'US'
  })
  const savedTracksResponse = await fetch(`https://api.spotify.com/v1/me/tracks?${savedTracksParams}`, {
    headers: { 'Authorization': `${token_type} ${access_token}`}
  });
  const savedTracksJson = await savedTracksResponse.json();

  if (!existsSync(path.join(__dirname, `${process.env.TRACK_DATA_PATH}`))) {
    mkdirSync(path.join(__dirname, `${process.env.TRACK_DATA_PATH}`), { recursive: true });
  }

  savedTracksJson['items'].forEach(item => {
    writeFileSync(
      `${__dirname}/${process.env.TRACK_DATA_PATH}/${display_name}.txt`,
      `${item['track']['artists'][0]['name']},${item['track']['name']},${item['track']['external_urls']['spotify']}\n`,
      { flag: 'a' },
      err => console.log(err)
    );
  });

  res.send('Tracks retrieved');
}