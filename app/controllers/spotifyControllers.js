const archiver = require('archiver');
const { createReadStream, writeFileSync, mkdirSync, statSync, renameSync, readFileSync, truncateSync } = require('node:fs');
const path = require('node:path');
const { platform } = require('node:os');
const { randomBytes } = require('node:crypto');

const WorkerPool = require('../WorkerPool.js');
const getGenericSpotifyToken = require('../getGenericSpotifyToken.js');
const globalState = require('../globalState.js');
const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  DOWNLOAD_THREADS,
  SPOTIFY_AUTH_URL,
  SPOTIFY_CURRENT_USER_URL,
  SPOTIFY_TOKEN_URL,
  SPOTIFY_SEARCH_URL,
  PLAYLIST_FILES_PATH,
} = require('../constants.js');

const WORKER_POOL = new WorkerPool(DOWNLOAD_THREADS);

exports.search = (req, res) => {
  res.sendFile(path.join(__dirname, '../../views/spotify/search.html'));
}
exports.playlists = (req, res) => {
  res.sendFile(path.join(__dirname, '../../views/spotify/playlists.html'));
}

exports.auth = (req, res) => {
  const randomStr = randomBytes(16).toString('hex');
  let state = `${globalState.userId}:${randomStr}`;
  globalState.setUserIdStateMap(globalState.userId, randomStr);
  globalState.incrementUserId();

  res.redirect(302, SPOTIFY_AUTH_URL(state));
}
exports.token = async (req, res) => {
  const { code, error, state } = req.query;

  if (!isStateValid(state)) {
    res.status(500).type('text/plain').send('Internal Server Error: authState did not match state from /spotifyAuth');
    return;
  }
  if (error) {
    res.status(500).type('text/plain').send(`Internal Server Error: ${error}`);
    return;
  }

  const { access_token, token_type } = await getUserSpotifyToken(code);
  const { display_name } = await getSpotifyDisplayName(token_type, access_token);

  res.json({
    access_token,
    token_type,
    display_name
  });
}
exports.searchTracks = async (req, res) => {
  const { query } = req.body;
  await getGenericSpotifyToken();

  const tracks = await getSpotifyTracks(query);
  try {
    attachTrackDownloadStatus(tracks);
  } catch (err) {
    console.log(`${err}`);
    res.status(500).type('text/plain').send(`Internal Server Error: ${err}`);
  }

  res.json(_spotifyRes['tracks']);
}

