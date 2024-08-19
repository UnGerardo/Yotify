import DownloadingTrack from "./DownloadingTrack";

export default class DownloadingPlaylist {
  id: string;
  snapshotId: string;
  downloader: Downloader
  tracks: DownloadingTrack[];
  skippedTracks: boolean;

  constructor(playlistId: string, snapshotId: string, downloader: Downloader, track: DownloadingTrack) {
    this.id = playlistId;
    this.snapshotId = snapshotId;
    this.downloader = downloader;
    this.tracks = [track];
    this.skippedTracks = false;
  }
}