
const path = require('path');
const { Worker } = require('worker_threads');
const globalState = require('./globalState.js');
const { APP_DIR_PATH, SPOTDL } = require('./constants.js');
const DownloadingPlaylist = require('./DownloadingPlaylist.js');

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

  createWorker(downloader) {
    const worker = downloader === SPOTDL ?
      new Worker(path.join(APP_DIR_PATH, 'app', 'spotdlWorker.js')) :
      new Worker(path.join(APP_DIR_PATH, 'app', 'zotifyWorker.js'));
    let isHandled = false;

    const handleWorker = () => {
      if (!isHandled) {
        isHandled = true;
        this.activeWorkers--;

        if (this.activePlaylists[0].tracks.length === 0) {
          // Doesn't track 'liked_songs'
          if (this.activePlaylists[0].snapshot_id.length > 0) {
            globalState.setPlaylistSnapshot(this.activePlaylists[0].playlist_id, this.activePlaylists[0].snapshot_id);
          }
          this.activePlaylists.shift();
        }

        this.runNext();
      }
    }

    worker.on('message', (result) => {
      console.log(`Worker completed: ${result}`);
      handleWorker();
    });
    worker.on('error', (err) => {
      console.log(`Worker error: ${err.stack}`);
      handleWorker();
    });
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log(`Worker stopped with code: ${code}`);
      }
      handleWorker();
    });

    return worker;
  }

  addTask(track, playlist_id, snapshot_id) {
    for (let i = 0; i < this.activePlaylists.length; i++) {
      if (this.activePlaylists[i].playlistId === playlist_id) {
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

    const track = this.activePlaylists[0].tracks.shift();
    const worker = this.createWorker(this.activePlaylists[0].downloader);
    this.activeWorkers++;
    worker.postMessage(track);
  }

  isDownloading(playlistId) {
    for (let i = 0; i < this.activePlaylists.length; i++) {
      if (playlistId === this.activePlaylists[i].playlist_id) {
        return true;
      }
    }
    return false;
  }

  tracksRemaining(playlistId) {
    for (let i = 0; i < this.activePlaylists.length; i++) {
      if (playlistId === this.activePlaylists[i].playlist_id) {
        return this.activePlaylists[i].tracks.length;
      }
    }
  }
}

module.exports = WorkerPool;