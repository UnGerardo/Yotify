
import Track from "./Track";

export default class DownloadingPlaylist {
  id: string;
  snapshotId: string;
  downloader: Downloader
  tracks: Track[];
  skippedTracks: boolean;

  constructor(playlistId: string, snapshotId: string, downloader: Downloader, track: Track) {
    this.id = playlistId; // format ${downloader}_{id}
    this.snapshotId = snapshotId;
    this.downloader = downloader;
    this.tracks = [track];
    this.skippedTracks = false;
  }
}