
const path = require('path');
const { Worker } = require('worker_threads')

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

  addTask(args, playlist) {
    if (this.stacks.get(playlist)) {
      this.stacks.get(playlist).push(args);
    } else {
      this.stacks.set(playlist, [args]);
      this.activePlaylists.push(playlist);
    }
    this.runNext();
  }

  runNext() {
    if (this.activePlaylists.length === 0 || this.activeWorkers >= this.numThreads) {
      return;
    }

    const args = this.stacks.get(this.activePlaylists[0]).shift();
    if (this.stacks.get(this.activePlaylists[0]).length === 0) {
      this.stacks.delete(this.activePlaylists.shift());
    }
    const worker = this.createWorker();
    this.activeWorkers++;
    worker.postMessage(args);
  }
}

module.exports = WorkerPool;