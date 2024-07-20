const archiver = require('archiver');
const { createReadStream, mkdirSync, renameSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');

const WorkerPool = require('../WorkerPool.js');
const getGenericSpotifyToken = require('../getGenericSpotifyToken.js');
const globalState = require('../globalState.js');
const { getFile, clearFile, appendToFile } = require('../fileOperations.js');
const {
  APP_DIR_PATH,
  SPOTDL_DIR,
  PLAYLIST_FILES_DIR,
  DOWNLOAD_THREADS,
  SPOTIFY_CURRENT_USER_URL,
  CREATE_SPOTIFY_AUTH_URL,
  CREATE_SPOTIFY_SEARCH_URL,
  CREATE_SPOTIFY_SNAPSHOT_URL,
  CREATE_SPOTIFY_PLAYLIST_TRACKS_URL,
  CREATE_SPOTIFY_SAVED_TRACKS_URL,
  GET_SPOTIFY_USER_TOKEN,
  SPOTDL_ARGS,
  SPOTDL_FORMAT,
} = require('../constants.js');

const WORKER_POOL = new WorkerPool(DOWNLOAD_THREADS);

exports.search = (req, res) => {
  res.sendFile(path.join(APP_DIR_PATH, 'views/spotify/search.html'));
}
exports.playlists = (req, res) => {
  res.sendFile(path.join(APP_DIR_PATH, 'views/spotify/playlists.html'));
}

exports.auth = (req, res) => {
  const randomStr = randomBytes(16).toString('hex');
  let state = `${globalState.userId}:${randomStr}`;
  globalState.setUserIdStateMap(globalState.userId, randomStr);
  globalState.incrementUserId();

  res.redirect(302, CREATE_SPOTIFY_AUTH_URL(state));
}
exports.token = async (req, res) => {
  const { code, error, state } = req.query;

  if (!globalState.isAuthStateValid(state)) {
    handleServerError(res, 'authState did not match state from /spotifyAuth');
    return;
  }
  if (error) {
    handleServerError(res, err)
    return;
  }

  const { access_token, token_type } = await GET_SPOTIFY_USER_TOKEN(code);
  const { display_name } = await getSpotifyDisplayName(token_type, access_token);

  res.json({
    access_token,
    token_type,
    display_name
  });
}
exports.searchTracks = async (req, res) => {
  const query = req.params.query;
  await getGenericSpotifyToken();

  const tracks = await getSpotifyTracks(query);
  try {
    attachTrackDownloadStatus(tracks);
  } catch (err) {
    handleServerError(res, err);
    return;
  }

  res.json(tracks);
}

exports.tracksStatus = async (req, res) => {
  const { tracks } = req.body;
  try {
    attachTrackDownloadStatus(tracks);
  } catch (err) {
    handleServerError(res, err);
    return;
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
  const expectedFilePath = path.join(APP_DIR_PATH, SPOTDL_DIR, mainArtist, `${artists} - ${track_name}.${SPOTDL_FORMAT}`);

  try {
    let fileInfo = getFile(expectedFilePath);
    if (!fileInfo) {
      const downloadOutput = await singleSpotdlDownload(track_url);

      const downloadFilePath = path.join(APP_DIR_PATH, SPOTDL_DIR, mainArtist, `${mainArtist} - ${track_name}.${SPOTDL_FORMAT}`);
      fileInfo = getFile(downloadFilePath);
      if (!fileInfo) {
        throw new Error(`Newly downloaded track '${mainArtist} - ${track_name}.mp3' not found. ${downloadOutput}`);
      }

      renameSync(downloadFilePath, expectedFilePath);
    }

    res.type('audio/mpeg').set({
      'Content-Length': fileInfo.size,
      'Content-Disposition': `attachment; filename=${encodeURIComponent(`${artists} - ${track_name}.mp3`)}`
    });

    const readStream = createReadStream(expectedFilePath);
    readStream.pipe(res);
  } catch (err) {
    handleServerError(res, err);
    return;
  }
}
exports.downloadPlaylist = async (req, res) => {
  const {
    access_token,
    token_type,
    display_name,
    playlist_id,
    playlist_name
  } = req.body;

  const workerPlaylistId = playlist_id === 'liked_songs' ? `${display_name}_LikedSongs` : playlist_id;
  if (WORKER_POOL.isDownloading(workerPlaylistId)) {
    const tracksRemaining = WORKER_POOL.tracksRemaining(workerPlaylistId);

    res.status(200).type('text/plain')
      .send(`Playlist is already downloading. ~${Math.ceil((tracksRemaining * 2) / 60)} hours remaining.`);
    return;
  }

  try {
    mkdirSync(path.join(APP_DIR_PATH, PLAYLIST_FILES_DIR), { recursive: true });
    const playlistFilePath = path.join(APP_DIR_PATH, PLAYLIST_FILES_DIR, `${display_name} - ${playlist_name}.txt`);

    if (await matchingSnapshotId(playlist_id)) {
      const tracks = readFileSync(playlistFilePath, 'utf-8').split('\n');

      sendArchiveToClient(res, tracks);
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

    sendArchiveToClient(res, tracks);
  } catch (err) {
    handleServerError(res, err);
    return;
  }
}

function handleServerError(res, err) {
  console.log(`${err}`);
  res.status(500).type('text/plain').send(`Internal Server Error: ${err}`);
}

async function getSpotifyDisplayName(tokenType, accessToken) {
  return await fetch(SPOTIFY_CURRENT_USER_URL, {
    headers: { 'Authorization': `${tokenType} ${accessToken}`}
  }).then(res => res.json());
}

async function getSpotifyTracks(query) {
  const _spotifyRes = await fetch(CREATE_SPOTIFY_SEARCH_URL(query), {
    method: 'GET',
    headers: { 'Authorization': `${globalState.spotifyTokenType} ${globalState.spotifyToken}` }
  }).then(res => res.json());

  return _spotifyRes['tracks']['items'];
}

function attachTrackDownloadStatus(tracks) {
  tracks.forEach((track) => {
    const artistNames = track['artists'].map((artist) => artist['name']);
    const trackName = track['name'];
    const trackFilePath = path.join(APP_DIR_PATH, SPOTDL_DIR, artistNames[0], `${artistNames.join(', ')} - ${trackName}.${SPOTDL_FORMAT}`);

    track['downloaded'] = Boolean(getFile(trackFilePath));
  });
  return tracks;
}

async function getSpotifySnapshotId(playlistId) {
  return playlistId === 'liked_songs' ? '' : await fetch(CREATE_SPOTIFY_SNAPSHOT_URL(playlistId), {
    headers: { 'Authorization': `${globalState.spotifyTokenType} ${globalState.spotifyToken}` }
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

async function singleSpotdlDownload(trackUrl) {
  return new Promise((resolve, reject) => {
    const spotdl = spawn(...SPOTDL_ARGS(trackUrl));

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
    const fileName = `${artists.join(', ')} - ${trackName}.${SPOTDL_FORMAT}`;
    const trackFilePath = path.join(APP_DIR_PATH, SPOTDL_DIR, artists[0], fileName);

    const file = getFile(trackFilePath);
    if (!file) {
      missingSongs = true;
      WORKER_POOL.addTask(spotdlArgs(trackUrl), playlistId, snapshotId, artists, trackName);
    }
  });

  return missingSongs;
}

function getPlaylistUrl(playlistId) {
  const _urls = {
    _nextUrl: null,
    _defaultUrl: playlistId === 'liked_songs' ? CREATE_SPOTIFY_SAVED_TRACKS_URL() : CREATE_SPOTIFY_PLAYLIST_TRACKS_URL(playlistId)
  };

  return _urls;
}

async function matchingSnapshotId(playlistId) {
  const spotifySnapshotId = await getSpotifySnapshotId(playlistId);
  const savedSnapshotId = globalState.getPlaylistSnapshot(playlistId);

  return spotifySnapshotId === savedSnapshotId;
}

async function writeAllPlaylistSongsToFile(playlistId, path, tokenType, accessToken) {
  clearFile(path);
  const { _nextUrl, _defaultUrl } = getPlaylistUrl(playlistId);
  const allTracks = [];

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

    const fileName = `${artists.join(', ')} - ${trackName}.${SPOTDL_FORMAT}`;
    const trackFilePath = path.join(APP_DIR_PATH, SPOTDL_DIR, artists[0], fileName);
    archive.file(trackFilePath, { name: fileName });
  });
}

function sendArchiveToClient(res, tracks) {
  res.type('application/zip').set('Content-Disposition', 'attachment; filename=songs.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archiveTracks(archive, tracks);
  archive.finalize();
}