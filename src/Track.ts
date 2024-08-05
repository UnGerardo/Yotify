
class Track {
  url: string;
  artists: string[];
  name: string;
  downloading: boolean;
  tries: number;

  constructor(url: string, artists: string[], name: string) {
    this.url = url;
    this.artists = artists;
    this.name = name;
    this.downloading = false;
    this.tries = 0;
  }
}