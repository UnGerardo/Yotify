import PlaylistTrack from "../classes/PlaylistTrack.js";
import { getFile } from "./fileOperations.js";
import DownloadingTrack from "../classes/DownloadingTrack.js";
import workerPool from "../classes/WorkerPool.js";

export function hasMissingTracks(tracks: PlaylistTrack[], downloader: Downloader): boolean {
  if (tracks.length === 0) throw new Error('hasMissingTracks() received an empty array');

  for (const track of tracks) {
    if (!getFile(track.getFilePath(downloader))) return true;
  }
  return false;
}

export function downloadMissingTracks(tracks: PlaylistTrack[], playlistId: string, snapshotId: string, downloader: Downloader): void {
  if (tracks.length === 0) throw new Error('downloadMissingTracks() received an empty array');

  for (const track of tracks) {
    if (!getFile(track.getFilePath(downloader))) workerPool.addTask(track, playlistId, snapshotId, downloader);
  }
}