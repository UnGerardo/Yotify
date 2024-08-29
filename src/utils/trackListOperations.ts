import PlaylistTrack from "../classes/PlaylistTrack.js";
import { getFile } from "./fileOperations.js";
import DownloadingTrack from "../classes/DownloadingTrack.js";
import workerPool from "../classes/WorkerPool.js";

export function hasMissingTracks(tracks: PlaylistTrack[], downloader: Downloader): boolean {
  for (const track of tracks) {
    if (!getFile(track.getFilePath(downloader))) return true;
  }
  return false;
}

export function downloadMissingTracks(tracks: PlaylistTrack[], playlistId: string, snapshotId: string, downloader: Downloader): void {
  for (const track of tracks) {
    if (!getFile(track.getFilePath(downloader))) {
      const downloadingTrack = new DownloadingTrack(track.url, track.artistNames, track.name, downloader);
      workerPool.addTask(downloadingTrack, playlistId, snapshotId, downloader);
    }
  }
}