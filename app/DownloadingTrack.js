
class DownloadingTrack {
  constructor(url, artists, name) {
    this.url = url;
    this.artists = artists;
    this.name = name;
    this.downloading = false;
  }
}

module.exports = DownloadingTrack;