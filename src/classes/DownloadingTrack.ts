
export default class DownloadingTrack {
  url: string;
  artists: string[];
  name: string;
  downloader: Downloader;
  downloading: boolean;
  tries: number;

  constructor(url: string, artists: string[], name: string, downloader: Downloader) {
    this.url = url;
    this.artists = artists;
    this.name = name;
    this.downloader = downloader;
    this.downloading = false;
    this.tries = 0;
  }
}