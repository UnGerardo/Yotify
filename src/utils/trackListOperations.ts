import PlaylistTrack from "src/classes/PlaylistTrack";
import { getFile } from "./fileOperations";
import DownloadingTrack from "src/classes/DownloadingTrack";
import workerPool from "src/classes/WorkerPool";

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