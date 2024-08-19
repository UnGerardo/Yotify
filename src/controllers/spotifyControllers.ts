import archiver, { Archiver } from 'archiver';
import { spawn } from 'node:child_process';
import { Response } from 'express';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import DownloadingTrack from '../classes/DownloadingTrack';
import globalState from '../classes/GlobalState';
import { getFile, clearFile, appendToFile } from '../utils/fileOperations.js';
import WorkerPool from '../classes/WorkerPool';
import handleServerError from 'src/utils/handleServerError';
import {
  ROOT_DIR_PATH,
  SPOTDL_DIR,
  PLAYLIST_FILES_DIR,
  DOWNLOAD_THREADS,
  CREATE_SPOTIFY_SNAPSHOT_URL,
  CREATE_SPOTIFY_PLAYLIST_TRACKS_URL,
  CREATE_SPOTIFY_SAVED_TRACKS_URL,
  SPOTDL_FORMAT,
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
  PlaylistsStatusReqBody,
} from 'src/RequestInterfaces.js';

const WORKER_POOL = new WorkerPool(DOWNLOAD_THREADS);

export const playlistsStatus = (req: PlaylistsStatusReqBody, res: Response) => {
  const { playlists, downloader } = req.body;

  for (const playlist of playlists) {
    const savedSnapshot = globalState.getSnapshot(downloader, playlist.id);

    if (savedSnapshot === playlist.snapshotId) {
      playlist.downloadStatus = 'Downloaded';
    } else if (WORKER_POOL.isDownloading(downloader, playlist.id)) {
      playlist.downloadStatus = 'Downloading';
    } else {
      globalState.deleteSnapshot(downloader, playlist.id);
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

  const workerPlaylistId: string = playlist_id === 'liked_songs' ? `${display_name}_LikedSongs` : playlist_id;
  if (WORKER_POOL.isDownloading(downloader, workerPlaylistId)) {
    const tracksRemaining: number = WORKER_POOL.tracksRemaining(downloader, workerPlaylistId);

    res.status(200).type('text/plain')
      .send(`Playlist is already downloading. ~${Math.ceil((tracksRemaining * 2) / 60)} hours remaining.`);
    return;
  }

  try {
    mkdirSync(path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR), { recursive: true });
    const correctedPlaylistName = playlist_name.replace(/([^a-zA-Z0-9_ ]+)/gi, '-');
    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${display_name} - ${correctedPlaylistName}.txt`);

    const spotifySnapshotId = await getSpotifySnapshotId(playlist_id, access_token, token_type);
    const savedSnapshotId = globalState.getSnapshot(downloader, workerPlaylistId);

    if (spotifySnapshotId === savedSnapshotId) {
      const tracks = readFileSync(playlistFilePath, 'utf-8').split('\n');

      sendArchiveToClient(res, tracks, downloader);
      return;
    }
    globalState.deleteSnapshot(downloader, workerPlaylistId);

    const tracks = await writeAllPlaylistSongsToFile(playlist_id, playlistFilePath, token_type, access_token);
    const missingSongs = playlistTracksStatus(tracks, workerPlaylistId, spotifySnapshotId, downloader);
    if (missingSongs) {
      res.status(200).type('text/plain')
        .send(`Tracks written and download started. Please come back in ~${Math.ceil((tracks.length * 2) / 60)} hours.`);
      return;
    }

    globalState.setSnapshot(downloader, workerPlaylistId, spotifySnapshotId);
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
      if (getFile(trackFilePath)) {
        downloadedTracks.push(track);
      }
    });

    sendArchiveToClient(res, downloadedTracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
    return;
  }
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
      const track = new DownloadingTrack(trackUrl, artists, sanitizedTrackName, downloader);
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