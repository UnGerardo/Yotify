
export default class SpotifyTrack {
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