exports.tracksStatus = async (req, res) => {
  const { tracks } = req.body;
  try {
    attachTrackDownloadStatus(tracks);
  } catch (err) {
    console.log(`${err}`);
    res.status(500).type('text/plain').send(`Internal Server Error: ${err}`);
  }
  res.json(tracks);
}
exports.playlistsStatus = (req, res) => {
  const { snapshots } = req.body;
  const playlistStatuses = {};

  snapshots.forEach(({ playlist_id, snapshot_id }) => {
    const savedSnapshot = globalState.getPlaylistSnapshot(playlist_id);

    if (savedSnapshot === snapshot_id) {
      playlistStatuses[playlist_id] = 'Downloaded';
    } else {
      globalState.deletePlaylistSnapshot(playlist_id);
      playlistStatuses[playlist_id] = 'Not Downloaded';
    }
  });

  res.json(playlistStatuses);
}
exports.downloadTrack = async (req, res) => {
  const { track_url, artists, track_name } = req.body;

  const mainArtist = artists.split(', ')[0];
  const expectedFilePath = `${__dirname}/../../Music/${mainArtist}/${artists} - ${track_name}.mp3`;

  try {
    let fileInfo = getFile(expectedFilePath);
    if (!fileInfo) {
      const downloadOutput = await spotdlDownload(track_url);

      const downloadFilePath = `${__dirname}/../../Music/${mainArtist}/${mainArtist} - ${track_name}.mp3`;
      fileInfo = getFile(downloadFilePath);
      if (!fileInfo) {
        throw new Error(`Newly downloaded track '${mainArtist} - ${track_name}.mp3' not found. ${downloadOutput}`);
      }

      renameSync(downloadFilePath, expectedFilePath);
    }
  } catch (err) {
    console.log(`${err}`);
    res.status(500).type('text/plain').send(`Internal Server Error: ${err}`);
  }

  res.type('audio/mpeg').set({
    'Content-Length': fileInfo.size,
    'Content-Disposition': `attachment; filename=${encodeURIComponent(`${artists} - ${track_name}.mp3`)}`
  });

  const readStream = createReadStream(expectedFilePath);
  readStream.pipe(res);
}
exports.downloadPlaylist = async (req, res) => {
  const {
    access_token,
    token_type,
    display_name,
    playlist_id,
    playlist_name
  } = req.body;

  const workerPlaylistId = playlist_id === 'liked_songs' ? `${display_name}_${playlist_id}` : playlist_id;
  if (WORKER_POOL.isDownloading(workerPlaylistId)) {
    const tracksRemaining = WORKER_POOL.tracksRemaining(workerPlaylistId);

    res.status(200).type('text/plain')
      .send(`Playlist is already downloading. ~${Math.ceil((tracksRemaining * 2) / 60)} hours remaining.`);
    return;
  }

  try {
    mkdirSync(path.join(__dirname, `/../../${PLAYLIST_FILES_PATH}`), { recursive: true });
    const playlistFilePath = `${__dirname}/../../${PLAYLIST_FILES_PATH}/${display_name} - ${playlist_name}.txt`;

    const snapshot_id = await getSpotifySnapshotId(playlist_id);
    if (snapshot_id === globalState.getPlaylistSnapshot(playlist_id)) {
      const tracks = readFileSync(playlistFilePath, 'utf-8').split('\n');

      res.type('application/zip').set('Content-Disposition', 'attachment; filename=songs.zip');
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      archiveTracks(archive, tracks);
      archive.finalize();
      return;
    }
    globalState.deletePlaylistSnapshot(playlist_id);

    const tracks = await writeAllPlaylistSongsToFile(playlist_id, playlistFilePath, token_type, access_token);
    const missingSongs = playlistTracksStatus(tracks, workerPlaylistId, snapshot_id);
    if (missingSongs) {
      res.status(200).type('text/plain')
        .send(`Tracks written and download started. Please come back in ~${Math.ceil((tracks.length * 2) / 60)} hours.`);
      return;
    }

    res.type('application/zip').set('Content-Disposition', 'attachment; filename=songs.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    archiveTracks(archive, tracks);
    archive.finalize();
  } catch (err) {
    console.log(`${err}`);
    res.status(500).type('text/plain').send(`Internal Server Error: ${err}`);
  }
}

function isStateValid(state) {
  const [ stateUserId, spotifyState ] = state.toString().split(':');
  const savedState = globalState.getUserIdStateMap(stateUserId);
  globalState.deleteUserIdStateMap(stateUserId);

  return spotifyState === savedState;
}

async function getUserSpotifyToken(code) {
  return await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    body: {
      code: code.toString(),
      redirect_uri: SPOTIFY_REDIRECT_URI,
      grant_type: 'authorization_code'
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${ new Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64') }`
    }
  }).then(res => res.json());
}

async function getSpotifyDisplayName(tokenType, accessToken) {
  return await fetch(SPOTIFY_CURRENT_USER_URL, {
    headers: { 'Authorization': `${tokenType} ${accessToken}`}
  }).then(res => res.json());
}

async function getSpotifyTracks(query) {
  const _spotifyRes = await fetch(SPOTIFY_SEARCH_URL(query), {
    method: 'GET',
    headers: { 'Authorization': `${globalState.spotifyTokenType} ${globalState.spotifyToken}` }
  }).then(res => res.json());

  return _spotifyRes['tracks']['items'];
}

function attachTrackDownloadStatus(tracks) {
  tracks.forEach((track) => {
    const artistNames = track['artists'].map((artist) => artist['name']);
    const trackName = track['name'];
    const trackFilePath = `${__dirname}/../../Music/${artistNames[0]}/${artistNames.join(', ')} - ${trackName}.mp3`;

    track['downloaded'] = Boolean(getFile(trackFilePath));
  });
  return tracks;
}



async function getSpotifySnapshotId(playlistId) {
  const _snapshotParams = new URLSearchParams({ fields: 'snapshot_id' });
  return playlistId === 'liked_songs' ? '' : await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?${_snapshotParams}`, {
    headers: { 'Authorization': `${token_type} ${access_token}` }
  }).then(res => res.json()).then(res => res['snapshot_id']);
}

function isEmptyObj(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

function getFile(path) {
  try {
    return statSync(path);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Error getting file: ${err}`);
  }
}

