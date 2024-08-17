import archiver, { Archiver } from 'archiver';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { Request, Response } from 'express';
import { createReadStream, mkdirSync, renameSync, readFileSync } from 'node:fs';
import path from 'node:path';

import Track from '../Track.js';
import globalState from '../globalState.js';
import { getFile, clearFile, appendToFile } from '../fileOperations.js';
import WorkerPool from '../WorkerPool.js';
import {
  ROOT_DIR_PATH,
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
  ZOTIFY_ARGS,
  ZOTIFY_DIR,
  ZOTIFY_FORMAT,
  SPOTDL,
  spotdlFileSanitize,
  zotifyFileSanitize,
  SET_GENERIC_SPOTIFY_TOKEN
} from '../constants.js';
import {
  AvailablePlaylistTracksReqBody,
  DownloadPlaylistAvailableReqBody,
  DownloadPlaylistReqBody,
  DownloadTrackReqBody,
  PlaylistsStatusReqBody,
  SearchTracksReqQuery,
  TokenReqQuery,
  TracksStatusReqBody
} from 'src/RequestInterfaces.js';

const WORKER_POOL = new WorkerPool(DOWNLOAD_THREADS);

export const search = (req: Request, res: Response) => {
  res.sendFile(path.join(ROOT_DIR_PATH, 'views/spotify/search.html'));
}
export const playlists = (req: Request, res: Response) => {
  res.sendFile(path.join(ROOT_DIR_PATH, 'views/spotify/playlists.html'));
}

