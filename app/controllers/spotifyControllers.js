require('dotenv').config();

const archiver = require('archiver');
const { createReadStream, writeFileSync, mkdirSync, existsSync, statSync, truncate, readFile, renameSync } = require('node:fs');
const path = require('node:path');
const { platform } = require('node:os');
const { randomBytes } = require('node:crypto');

const WorkerPool = require('../WorkerPool.js');
const getSpotifyAccessToken = require('../getSpotifyAccessToken.js');
const globalState = require('../globalState.js');

const SPOTDL_TRACK_OUTPUT = process.env.SPOTDL_TRACK_OUTPUT || '{artist}/{artist} - {title}.{output-ext}';
const SPOTDL_TRACK_FORMAT = process.env.SPOTDL_TRACK_FORMAT || 'mp3';

const DOWNLOAD_THREADS = process.env.DOWNLOAD_THREADS || 1;
const WORKER_POOL = new WorkerPool(DOWNLOAD_THREADS);

exports.search = (req, res) => {
  res.sendFile(path.join(__dirname, '../../views/spotify/search.html'));
}
exports.playlists = (req, res) => {
  res.sendFile(path.join(__dirname, '../../views/spotify/playlists.html'));
}

exports.auth = (req, res) => {
  const randomStr = randomBytes(16).toString('hex');
  let stateStr = `${globalState.userId}:${randomStr}`;
  globalState.setUserIdStateMap(globalState.userId, randomStr);
  globalState.incrementUserId();

  const scope = 'user-library-read playlist-read-private';

  const _spotifyAuthParams = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CLIENT_ID,
    scope: scope,
    redirect_uri: process.env.REDIRECT_URI,
    state: stateStr,
    show_dialog: true
  });

  res.redirect(302, `https://accounts.spotify.com/authorize?${_spotifyAuthParams}`);
}
exports.token = async (req, res) => {
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

  const _spotifyTokenParams = new URLSearchParams({
    code: code.toString(),
    redirect_uri: process.env.REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  const _spotifyTokenRes = await fetch(`https://accounts.spotify.com/api/token?${_spotifyTokenParams}`, {
    method: 'POST',
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
exports.searchTracks = async (req, res) => {
  if (globalState.spotifyToken === '' || Date.now() > globalState.spotifyTokenExpiry) {
    await getSpotifyAccessToken();
  }

  const query = decodeURIComponent(req.params.query);
  const _spotifySearchParams = new URLSearchParams({
    q: query,
    type: 'track',
    market: 'US',
    limit: 20,
    offset: 0
  });
  const _spotifyRes = await fetch(`https://api.spotify.com/v1/search?${_spotifySearchParams}`, {
    method: 'GET',
    headers: {'Authorization': `${globalState.spotifyTokenType} ${globalState.spotifyToken}`}
  }).then(res => res.json());

  _spotifyRes['tracks']['items'].forEach((track) => {
    const artistNames = track['artists'].map((artist) => artist['name']);
    const trackName = track['name'];
    const trackFilePath = `${__dirname}/../../Music/${artistNames[0]}/${artistNames.join(', ')} - ${trackName}.mp3`;

    try {
      const fileInfo = statSync(trackFilePath);
      track['downloaded'] = true;
    } catch (err) {
      track['downloaded'] = false;
    }
  });

  res.json(_spotifyRes['tracks']);
}

exports.tracksStatus = async (req, res) => {
  const tracks = req.body['tracks'];

  tracks.forEach((track) => {
    const artistNames = track['artists'].map((artist) => artist['name']);
    const trackName = track['name'];
    const trackFilePath = `${__dirname}/../../Music/${artistNames[0]}/${artistNames.join(', ')} - ${trackName}.mp3`;

    try {
      const fileInfo = statSync(trackFilePath);
      track['downloaded'] = true;
    } catch (err) {
      track['downloaded'] = false;
    }
  });

  res.json(tracks);
}
exports.playlistsStatus = (req, res) => {
  const snapshots = req.body['snapshots'];
  const playlistStatuses = {};

  for (let i = 0; i < snapshots.length; i++) {
    const { playlist_id, snapshot_id } = snapshots[i];
    const savedSnapshot = globalState.getPlaylistSnapshot(playlist_id);
    if (savedSnapshot) {
      if (savedSnapshot === snapshot_id) {
        playlistStatuses[playlist_id] = 'Downloaded';
      } else {
        globalState.deletePlaylistSnapshot(playlist_id);
        playlistStatuses[playlist_id] = 'Not Downloaded';
      }
    } else {
      playlistStatuses[playlist_id] = 'Not Downloaded';
    }
  }

  res.json(playlistStatuses);
}
exports.downloadTrack = async (req, res) => {
  const { track_url, artists, track_name } = req.body;

  const mainArtist = artists.split(', ')[0];
  const expectedFilePath = `${__dirname}/../../Music/${mainArtist}/${artists} - ${track_name}.mp3`;

  try {
    let fileInfo = getFile(expectedFilePath);
    if (!fileInfo) {
      const downloadFilePath = `${__dirname}/../../Music/${mainArtist}/${mainArtist} - ${track_name}.mp3`;

      const downloadOutput = await spotdlDownload(track_url);
      fileInfo = getFile(downloadFilePath);

      if (!fileInfo) {
        throw new Error(`Newly downloaded track '${mainArtist} - ${track_name}.mp3' not found. ${downloadOutput}`);
      }

      renameSync(downloadFilePath, expectedFilePath);
    }
  } catch (err) {
    res.status(500).json({ err });
  }

  res.set({
    'Content-Type': 'audio/mpeg',
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

  // get current snapshot_id of playlist
  const _snapshotParams = new URLSearchParams({ fields: 'snapshot_id' });
  const snapshot_id = playlist_id === 'liked_songs' ? '' : await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}?${_snapshotParams}`, {
      headers: {
        'Authorization': `${token_type} ${access_token}` }
      }).then(res => res.json()).then(res => res['snapshot_id']);

  // Check if playlist_id is already downloading
  if (WORKER_POOL.isDownloading(playlist_id === 'liked_songs' ? `${display_name}_${playlist_id}` : playlist_id)) {
    const tracksRemaining = WORKER_POOL.tracksRemaining(playlist_id === 'liked_songs' ? `${display_name}_${playlist_id}` : playlist_id);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Playlist is already downloading. ~${Math.ceil((tracksRemaining * 2) / 60)} hours remaining.`);
    return;
  }

  // create dir for playlist files
  if (!existsSync(path.join(__dirname, `/../../${process.env.PLAYLIST_DATA_PATH}`))) {
    mkdirSync(path.join(__dirname, `/../../${process.env.PLAYLIST_DATA_PATH}`), { recursive: true });
  }

  const playlistFilePath = `${__dirname}/../../${process.env.PLAYLIST_DATA_PATH}/${display_name} - ${playlist_name}.txt`;

  // if snapshot_id exists and is already downloaded, zip up songs and send to client
  if (snapshot_id.length && snapshot_id === globalState.getPlaylistSnapshot(playlist_id)) {
    readFile(playlistFilePath, 'utf-8', async (err, data) => {
      if (err) {
        console.log(`Error reading playlist file: ${err}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      try {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const lines = data.split('\n');

        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename=songs.zip',
        });

        archive.pipe(res);

        for (let i = 0; i < lines.length - 1; i++) {
          const [ artistsStr, trackName, trackUrl ] = lines[i].split(',');
          const artists = artistsStr.split('-');

          const trackFilePath = `${__dirname}/../../Music/${artists[0]}/${artists.join(', ')} - ${trackName}.mp3`;
          archive.file(trackFilePath, { name: `${artists.join(', ')} - ${trackName}.mp3` });
        }

        archive.finalize();
      } catch (err) {
        console.error('Error archiving files:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
    return;
  } // if it doesn't match, delete it
  else {
    globalState.deletePlaylistSnapshot(playlist_id);
  }

  // Reset playlist file
  truncate(playlistFilePath, 0, (err) => {
    if (err) {
      if (err.code !== 'ENOENT') {
        console.log(`Error truncating file: ${err}`);
      }
    }
  });

  // query liked songs or playlist songs
  let _nextUrl = null;
  let _defaultUrl = null;
  if (playlist_id === 'liked_songs') {
    const _likedSongsParams = new URLSearchParams({
      limit: 50,
      offset: 0,
      market: 'US'
    });
    _defaultUrl = `https://api.spotify.com/v1/me/tracks?${_likedSongsParams}`;
  } else {
    const _playlistParams = new URLSearchParams({
      market: 'US',
      fields: 'next,items(track(artists(name),name,external_urls)',
    });
    // https://api.spotify.com/v1/playlists/${playlist_id}/tracks <- 'tracks' is added at the end to only get tracks info
    // also 'next' has it while the API docs don't for the first req, lead to error where data wouldn't be retrieved cause different
    // format for 'fields' was needed
    _defaultUrl = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks?${_playlistParams}`;
  }

  // get all songs by visitng 'next' url
  do {
    const _url = _nextUrl || _defaultUrl;

    const _playlistRes = await fetch(_url, {
      headers: { 'Authorization': `${token_type} ${access_token}` }
    }).then(res => res.json());

    if (isEmptyObj(_playlistRes)) {
      break;
    }

    let items = null;
    if (playlist_id === 'liked_songs') {
      items = _playlistRes['items'];
      _nextUrl = _playlistRes['next'];
    } else {
      items = _playlistRes['items'];
      _nextUrl = _playlistRes['next'];
    }

    items.forEach(item => {
      const artists = item['track']['artists'].map(artistObj => artistObj['name']).join('-');
      const track_name = item['track']['name'];
      const track_url = item['track']['external_urls']['spotify'];

      writeFileSync(
        playlistFilePath,
        `${artists},${track_name},${track_url}\n`,
        { flag: 'a' },
        err => console.log(err)
      );
    });
  } while (_nextUrl);

  // go through playlist file, if all songs exist return zip file, if missing, start downloading
  let missingSongs = false;
  readFile(playlistFilePath, 'utf-8', async (err, data) => {
    if (err) {
      console.log(`Error reading playlist file: ${err}`);
      return;
    }

    const lines = data.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const [ artistsStr, trackName, trackUrl ] = lines[i].split(',');
      const artists = artistsStr.split('-');

      const trackFilePath = `${__dirname}/../../Music/${artists[0]}/${artists.join(', ')} - ${trackName}.mp3`;
      try {
        statSync(trackFilePath);
      } catch (err) {
        if (err.code === 'ENOENT') {
          missingSongs = true;

          const spotdlArgs = ['spotdl', [
              `--output=./Music/${TRACK_OUTPUT}`,
              `--format=${TRACK_FORMAT}`,
              `--print-errors`,
              `${trackUrl}`,
            ],
            platform() === 'win32' ? {
              env: { PYTHONIOENCODING: 'utf-8' }
            } : {}
          ];
          WORKER_POOL.addTask(spotdlArgs, playlist_id === 'liked_songs' ? `${display_name}_${playlist_id}` : playlist_id, snapshot_id, artists, trackName);
        } else {
          console.log(`Stat error: ${err}`);
        }
      }
    }

    const trackNum = lines.length - 1;

    // if songs not downloaded, send update, else send zip file
    if (missingSongs) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Tracks written and download started. Please come back in ~${Math.ceil((trackNum * 2) / 60)} hours.`);
    } else {
      readFile(playlistFilePath, 'utf-8', async (err, data) => {
        if (err) {
          console.log(`Error reading playlist file: ${err}`);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          return;
        }

        try {
          const archive = archiver('zip', { zlib: { level: 9 } });
          const lines = data.split('\n');

          res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename=songs.zip',
          });

          archive.pipe(res);

          for (let i = 0; i < lines.length - 1; i++) {
            const [ artistsStr, trackName, trackUrl ] = lines[i].split(',');
            const artists = artistsStr.split('-');

            const trackFilePath = `${__dirname}/../../Music/${artists[0]}/${artists.join(', ')} - ${trackName}.mp3`;
            archive.file(trackFilePath, { name: `${artists.join(', ')} - ${trackName}.mp3` });
          }

          archive.finalize();
        } catch (err) {
          console.error('Error archiving files:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      });
    }
  });
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
    const spotdl = spawn('spotdl', [
      `--output=./Music/${SPOTDL_TRACK_OUTPUT}`,
      `--format=${SPOTDL_TRACK_FORMAT}`,
      `--print-errors`,
      `${trackUrl}`,
    ], platform() === 'win32' ? { env: { PYTHONIOENCODING: 'utf-8' } } : {});

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