async function spotdlDownload(trackUrl) {
  return new Promise((resolve, reject) => {
    const spotdl = spawn(...spotdlArgs(trackUrl));

    let STDOUT = '';
    let STDERR = '';

    spotdl.stdout.on('data', (data) => {
      STDOUT += data.toString();
    });
    spotdl.stderr.on('data', (data) => {
      STDERR += data.toString();
    });
    spotdl.on('close', (code) => {
      if (code === 0) {
        resolve(`Download STDOUT: ${STDOUT}. Download STDERR: ${STDERR}.`);
      }
      reject(code);
    });
  });
}

function playlistTracksStatus(tracks, playlistId, snapshotId) {
  let missingSongs = false;

  tracks.forEach((track) => {
    const [ artistsStr, trackName, trackUrl ] = track.split(',');
    const artists = artistsStr.split('-');
    const trackFilePath = `${__dirname}/../../Music/${artists[0]}/${artists.join(', ')} - ${trackName}.mp3`;

    const file = getFile(trackFilePath);
    if (!file) {
      missingSongs = true;
      WORKER_POOL.addTask(spotdlArgs(trackUrl), playlistId, snapshotId, artists, trackName);
    }
  });

  return missingSongs;
}

function spotdlArgs(trackUrl) {
  return [
    'spotdl',
    [
      `--output=./Music/${SPOTDL_TRACK_OUTPUT}`,
      `--format=${SPOTDL_TRACK_FORMAT}`,
      `--print-errors`,
      `${trackUrl}`,
    ],
    platform() === 'win32' ? { env: { PYTHONIOENCODING: 'utf-8' } } : {}
  ];
}

function clearFile(path) {
  try {
    truncateSync(path, 0);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw new Error(`Error clearing file: ${err}`);
    }
  }
}

function getPlaylistUrl(playlistId) {
  const _urls = { _nextUrl: null };

  if (playlistId === 'liked_songs') {
    const _likedSongsParams = new URLSearchParams({ limit: 50, offset: 0, market: 'US' });
    _urls['_defaultUrl'] = `https://api.spotify.com/v1/me/tracks?${_likedSongsParams}`;
  } else {
    const _playlistParams = new URLSearchParams({ market: 'US', fields: 'next,items(track(artists(name),name,external_urls))' });
    _urls['_defaultUrl'] = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?${_playlistParams}`;
  }

  return _urls;
}

async function writeAllPlaylistSongsToFile(playlistId, path, tokenType, accessToken) {
  clearFile(playlistFilePath);
  const { _nextUrl, _defaultUrl } = getPlaylistUrl(playlistId);
  const allTracks = [];

  // get all songs by visitng 'next' url
  do {
    const _url = _nextUrl || _defaultUrl;

    const _playlistSongsRes = await fetch(_url, {
      headers: { 'Authorization': `${tokenType} ${accessToken}` }
    }).then(res => res.json());

    if (isEmptyObj(_playlistSongsRes)) { break; }

    const tracks = _playlistSongsRes['items'].map(item => item['track']);
    _nextUrl = _playlistSongsRes['next'];

    tracks.forEach(({ artists, name, external_urls }) => {
      const artistsStr = artists.map(({ name }) => name).join('-');
      const track_url = external_urls['spotify'];

      const trackEntry = `${artistsStr},${name},${track_url}`;
      appendToFile(path, `${trackEntry}\n`);

      allTracks.push(trackEntry);
    });
  } while (_nextUrl);

  return allTracks;
}

function archiveTracks(archive, tracks) {
  tracks.forEach((track) => {
    const [ artistsStr, trackName, trackUrl ] = track.split(',');
    const artists = artistsStr.split('-');

    const trackFilePath = `${__dirname}/../../Music/${artists[0]}/${fileName}`;
    const fileName = `${artists.join(', ')} - ${trackName}.${SPOTDL_TRACK_FORMAT}`;
    archive.file(trackFilePath, { name: fileName });
  });
}

function appendToFile(path, data) {
  try {
    writeFileSync(path, data, { flag: 'a' });
  } catch (err) {
    throw new Error(`Error appending to file: ${err}`);
  }
}