
export class SpotifyPlaylist {
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

export class SpotifyTrack {
  albumImgUrl: string;
  albumName: string;
  artistNames: string[];
  name: string;
  durationMs: number;
  url: string;
  isPlayable: boolean;
  downloadStatus: DownloadStatus;
  downloader: Downloader;

  constructor(item: Record<string, any>) {
    this.albumImgUrl = item['album']['images'][1]['url'];
    this.albumName = item['album']['name'];
    this.artistNames = item['artists'].map((artist: Record<string, string>) => artist['name']);
    this.name = item['name'];
    this.durationMs = item['duration_ms'];
    this.url = item['external_urls']['spotify'];
    this.isPlayable = item['is_playable'];
    this.downloadStatus = 'Not Downloaded';
    this.downloader = 'none';
  }
}