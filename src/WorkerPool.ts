
import path from 'path';
import { Worker } from 'worker_threads';
import globalState from './globalState.js';
import { ROOT_DIR_PATH, SPOTDL, MAX_DOWNLOADING_TRIES } from './constants.js';
import Playlist from './Playlist.js';
import Track from './Track.js';

type WorkerStatus = 'success' | 'error';

function removeTrack(playlist: Playlist, track: Track): void {
  for (let i = 0; i < playlist.tracks.length; i++) {
    if (playlist.tracks[i].url === track.url) {
      playlist.tracks.splice(i, 1);
      return;
    }
  }
}

export default class WorkerPool {
  numThreads: number;
  activePlaylists: Playlist[];
  activeWorkers: number;

  constructor(numThreads: number) {
    this.numThreads = numThreads;
    this.activePlaylists = [];
    this.activeWorkers = 0;
  }

  createWorker(playlist: Playlist, track: Track): Worker {
    const worker = playlist.downloader === SPOTDL ?
      new Worker(path.join(ROOT_DIR_PATH, 'app', 'spotdlWorker.js')) :
      new Worker(path.join(ROOT_DIR_PATH, 'app', 'zotifyWorker.js'));
    let isHandled = false;

    const handleWorker = (status: WorkerStatus) => {
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
      console.log(result);
      const status: WorkerStatus = 'success';
      handleWorker(status);
    });
    worker.on('error', (err) => {
      console.log(`Worker error: ${err.stack}`);
      const status: WorkerStatus = 'error';
      handleWorker(status);
    });

    return worker;
  }

  addTask(track: Track, playlist_id: string, snapshot_id: string, downloader: Downloader): void {
    for (const playlist of this.activePlaylists) {
      if (playlist.id === playlist_id) {
        playlist.tracks.push(track);
        this.runNext();
        return;
      }
    }

    this.activePlaylists.push(new Playlist(playlist_id, snapshot_id, downloader, track));
    this.runNext();
  }

  runNext(): void {
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

  removePlaylist(playlistId: string): void {
    for (const [i, playlist] of this.activePlaylists.entries()) {
      if (playlist.id === playlistId) {
        this.activePlaylists.splice(i, 1);
        return;
      }
    }
  }

  isDownloading(playlistId: string): boolean {
    for (const playlist of this.activePlaylists) {
      if (playlist.id === playlistId) {
        return true;
      }
    }
    return false;
  }

  tracksRemaining(playlistId: string): number {
    for (const playlist of this.activePlaylists) {
      if (playlist.id === playlistId) {
        return playlist.tracks.length;
      }
    }
    throw new Error(`No tracks remaining for playlist id: ${playlistId}, falsely found to be 'downloading'.`);
  }
}