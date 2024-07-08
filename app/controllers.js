require('dotenv').config();

const archiver = require('archiver');
const { randomBytes } = require('node:crypto');
const { createReadStream, writeFileSync, mkdirSync, existsSync, statSync, truncate, readFile, stat, renameSync } = require('node:fs');
const { platform } = require('node:os');
const path = require('node:path');

const WorkerPool = require('./WorkerPool.js');
const getSpotifyAccessToken = require('./getSpotifyAccessToken.js');
const globalState = require('./globalState.js');
const { spawnAsync } = require('./spawnAsync.js');

const TRACK_OUTPUT = process.env.TRACK_OUTPUT || '{artist}/{artists} - {title}.{output-ext}';
const TRACK_FORMAT = process.env.TRACK_FORMAT || 'mp3';
const DOWNLOAD_THREADS = process.env.DOWNLOAD_THREADS || 1;

const WORKER_POOL = new WorkerPool(DOWNLOAD_THREADS);

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
  const _spotifySearchParams = new URLSearchParams({
    q: searchQuery,
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
    const trackFilePath = `${__dirname}/../Music/${artistNames[0]}/${artistNames.join(', ')} - ${trackName}.mp3`;

    try {
      const fileInfo = statSync(trackFilePath);
      track['downloaded'] = true;
    } catch (err) {
      track['downloaded'] = false;
    }
  });

  res.json(_spotifyRes['tracks']);
}
exports.getPlaylistSongs = async (req, res) => {
  const playlist_id = req.query['playlist_id'];
  const access_token = req.query['access_token'];
  const token_type = req.query['token_type'];

  let url = null;
  if (playlist_id === 'liked_songs') {
    const _savedTracksParams = new URLSearchParams({
      limit: 50,
      offset: 0,
      market: 'US'
    });
    url = `https://api.spotify.com/v1/me/tracks?${_savedTracksParams}`;
  } else {
    const _playlistParams = new URLSearchParams({
      market: 'US',
      fields: 'items(track(album(images,name),artists(name),name,duration_ms,external_urls)',
    });
    url = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks?${_playlistParams}`;
  }

  const _playlistRes = await fetch(url, {
    headers: { 'Authorization': `${token_type} ${access_token}`}
  }).then(res => res.json());
  const tracks = _playlistRes['items'].map((item) => item['track']);

  tracks.forEach((track) => {
    const artistNames = track['artists'].map((artist) => artist['name']);
    const trackName = track['name'];
    const trackFilePath = `${__dirname}/../Music/${artistNames[0]}/${artistNames.join(', ')} - ${trackName}.mp3`;

    try {
      const fileInfo = statSync(trackFilePath);
      track['downloaded'] = true;
    } catch (err) {
      track['downloaded'] = false;
    }
  });

  res.json(tracks);
}

exports.downloadTrack = async (req, res) => {
  const trackUrl = req.body['track_url'];
  const artistNames = req.body['artist_name'];
  const trackName = req.body['track_name'];

  let fileInfo;
  const trackFilePath = `${__dirname}/../Music/${artistNames.split(', ')[0]}/${artistNames} - ${trackName}.mp3`;
  const trackFilePathAlt = `${__dirname}/../Music/${artistNames.split(', ')[0]}/${artistNames.split(', ')[0]} - ${trackName}.mp3`;
  // check if file is already downloaded
  try {
    fileInfo = statSync(trackFilePath);
  } catch (err) {
    // Not downloaded, download
    if (err.code === 'ENOENT') {
      try {
        await spawnAsync('spotdl', [
          `--output=./Music/${TRACK_OUTPUT}`,
          `--format=${TRACK_FORMAT}`,
          `--print-errors`,
          `${trackUrl}`,
        ],
          platform() === 'win32' ? {
            env: { PYTHONIOENCODING: 'utf-8' }
          } : {}
        );
      } catch (err) {
        console.log(`/downloadTrack error: ${err}`);
      }

      // Get file info with expected name '/artist1, artist2 - trackName.mp3'
      try {
        fileInfo = statSync(trackFilePath);
      } catch (er) {
        // Try alternate name '/artist1 - trackName.mp3'
        try {
          fileInfo = statSync(trackFilePathAlt);
          // Rename to include all artists
          try {
            renameSync(trackFilePathAlt, trackFilePath);
          } catch(e) {
            console.log(`Error renaming file: ${e}`);
            res.status(404).send(`Err: ${e}`);
            return;
          }
        } catch (e) {
          res.status(404).send(`Err: ${e}`);
          return;
        }
      }
    } else {
      res.status(404).send(`Error: ${err}`);
      return;
    }
  }

  res.set({
    'Content-Type': 'audio/mpeg',
    'Content-Length': fileInfo.size,
    'Content-Disposition': `attachment; filename=${encodeURIComponent(`${artistNames} - ${trackName}.mp3`)}`
  });

  const readStream = createReadStream(trackFilePath);
  readStream.pipe(res);
}
exports.downloadPlaylist = async (req, res) => {
  const access_token = req.body['access_token'];
  const token_type = req.body['token_type'];
  const display_name = req.body['display_name'];
  const playlist_id = req.body['playlist_id'];
  const playlist_name = req.body['playlist_name'];

  const _snapshotParams = new URLSearchParams({ fields: 'snapshot_id' });
  const snapshot_id = playlist_id === 'liked_songs' ? '' : await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}?${_snapshotParams}`, {
      headers: {
        'Authorization': `${token_type} ${access_token}` }
      }).then(res => res.json()).then(res => res['snapshot_id']);

  if (WORKER_POOL.isDownloading(playlist_id === 'liked_songs' ? `${display_name}_${playlist_id}` : playlist_id)) {
    const tracksRemaining = WORKER_POOL.tracksRemaining(playlist_id === 'liked_songs' ? `${display_name}_${playlist_id}` : playlist_id);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Playlist is already downloading. ~${Math.ceil((tracksRemaining * 2) / 60)} hours remaining.`);
    return;
  }

  if (!existsSync(path.join(__dirname, `/../${process.env.PLAYLIST_DATA_PATH}`))) {
    mkdirSync(path.join(__dirname, `/../${process.env.PLAYLIST_DATA_PATH}`), { recursive: true });
  }

  const playlistFilePath = `${__dirname}/../${process.env.PLAYLIST_DATA_PATH}/${display_name} - ${playlist_name}.txt`;
  truncate(playlistFilePath, 0, (err) => {
    if (err) {
      if (err.code !== 'ENOENT') {
        console.log(`Error truncating file: ${err}`);
      }
    }
  });

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

      const trackFilePath = `${__dirname}/../Music/${artists[0]}/${artists.join(', ')} - ${trackName}.mp3`;
      try {
        statSync(trackFilePath);
      } catch (err) {
        if (err.code === 'ENOENT') {
          missingSongs = true;

          const args = ['spotdl', [
              `--output=./Music/${TRACK_OUTPUT}`,
              `--format=${TRACK_FORMAT}`,
              `--print-errors`,
              `${trackUrl}`,
            ],
            platform() === 'win32' ? {
              env: { PYTHONIOENCODING: 'utf-8' }
            } : {}
          ];
          WORKER_POOL.addTask(args, playlist_id === 'liked_songs' ? `${display_name}_${playlist_id}` : playlist_id, snapshot_id);
        } else {
          console.log(`Stat error: ${err}`);
        }
      }
    }

    const trackNum = lines.length - 1;

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

            const trackFilePath = `${__dirname}/../Music/${artists[0]}/${artists.join(', ')} - ${trackName}.mp3`;
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