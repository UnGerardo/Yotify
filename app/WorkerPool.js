
const path = require('path');
const { Worker } = require('worker_threads');
const globalState = require('./globalState.js');
const { APP_DIR_PATH, SPOTDL } = require('./constants.js');
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
    this.workers = [];
    this.activePlaylists = []; // contains DownloadingPlaylist.js
    this.activeWorkers = 0;

    for (let i = 0; i < this.numThreads; i++) {
      this.workers.push(this.createWorker());
    }
  }

  createWorker(playlist, track) {
    const worker = downloader === SPOTDL ?
      new Worker(path.join(APP_DIR_PATH, 'app', 'spotdlWorker.js')) :
      new Worker(path.join(APP_DIR_PATH, 'app', 'zotifyWorker.js'));
    let isHandled = false;

    const handleWorker = (status) => {
      if (!isHandled) {
        isHandled = true;
        this.activeWorkers--;

        if (status === 'success') {
          removeTrack(playlist, track);

          if (playlist.tracks.length === 0) {
            this.removePlaylist(playlist);
          }
        } else {
          console.log(`Worker error for: ${track.url} | ${track.artists} | ${track.name}`);
        }

        this.runNext();
      }
    }

    worker.on('message', (result) => {
      console.log(`Worker completed: ${result}`);
      handleWorker('success');
    });
    worker.on('error', (err) => {
      console.log(`Worker error: ${err.stack}`);
      handleWorker('error');
    });
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log(`Worker stopped with code: ${code}`);
        handleWorker('error');
      }
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

    this.activePlaylists.push(DownloadingPlaylist(playlist_id, snapshot_id, downloader, track));
    this.runNext();
  }

  runNext() {
    if (this.activePlaylists.length === 0 || this.activeWorkers >= this.numThreads) {
      return;
    }

    this.activePlaylists.forEach((playlist) => {
      playlist.tracks.forEach((track) => {
        if (!track.downloading) {
          track.downloading = true;
          const worker = this.createWorker(playlist, track);
          this.activeWorkers++;
          worker.postMessage(track);
          return;
        }
      });
    });
  }

  removePlaylist(playlist) {
    for (let i = 0; i < this.activePlaylists.length; i++) {
      if (this.activePlaylists[i].id === playlist.id) {
        globalState.setPlaylistSnapshot(playlist.id, playlist.snapshotId);
        this.activePlaylists.splice(i, 1);
        return;
      }
    }
  }

  isDownloading(playlistId) {
    for (let i = 0; i < this.activePlaylists.length; i++) {
      if (playlistId === this.activePlaylists[i].id) {
        return true;
      }
    }
    return false;
  }

  tracksRemaining(playlistId) {
    for (let i = 0; i < this.activePlaylists.length; i++) {
      if (playlistId === this.activePlaylists[i].id) {
        return this.activePlaylists[i].tracks.length;
      }
    }
  }
}

module.exports = WorkerPool;