export const auth = (req: Request, res: Response) => {
  const randomStr: string = randomBytes(16).toString('hex');
  let state: string = `${globalState.userId}:${randomStr}`;
  globalState.setUserIdStateMap(globalState.userId.toString(), randomStr);
  globalState.incrementUserId();

  res.redirect(302, CREATE_SPOTIFY_AUTH_URL(state));
}
export const token = async (req: TokenReqQuery, res: Response) => {
  const { code, state, error } = req.query;

  try {
    if (!globalState.isAuthStateValid(state)) {
      throw new Error('authState did not match state from /spotify/auth');
    }
    if (error) {
      throw new Error(`Status: ${error.status}. Error: ${error.message}`)
    }

    const { access_token, token_type } = await GET_SPOTIFY_USER_TOKEN(code);
    const display_name = await getSpotifyDisplayName(token_type, access_token);

    res.json({
      access_token,
      token_type,
      display_name
    });
  } catch (err) {
    handleServerError(res, err as Error);
  }
}
export const searchTracks = async (req: SearchTracksReqQuery, res: Response) => {
  const { query, downloader } = req.query;
  await SET_GENERIC_SPOTIFY_TOKEN();

  const tracks: SpotifyTrack[] = await getSpotifyTracks(query);
  try {
    attachTrackDownloadStatus(tracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
    return;
  }

  res.json(tracks);
}

export const tracksStatus = (req: TracksStatusReqBody, res: Response) => {
  const { tracks, downloader } = req.body;

  try {
    attachTrackDownloadStatus(tracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
    return;
  }
  res.json(tracks);
}

export class SpotifyPlaylist {
  id: string;
  imageUrl: string;
  name: string;
  tracksTotal: number;
  snapshotId: string;
  downloadStatus: DownloadStatus;
  downloader: Downloader;

  constructor(playlist: Record<string, any>) {
    this.id = playlist['id'];
    this.imageUrl = playlist['images'][0]['url'];
    this.name = playlist['name'];
    this.tracksTotal = playlist['tracks']['total'];
    this.snapshotId = playlist['snapshot_id'];
    this.downloadStatus = 'Not Downloaded';
    this.downloader = 'none';
  }
}

export const playlistsStatus = (req: PlaylistsStatusReqBody, res: Response) => {
  const { playlists, downloader } = req.body;

  for (const playlist of playlists) {
    const savedSnapshot = downloader === SPOTDL ?
    globalState.getSpotdlSnapshot(`${downloader}_${playlist.id}`) :
    globalState.getZotifySnapshot(`${downloader}_${playlist.id}`);

    if (savedSnapshot === playlist.snapshotId) {
      playlist.downloadStatus = 'Downloaded';
    } else if (WORKER_POOL.isDownloading(`${downloader}_${playlist.id}`)) {
      playlist.downloadStatus = 'Downloading';
    } else {
      downloader === SPOTDL ?
      globalState.deleteSpotdlSnapshot(`${downloader}_${playlist.id}`) :
      globalState.deleteZotifySnapshot(`${downloader}_${playlist.id}`);
      playlist.downloadStatus = 'Not Downloaded';
    }
    playlist.downloader = downloader;
  }

  res.json(playlists);
}
export const availablePlaylistTracks = async (req: AvailablePlaylistTracksReqBody, res: Response) => {
  const {
    access_token,
    token_type,
    display_name,
    playlist_id,
    playlist_name,
    downloader
  } = req.body;

  let downloadedTracks = 0;

  const correctedPlaylistName = playlist_name.replace(/([^a-zA-Z0-9_ ]+)/gi, '-');
  const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${display_name} - ${correctedPlaylistName}.txt`);
  const tracks = await writeAllPlaylistSongsToFile(playlist_id, playlistFilePath, token_type, access_token);

  tracks.forEach((track) => {
    const [ artistsStr, trackName, trackUrl ] = track.split(',');
    const sanitizedArtistsStr = downloader === SPOTDL ? spotdlFileSanitize(artistsStr) : zotifyFileSanitize(artistsStr);
    const sanitizedTrackName = downloader === SPOTDL ? spotdlFileSanitize(trackName) : zotifyFileSanitize(trackName);

    const artists = sanitizedArtistsStr.split('~');
    const fileName = `${artists.join(', ')} - ${sanitizedTrackName}.${downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT}`;

    const trackFilePath = path.join(ROOT_DIR_PATH, downloader === SPOTDL ? SPOTDL_DIR : ZOTIFY_DIR, artists[0], fileName);

    const file = getFile(trackFilePath);
    if (file) {
      downloadedTracks++;
    }
  });

  res.json({ downloaded_tracks: downloadedTracks });
}
export const downloadTrack = async (req: DownloadTrackReqBody, res: Response) => {
  const { track_url, downloader } = req.body;
  const artists = downloader === SPOTDL ? spotdlFileSanitize(req.body['artists']) : zotifyFileSanitize(req.body['artists']);
  const track_name = downloader === SPOTDL ? spotdlFileSanitize(req.body['track_name']) : zotifyFileSanitize(req.body['track_name']);
  const mainArtist = artists.split(', ')[0];

  const expectedFilePath = downloader === SPOTDL ?
    path.join(ROOT_DIR_PATH, SPOTDL_DIR, mainArtist, `${artists} - ${track_name}.${SPOTDL_FORMAT}`) :
    path.join(ROOT_DIR_PATH, ZOTIFY_DIR, mainArtist, `${artists} - ${track_name}.${ZOTIFY_FORMAT}`);

  try {
    let fileInfo = getFile(expectedFilePath);
    if (!fileInfo) {
      const downloadOutput = downloader === SPOTDL ?
        await singleSpotdlDownload(track_url) :
        await singleZotifyDownload(track_url);

      const downloadFilePath = downloader === SPOTDL ?
        path.join(ROOT_DIR_PATH, SPOTDL_DIR, mainArtist, `${mainArtist} - ${track_name}.${SPOTDL_FORMAT}`) :
        path.join(ROOT_DIR_PATH, ZOTIFY_DIR, mainArtist, `${mainArtist} - ${track_name}.${ZOTIFY_FORMAT}`);

      fileInfo = getFile(downloadFilePath);
      if (!fileInfo) {
        const dir = downloader === SPOTDL ? SPOTDL_DIR : ZOTIFY_DIR;
        const format = downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT;
        throw new Error(`Newly downloaded track '${mainArtist} - ${track_name}.${format}' not found in ${dir}. ${downloadOutput}`);
      }

      renameSync(downloadFilePath, expectedFilePath);
    }

    const spotdlSanitizedFileName = spotdlFileSanitize(`${artists} - ${track_name}.${downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT}`);
    res.type('audio/mpeg').set({
      'Content-Length': fileInfo.size,
      'Content-Disposition': `attachment; filename=${encodeURIComponent(spotdlSanitizedFileName)}`
    });

    const readStream = createReadStream(expectedFilePath);
    readStream.pipe(res);
  } catch (err) {
    handleServerError(res, err as Error);
    return;
  }
}
export const downloadPlaylist = async (req: DownloadPlaylistReqBody, res: Response) => {
  const {
    access_token,
    token_type,
    display_name,
    playlist_id,
    playlist_name,
    downloader
  } = req.body;

  await SET_GENERIC_SPOTIFY_TOKEN();

  const workerPlaylistId: string = playlist_id === 'liked_songs' ? `${downloader}_${display_name}_LikedSongs` : `${downloader}_${playlist_id}`;
  if (WORKER_POOL.isDownloading(workerPlaylistId)) {
    const tracksRemaining: number = WORKER_POOL.tracksRemaining(workerPlaylistId);

    res.status(200).type('text/plain')
      .send(`Playlist is already downloading. ~${Math.ceil((tracksRemaining * 2) / 60)} hours remaining.`);
    return;
  }

  try {
    mkdirSync(path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR), { recursive: true });
    const correctedPlaylistName = playlist_name.replace(/([^a-zA-Z0-9_ ]+)/gi, '-');
    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${display_name} - ${correctedPlaylistName}.txt`);

    const spotifySnapshotId = await getSpotifySnapshotId(playlist_id, access_token, token_type);
    const savedSnapshotId = downloader === SPOTDL ?
      globalState.getSpotdlSnapshot(workerPlaylistId) :
      globalState.getZotifySnapshot(workerPlaylistId);

    if (spotifySnapshotId === savedSnapshotId) {
      const tracks = readFileSync(playlistFilePath, 'utf-8').split('\n');

      sendArchiveToClient(res, tracks, downloader);
      return;
    }
    downloader === SPOTDL ?
      globalState.deleteSpotdlSnapshot(workerPlaylistId) :
      globalState.deleteZotifySnapshot(workerPlaylistId);

    const tracks = await writeAllPlaylistSongsToFile(playlist_id, playlistFilePath, token_type, access_token);
    const missingSongs = playlistTracksStatus(tracks, workerPlaylistId, spotifySnapshotId, downloader);
    if (missingSongs) {
      res.status(200).type('text/plain')
        .send(`Tracks written and download started. Please come back in ~${Math.ceil((tracks.length * 2) / 60)} hours.`);
      return;
    }

    downloader === SPOTDL ?
      globalState.setSpotdlSnapshot(workerPlaylistId, spotifySnapshotId) :
      globalState.setZotifySnapshot(workerPlaylistId, spotifySnapshotId);
    sendArchiveToClient(res, tracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
    return;
  }
}
export const downloadPlaylistAvailable = async (req: DownloadPlaylistAvailableReqBody, res: Response) => {
  const {
    display_name,
    playlist_name,
    downloader
  } = req.body;

  try {
    const correctedPlaylistName = playlist_name.replace(/([^a-zA-Z0-9_ ]+)/gi, '-');
    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${display_name} - ${correctedPlaylistName}.txt`);
    const tracks = readFileSync(playlistFilePath, 'utf-8').split('\n');
    tracks.pop();
    const downloadedTracks: string[] = [];

    tracks.forEach((track) => {
      const [ artistsStr, trackName, trackUrl ] = track.split(',');
      const sanitizedArtistsStr = downloader === SPOTDL ? spotdlFileSanitize(artistsStr) : zotifyFileSanitize(artistsStr);
      const sanitizedTrackName = downloader === SPOTDL ? spotdlFileSanitize(trackName) : zotifyFileSanitize(trackName);

      const artists = sanitizedArtistsStr.split('~');
      const fileName = `${artists.join(', ')} - ${sanitizedTrackName}.${downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT}`;

      const trackFilePath = path.join(ROOT_DIR_PATH, downloader === SPOTDL ? SPOTDL_DIR : ZOTIFY_DIR, artists[0], fileName);
      if (Boolean(getFile(trackFilePath))) {
        downloadedTracks.push(track);
      }
    });

    sendArchiveToClient(res, downloadedTracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
    return;
  }
}

function handleServerError(res: Response, err: Error): void {
  console.log(`${err.stack}`);
  res.status(500).type('text/plain').send(`Internal Server Error: ${err.message}`);
}

interface SpotifyCurrentUser {
  display_name: string;
}

async function getSpotifyDisplayName(tokenType: string, accessToken: string): Promise<string> {
  const _currentUserRes = await fetch(SPOTIFY_CURRENT_USER_URL, {
    headers: { 'Authorization': `${tokenType} ${accessToken}`}
  });
  const _currentUserData: SpotifyCurrentUser = await _currentUserRes.json();

  return _currentUserData.display_name;
}

export class SpotifyTrack {
  albumImgUrl: string;
  albumName: string;
  artistNames: string[];
  name: string;
  durationMs: number;
  url: string;
  isPlayable: boolean;
  downloadStatus: DownloadStatus;
  downloader: Downloader;

  constructor(item: Record<string, any>) {
    this.albumImgUrl = item['album']['images'][1]['url'];
    this.albumName = item['album']['name'];
    this.artistNames = item['artists'].map((artist: Record<string, string>) => artist['name']);
    this.name = item['name'];
    this.durationMs = item['duration_ms'];
    this.url = item['external_urls']['spotify'];
    this.isPlayable = item['is_playable'];
    this.downloadStatus = 'Not Downloaded';
    this.downloader = 'none';
  }
}

async function getSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  const _spotifySearchRes = await fetch(CREATE_SPOTIFY_SEARCH_URL(query), {
    method: 'GET',
    headers: { 'Authorization': `${globalState.spotifyTokenType} ${globalState.spotifyToken}` }
  });

  const _spotifySearchJson: Record<string, any> = await _spotifySearchRes.json();
  const searchItems: SpotifyTrack[] = _spotifySearchJson['tracks']['items'].map((item: Record<string, any>) => new SpotifyTrack(item));
  return searchItems;
}

function attachTrackDownloadStatus(tracks: SpotifyTrack[], downloader: Downloader): SpotifyTrack[] {
  tracks.forEach((track) => {
    const trackName = track.name;

    const mainArtist = downloader === SPOTDL ? spotdlFileSanitize(track.artistNames[0]) : zotifyFileSanitize(track.artistNames[0]);
    const trackFileName = downloader === SPOTDL ?
      spotdlFileSanitize(`${track.artistNames.join(', ')} - ${trackName}`) :
      zotifyFileSanitize(`${track.artistNames.join(', ')} - ${trackName}`);

    const trackFilePath = downloader === SPOTDL ?
      path.join(ROOT_DIR_PATH, SPOTDL_DIR, mainArtist, `${trackFileName}.${SPOTDL_FORMAT}`) :
      path.join(ROOT_DIR_PATH, ZOTIFY_DIR, mainArtist, `${trackFileName}.${ZOTIFY_FORMAT}`);

    if (Boolean(getFile(trackFilePath))) {
      track.downloadStatus = 'Downloaded';
      track.downloader = downloader;
    } else {
      track.downloadStatus = 'Not Downloaded';
      track.downloader = 'none';
    }
  });
  return tracks;
}

interface SpotifySnapshot {
  snapshot_id: string;
}

async function getSpotifySnapshotId(playlistId: string, accessToken: string, tokenType: string): Promise<string> {
  if (playlistId === 'liked_songs') {
    return '';
  }

  const _snapshotRes = await fetch(CREATE_SPOTIFY_SNAPSHOT_URL(playlistId), {
    headers: { 'Authorization': `${tokenType} ${accessToken}` }
  });

  if (!_snapshotRes.ok) {
    const error = (await _snapshotRes.json())['error'];
    console.log(error);
    throw new Error(error.message);
  }

  const spotifySnapshot: SpotifySnapshot = await _snapshotRes.json();

  return spotifySnapshot.snapshot_id;
}

function isEmptyObj(obj: Record<string, any>): boolean {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

async function singleSpotdlDownload(trackUrl: string): Promise<string | number> {
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

async function singleZotifyDownload(trackUrl: string): Promise<string | number> {
  return new Promise((resolve, reject) => {
    const zotify = spawn(...ZOTIFY_ARGS(trackUrl));

    let STDOUT = '';
    let STDERR = '';

    zotify.stdout.on('data', (data) => {
      STDOUT += data.toString();
    });
    zotify.stderr.on('data', (data) => {
      STDERR += data.toString();
    });
    zotify.on('close', (code) => {
      if (code === 0) {
        resolve(`Download STDOUT: ${STDOUT}. Download STDERR: ${STDERR}.`);
      }
      reject(code);
    });
  });
}

function playlistTracksStatus(tracks: string[], playlistId: string, snapshotId: string, downloader: Downloader): boolean {
  let missingSongs = false;

  tracks.forEach((track) => {
    const [ artistsStr, trackName, trackUrl ] = track.split(',');
    const sanitizedArtistsStr = downloader === SPOTDL ? spotdlFileSanitize(artistsStr) : zotifyFileSanitize(artistsStr);
    const sanitizedTrackName = downloader === SPOTDL ? spotdlFileSanitize(trackName) : zotifyFileSanitize(trackName);

    const artists = sanitizedArtistsStr.split('~');
    const fileName = `${artists.join(', ')} - ${sanitizedTrackName}.${downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT}`;

    const trackFilePath = path.join(ROOT_DIR_PATH, downloader === SPOTDL ? SPOTDL_DIR : ZOTIFY_DIR, artists[0], fileName);

    const file = getFile(trackFilePath);
    if (!file) {
      missingSongs = true;
      const track = new Track(trackUrl, artists, sanitizedTrackName);
      WORKER_POOL.addTask(track, playlistId, snapshotId, downloader);
    }
  });

  return missingSongs;
}

function getPlaylistUrl(playlistId: string): Record<string, string> {
  const _urls = {
    _nextUrl: '',
    _defaultUrl: playlistId === 'liked_songs' ? CREATE_SPOTIFY_SAVED_TRACKS_URL() : CREATE_SPOTIFY_PLAYLIST_TRACKS_URL(playlistId)
  };

  return _urls;
}

async function writeAllPlaylistSongsToFile(playlistId: string, path: string, tokenType: string, accessToken: string): Promise<string[]> {
  clearFile(path);
  let { _nextUrl, _defaultUrl } = getPlaylistUrl(playlistId);
  const allTracks: string[] = [];

  do {
    const _url: string = _nextUrl || _defaultUrl;

    const _playlistSongsRes = await fetch(_url, {
      headers: { 'Authorization': `${tokenType} ${accessToken}` }
    }).then(res => res.json());

    if (isEmptyObj(_playlistSongsRes)) { break; }

    const tracks = _playlistSongsRes['items'].map((item: Record<string, any>) => item['track']);
    _nextUrl = _playlistSongsRes['next'];

    tracks.forEach(({ artists, name, external_urls, is_playable }: { artists: Array<Record<string, string>>, name: string, external_urls: Record<string, string>, is_playable: boolean }) => {
      if (is_playable) {
        const artistsStr: string = artists.map(({ name }) => name).join('~');
        const track_url: string = external_urls['spotify'];

        const trackEntry = `${artistsStr},${name},${track_url}`;
        appendToFile(path, `${trackEntry}\n`);
        allTracks.push(trackEntry);
      }
    });
  } while (_nextUrl);

  return allTracks;
}

function archiveTracks(archive: Archiver, tracks: string[], downloader: Downloader): void {
  tracks.forEach((track: string) => {
    if (track.length === 0) {
      return;
    }

    const [ artistsStr, trackName, trackUrl ] = track.split(',');

    const sanitizedArtistsStr: string = downloader === SPOTDL ? spotdlFileSanitize(artistsStr) : zotifyFileSanitize(artistsStr);
    const sanitizedTrackName: string = downloader === SPOTDL ? spotdlFileSanitize(trackName) : zotifyFileSanitize(trackName);

    const artists: string[] = sanitizedArtistsStr.split('~');
    const fileName: string = `${artists.join(', ')} - ${sanitizedTrackName}.${downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT}`;

    const trackFilePath: string = path.join(ROOT_DIR_PATH, downloader === SPOTDL ? SPOTDL_DIR : ZOTIFY_DIR, artists[0], fileName);
    archive.file(trackFilePath, { name: spotdlFileSanitize(fileName) });
  });
}

function sendArchiveToClient(res: Response, tracks: string[], downloader: Downloader): void {
  res.type('application/zip').set('Content-Disposition', 'attachment; filename=songs.zip');
  const archive: Archiver = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archiveTracks(archive, tracks, downloader);
  archive.finalize();
}