import archiver, { Archiver } from 'archiver';
import { Response } from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import DownloadingTrack from '../classes/DownloadingTrack';
import globalState from '../classes/GlobalState';
import { getFile, clearFile, appendToFile, sanitizeFileName } from '../utils/fileOperations.js';
import WorkerPool from '../classes/WorkerPool';
import handleServerError from 'src/utils/handleServerError';
import {
  ROOT_DIR_PATH,
  PLAYLIST_FILES_DIR,
  DOWNLOAD_THREADS,
  CREATE_SPOTIFY_SNAPSHOT_URL,
  CREATE_SPOTIFY_PLAYLIST_TRACKS_URL,
  CREATE_SPOTIFY_SAVED_TRACKS_URL,
  spotdlFileSanitize,
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
  try {
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
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

// TODO: Check if playlist snapshot_id is stored and current
export const availablePlaylistTracks = async (req: AvailablePlaylistTracksReqBody, res: Response) => {
  try {
    const {
      access_token,
      token_type,
      display_name,
      playlist_id,
      playlist_name,
      downloader
    } = req.body;

    const sanitizedPlaylistName = sanitizeFileName(playlist_name);
    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${display_name} - ${sanitizedPlaylistName}.txt`);
    const tracks = await savePlaylistTracks(playlist_id, playlistFilePath, token_type, access_token);

    let downloadedTracks = 0;
    tracks.forEach((track) => {
      if (getFile(track.getFilePath(downloader))) {
        downloadedTracks++;
      }
    });

    res.json({ downloaded_tracks: downloadedTracks });
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

export const downloadPlaylist = async (req: DownloadPlaylistReqBody, res: Response) => {
  try {
    const {
      access_token,
      token_type,
      display_name,
      playlist_id,
      playlist_name,
      downloader
    } = req.body;

    if (WORKER_POOL.isDownloading(downloader, playlist_id)) {
      const tracksRemaining: number = WORKER_POOL.tracksRemaining(downloader, playlist_id);
      res.status(200).type('text/plain')
        .send(`Playlist is already downloading. ~${Math.ceil((tracksRemaining * 2) / 60)} hours remaining.`);
      return;
    }

    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, sanitizeFileName (`${display_name} - ${playlist_name}.txt`));
    const fetchedSnapshotId = await _fetchSnapshotId(playlist_id, access_token, token_type);
    const savedSnapshotId = globalState.getSnapshot(downloader, playlist_id);

    if (fetchedSnapshotId === savedSnapshotId) {
      const tracks: PlaylistTrack[] = JSON.parse(readFileSync(playlistFilePath, 'utf-8'));
      sendArchiveToClient(res, tracks, downloader);
      return;
    }
    globalState.deleteSnapshot(downloader, playlist_id);

    const tracks = await savePlaylistTracks(playlist_id, playlistFilePath, token_type, access_token);
    if (hasMissingTracks(tracks, downloader)) {
      downloadMissingTracks(tracks, playlist_id, fetchedSnapshotId, downloader);

      res.status(200).type('text/plain')
        .send(`Tracks written and download started. Please come back in ~${Math.ceil((tracks.length * 2) / 60)} hours.`);
      return;
    }

    globalState.setSnapshot(downloader, playlist_id, fetchedSnapshotId);
    sendArchiveToClient(res, tracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

export const downloadLikedSongs = async (req, res: Response) => {

}

export const downloadPlaylistAvailable = async (req: DownloadPlaylistAvailableReqBody, res: Response) => {
  try {
    const {
      display_name,
      playlist_name,
      downloader
    } = req.body;

    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, sanitizeFileName(`${display_name} - ${playlist_name}.txt`));
    const tracks: PlaylistTrack[] = JSON.parse(readFileSync(playlistFilePath, 'utf-8'));
    tracks.filter((track) => getFile(track.getFilePath(downloader)));

    sendArchiveToClient(res, tracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

async function _fetchSnapshotId(playlistId: string, accessToken: string, tokenType: string): Promise<string> {
  const _snapshotRes = await fetch(CREATE_SPOTIFY_SNAPSHOT_URL(playlistId), {
    headers: { 'Authorization': `${tokenType} ${accessToken}` }
  });

  if (!_snapshotRes.ok) {
    const error = (await _snapshotRes.json())['error'];
    console.log(error);
    throw new Error(error.message);
  }

  const _snapshotJson: { snapshot_id: string; } = await _snapshotRes.json();
  return _snapshotJson.snapshot_id;
}

function hasMissingTracks(tracks: PlaylistTrack[], downloader: Downloader): boolean {
  for (const track of tracks) {
    if (!getFile(track.getFilePath(downloader))) return true;
  }
  return false;
}

function downloadMissingTracks(tracks: PlaylistTrack[], playlistId: string, snapshotId: string, downloader: Downloader): void {
  for (const track of tracks) {
    if (!getFile(track.getFilePath(downloader))) {
      const downloadingTrack = new DownloadingTrack(track.url, track.artistNames, track.name, downloader);
      WORKER_POOL.addTask(downloadingTrack, playlistId, snapshotId, downloader);
    }
  }
}

async function savePlaylistTracks(playlistId: string, filePath: string, tokenType: string, accessToken: string): Promise<PlaylistTrack[]> {
  clearFile(filePath);

  let _playlistUrl = CREATE_SPOTIFY_PLAYLIST_TRACKS_URL(playlistId);
  const allTracks: PlaylistTrack[] = [];

  do {
    const _playlistTracksRes = await fetch(_playlistUrl, {
      headers: { 'Authorization': `${tokenType} ${accessToken}` }
    });

    if (!_playlistTracksRes.ok) {
      const error = (await _playlistTracksRes.json())['error'];
      console.log(error);
      throw new Error(error.message);
    }

    const _playlistTracksJson: { next: string, items: PlaylistTrackJson[]} = await _playlistTracksRes.json();
    const playableTracks: PlaylistTrackJson[] = _playlistTracksJson.items.filter(item => item.track.is_playable)

    allTracks.push(...playableTracks.map(item => new PlaylistTrack(item)));

    _playlistUrl = _playlistTracksJson['next'];
  } while (_playlistUrl);

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