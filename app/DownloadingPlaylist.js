
class DownloadingPlaylist {
  constructor(playlistId, snapshotId, downloader, track) {
    this.id = playlistId; // format ${downloader}_{id}
    this.snapshotId = snapshotId;
    this.downloader = downloader;
    this.tracks = [track];
  }
}

module.exports = DownloadingPlaylist;