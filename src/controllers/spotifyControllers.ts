import archiver, { Archiver } from 'archiver';
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
import PlaylistTrack from 'src/classes/PlaylistTrack';

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

  const sanitizedPlaylistName = sanitizePlaylistName(playlist_name);
  const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${display_name} - ${sanitizedPlaylistName}.txt`);
  const tracks = await writeAllPlaylistSongsToFile(playlist_id, playlistFilePath, token_type, access_token);

  tracks.forEach((track) => {
    if (getFile(track.getFilePath(downloader))) {
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
    const sanitizedPlaylistName = sanitizePlaylistName(playlist_name);
    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${display_name} - ${sanitizedPlaylistName}.txt`);

    const spotifySnapshotId = await getSpotifySnapshotId(playlist_id, access_token, token_type);
    const savedSnapshotId = globalState.getSnapshot(downloader, workerPlaylistId);

    if (spotifySnapshotId === savedSnapshotId) {
      const tracks: PlaylistTrack[] = JSON.parse(readFileSync(playlistFilePath, 'utf-8'));

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
    const sanitizedPlaylistName = sanitizePlaylistName(playlist_name);
    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${display_name} - ${sanitizedPlaylistName}.txt`);
    const tracks: PlaylistTrack[] = JSON.parse(readFileSync(playlistFilePath, 'utf-8'));
    const downloadedTracks: PlaylistTrack[] = [];

    tracks.forEach((track) => {
      if (getFile(track.getFilePath(downloader))) {
        downloadedTracks.push(track);
      }
    });

    sendArchiveToClient(res, downloadedTracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
    return;
  }
}

function sanitizePlaylistName(name: string): string {
  return name.replace(/([^a-zA-Z0-9_ ]+)/gi, '-');
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

function playlistTracksStatus(tracks: PlaylistTrack[], playlistId: string, snapshotId: string, downloader: Downloader): boolean {
  let missingSongs = false;

  tracks.forEach((track) => {
    if (!getFile(track.getFilePath(downloader))) {
      missingSongs = true;
      const downloadingTrack = new DownloadingTrack(track.url, track.artistNames, track.name, downloader);
      WORKER_POOL.addTask(downloadingTrack, playlistId, snapshotId, downloader);
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

async function writeAllPlaylistSongsToFile(playlistId: string, filePath: string, tokenType: string, accessToken: string): Promise<PlaylistTrack[]> {
  clearFile(filePath);
  let { _nextUrl, _defaultUrl } = getPlaylistUrl(playlistId);
  const allTracks: PlaylistTrack[] = [];

  do {
    const _url: string = _nextUrl || _defaultUrl;

    const _playlistSongsRes = await fetch(_url, {
      headers: { 'Authorization': `${tokenType} ${accessToken}` }
    }).then(res => res.json());

    if (isEmptyObj(_playlistSongsRes)) { break; }

    const tracks: PlaylistTrack[] = _playlistSongsRes['items'].map((item: Record<string, any>): PlaylistTrack | undefined => {
      if (item['track']['is_playable']) {
        return new PlaylistTrack(item['track']);
      }
    });
    allTracks.push(...tracks);
    _nextUrl = _playlistSongsRes['next'];

  } while (_nextUrl);

  appendToFile(filePath, JSON.stringify(allTracks));
  return allTracks;
}

function archiveTracks(archive: Archiver, tracks: PlaylistTrack[], downloader: Downloader): void {
  tracks.forEach((track) => {
    archive.file(track.getFilePath(downloader), { name: spotdlFileSanitize(track.getFileName(downloader)) });
  });
}

function sendArchiveToClient(res: Response, tracks: PlaylistTrack[], downloader: Downloader): void {
  res.type('application/zip').set('Content-Disposition', 'attachment; filename=songs.zip');
  const archive: Archiver = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archiveTracks(archive, tracks, downloader);
  archive.finalize();
}