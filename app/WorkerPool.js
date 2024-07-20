
const path = require('path');
const { Worker } = require('worker_threads');
const globalState = require('./globalState.js');
const { APP_DIR_PATH } = require('./constants.js');

class WorkerPool {
  constructor(numThreads) {
    this.numThreads = numThreads;
    this.workers = [];
    this.activePlaylists = [];
    this.stacks = new Map();
    this.activeWorkers = 0;

    for (let i = 0; i < this.numThreads; i++) {
      this.workers.push(this.createWorker());
    }
  }

  createWorker() {
    const worker = new Worker(path.join(APP_DIR_PATH, 'app', 'downloadTrack.js'));
    let isHandled = false;

    const handleWorker = (event) => {
      if (!isHandled) {
        isHandled = true;
        console.log(`Worker completed: ${event}`);
        this.activeWorkers--;

        if (this.stacks.get(this.activePlaylists[0]['playlist_id']).length === 0) {
          // Doesn't track 'liked_songs'
          if (this.activePlaylists[0]['snapshot_id'].length > 0) {
            globalState.setPlaylistSnapshot(this.activePlaylists[0]['playlist_id'], this.activePlaylists[0]['snapshot_id']);
          }
          this.stacks.delete(this.activePlaylists.shift());
        }

        this.runNext();
      }
    }

    worker.on('message', (result) => {
      console.log(`Worker completed: ${result}`);
      handleWorker('message');
    });
    worker.on('error', (err) => {
      console.log(`Worker error: ${err}`);
      handleWorker('error');
    });
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log(`Worker stopped with code: ${code}`);
      }
      handleWorker('exit');
    });

    return worker;
  }

  addTask(spotdlArgs, playlist_id, snapshot_id, artists, trackName) {
    if (this.stacks.get(playlist_id)) {
      this.stacks.get(playlist_id).push([spotdlArgs, artists, trackName]);
    } else {
      this.stacks.set(playlist_id, [[spotdlArgs, artists, trackName]]);
      this.activePlaylists.push({ playlist_id, snapshot_id });
    }
    this.runNext();
  }

  runNext() {
    if (this.activePlaylists.length === 0 || this.activeWorkers >= this.numThreads) {
      return;
    }

    const args = this.stacks.get(this.activePlaylists[0]['playlist_id']).shift();
    const worker = this.createWorker();
    this.activeWorkers++;
    worker.postMessage(args);
  }

  isDownloading(playlistId) {
    for (let i = 0; i < this.activePlaylists.length; i++) {
      if (playlistId === this.activePlaylists[i]['playlist_id']) {
        return true;
      }
    }
    return false;
  }

  tracksRemaining(playlistId) {
    return this.stacks.get(playlistId).length;
  }
}

module.exports = WorkerPool;