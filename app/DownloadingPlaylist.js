
class DownloadingPlaylist {
  constructor(playlistId, snapshotId, downloader, track) {
    this.playlistId = playlistId;
    this.snapshotId = snapshotId;
    this.downloader = downloader;
    this.tracks = [track];
  }
}

module.exports = DownloadingPlaylist;