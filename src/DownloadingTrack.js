
class DownloadingTrack {
  constructor(url, artists, name) {
    this.url = url;
    this.artists = artists;
    this.name = name;
    this.downloading = false;
    this.tries = 0;
  }
}

module.exports = DownloadingTrack;