import { Request, Response } from "express"
import { readFileSync } from "fs";
import path from "path";
import PlaylistTrack from "../classes/PlaylistTrack.js";
import workerPool from "../classes/WorkerPool.js";
import { CREATE_SPOTIFY_SAVED_TRACKS_URL, PLAYLIST_FILES_DIR, ROOT_DIR_PATH } from "../constants.js";
import { sendArchiveToClient } from "../utils/archiveOperations.js";
import { appendToFile, clearFile, getFile, sanitizeFileName } from "../utils/fileOperations.js";
import handleServerError from "../utils/handleServerError.js"
import { downloadMissingTracks, hasMissingTracks } from "../utils/trackListOperations.js";

export const availableLikedSongs = async (req: Request, res: Response) => {
  try {
    const {
      access_token,
      token_type,
      display_name,
      downloader
    } = req.body;

    const id = `${display_name}_Liked_Songs`;

    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${sanitizeFileName(id)}.txt`);
    const tracks = await saveLikedSongs(playlistFilePath, token_type, access_token);

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

export const downloadLikedSongs = async (req: Request, res: Response) => {
  try {
    const {
      access_token,
      token_type,
      display_name,
      downloader
    } = req.body;

    const id = `${display_name}_Liked_Songs`;

    if (workerPool.isDownloading(downloader, id)) {
      const tracksRemaining: number = workerPool.tracksRemaining(downloader, id);
      res.status(200).type('text/plain')
        .send(`Playlist is already downloading. ~${Math.ceil((tracksRemaining * 2) / 60)} hours remaining.`);
      return;
    }

    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${sanitizeFileName(id)}.txt`);

    const tracks = await saveLikedSongs(playlistFilePath, token_type, access_token);
    if (hasMissingTracks(tracks, downloader)) {
      downloadMissingTracks(tracks, id, '', downloader);

      res.status(200).type('text/plain')
        .send(`Tracks written and download started. Please come back in ~${Math.ceil((tracks.length * 2) / 60)} hours.`);
      return;
    }

    sendArchiveToClient(id, res, tracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

export const downloadAvailableLikedSongs = async (req: Request, res: Response) => {
  try {
    const {
      display_name,
      downloader
    } = req.body;

    const id = `${display_name}_Liked_Songs`;

    const playlistFilePath = path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR, `${sanitizeFileName(id)}.txt`);
    const tracks: PlaylistTrack[] = JSON.parse(readFileSync(playlistFilePath, 'utf-8'));
    tracks.filter((track) => getFile(track.getFilePath(downloader)));

    sendArchiveToClient(id, res, tracks, downloader);
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

async function saveLikedSongs(filePath: string, tokenType: string, accessToken: string): Promise<PlaylistTrack[]> {
  clearFile(filePath);

  let _likedSongsUrl = CREATE_SPOTIFY_SAVED_TRACKS_URL();
  const allTracks: PlaylistTrack[] = [];

  do {
    const _likedSongsRes = await fetch(_likedSongsUrl, {
      headers: { 'Authorization': `${tokenType} ${accessToken}` }
    });

    if (!_likedSongsRes.ok) {
      const error = (await _likedSongsRes.json())['error'];
      console.log(error);
      throw new Error(error.message);
    }

    const _likedSongsJson: { next: string, items: PlaylistTrackJson[]} = await _likedSongsRes.json();
    const playableTracks: PlaylistTrackJson[] = _likedSongsJson.items.filter(item => item.track.is_playable)

    allTracks.push(...playableTracks.map(item => new PlaylistTrack(item)));

    _likedSongsUrl = _likedSongsJson['next'];
  } while (_likedSongsUrl);

  appendToFile(filePath, JSON.stringify(allTracks));
  return allTracks;
}