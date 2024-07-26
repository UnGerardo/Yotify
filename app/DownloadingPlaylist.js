
class DownloadingPlaylist {
  constructor(playlistId, snapshotId, downloader, track) {
    this.id = playlistId;
    this.snapshotId = snapshotId;
    this.downloader = downloader;
    this.tracks = [track];
  }
}

module.exports = DownloadingPlaylist;