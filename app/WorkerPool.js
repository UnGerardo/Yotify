
const path = require('path');
const { Worker } = require('worker_threads')

class WorkerPool {
  constructor(numThreads) {
    this.numThreads = numThreads;
    this.workers = [];
    this.activePlaylistIds = [];
    this.stacks = new Map();
    this.activeWorkers = 0;

    for (let i = 0; i < this.numThreads; i++) {
      this.workers.push(this.createWorker());
    }
  }

  createWorker() {
    const worker = new Worker(path.join(__dirname, 'downloadTrack.js'));
    let isHandled = false;

    const handleWorker = (event) => {
      if (!isHandled) {
        isHandled = true;
        console.log(`Worker completed: ${event}`);
        this.activeWorkers--;
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

  addTask(args, playlistId) {
    if (this.stacks.get(playlistId)) {
      this.stacks.get(playlistId).push(args);
    } else {
      this.stacks.set(playlistId, [args]);
      this.activePlaylistIds.push(playlistId);
    }
    this.runNext();
  }

  runNext() {
    if (this.activePlaylistIds.length === 0 || this.activeWorkers >= this.numThreads) {
      return;
    }

    const args = this.stacks.get(this.activePlaylistIds[0]).shift();
    if (this.stacks.get(this.activePlaylistIds[0]).length === 0) {
      this.stacks.delete(this.activePlaylistIds.shift());
    }
    const worker = this.createWorker();
    this.activeWorkers++;
    worker.postMessage(args);
  }

  isDownloading(playlistId) {
    return this.activePlaylistIds.includes(playlistId);
  }
}

module.exports = WorkerPool;