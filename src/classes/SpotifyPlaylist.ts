
export default class SpotifyPlaylist {
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