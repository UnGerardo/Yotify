
const path = require('path');
const { Worker } = require('worker_threads');
const globalState = require('./globalState.js');
const { SRC_DIR_PATH, SPOTDL, MAX_DOWNLOADING_TRIES } = require('./constants.js');
const DownloadingPlaylist = require('./DownloadingPlaylist.js');

function removeTrack(playlist, track) {
  for (let i = 0; i < playlist.tracks.length; i++) {
    if (playlist.tracks[i].url === track.url) {
      playlist.tracks.splice(i, 1);
      return;
    }
  }
}

class WorkerPool {
  constructor(numThreads) {
    this.numThreads = numThreads;
    this.activePlaylists = []; // contains DownloadingPlaylist.js
    this.activeWorkers = 0;
  }

  createWorker(playlist, track) {
    const worker = playlist.downloader === SPOTDL ?
      new Worker(path.join(SRC_DIR_PATH, 'app', 'spotdlWorker.js')) :
      new Worker(path.join(SRC_DIR_PATH, 'app', 'zotifyWorker.js'));
    let isHandled = false;

    const handleWorker = (status) => {
      if (!isHandled) {
        isHandled = true;
        this.activeWorkers--;

        if (status === 'success') {
          removeTrack(playlist, track);

          if (playlist.tracks.length === 0) {
            if (!playlist.skippedTracks) {
              playlist.downloader === SPOTDL ?
                globalState.setSpotdlSnapshot(playlist.id, playlist.snapshotId) :
                globalState.setZotifySnapshot(playlist.id, playlist.snapshotId);
            }
            this.removePlaylist(playlist.id);
          }
        } else {
          console.log(`Worker error for: ${track.url} | ${track.artists} | ${track.name}`);
          track.downloading = false;

          if (++track.tries >= MAX_DOWNLOADING_TRIES) {
            removeTrack(playlist, track);
            playlist.skippedTracks = true;
          }
        }

        this.runNext();
      }
    }

    worker.on('message', (result) => {
      console.log('Worker completed:');
      console.log(result)
      handleWorker('success');
    });
    worker.on('error', (err) => {
      console.log(`Worker error: ${err.stack}`);
      handleWorker('error');
    });

    return worker;
  }

  addTask(track, playlist_id, snapshot_id, downloader) {
    for (let i = 0; i < this.activePlaylists.length; i++) {
      if (this.activePlaylists[i].id === playlist_id) {
        this.activePlaylists[i].tracks.push(track);
        this.runNext();
        return;
      }
    }

    this.activePlaylists.push(new DownloadingPlaylist(playlist_id, snapshot_id, downloader, track));
    this.runNext();
  }

  runNext() {
    if (this.activePlaylists.length === 0 || this.activeWorkers >= this.numThreads) {
      return;
    }

    for (const playlist of this.activePlaylists) {
      for (const track of playlist.tracks) {
        if (!track.downloading) {
          track.downloading = true;
          const worker = this.createWorker(playlist, track);
          this.activeWorkers++;
          worker.postMessage(track);
          return;
        }
      }
    }
  }

  removePlaylist(playlistId) {
    for (const [i, playlist] of this.activePlaylists.entries()) {
      if (playlist.id === playlistId) {
        this.activePlaylists.splice(i, 1);
        return;
      }
    }
  }

  isDownloading(playlistId) {
    for (const playlist of this.activePlaylists) {
      if (playlist.id === playlistId) {
        return true;
      }
    }
    return false;
  }

  tracksRemaining(playlistId) {
    for (const playlist of this.activePlaylists) {
      if (playlist.id === playlistId) {
        return playlist.tracks.length;
      }
    }
  }
}

module.exports = WorkerPool;