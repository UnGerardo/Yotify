
import path from 'path';
import { Worker } from 'worker_threads';
import globalState from './globalState.js';
import { ROOT_DIR_PATH, SPOTDL, MAX_DOWNLOADING_TRIES } from './constants.js';
import DownloadingPlaylist from './DownloadingPlaylist.js';
import DownloadingTrack from './DownloadingTrack.js';

type WorkerStatus = 'success' | 'error';

export default class WorkerPool {
  numThreads: number;
  downloadingPlaylists:  {
    'spotdl': Map<string, DownloadingPlaylist>,
    'zotify': Map<string, DownloadingPlaylist>
  } = {
    'spotdl': new Map<string, DownloadingPlaylist>(),
    'zotify': new Map<string, DownloadingPlaylist>()
  };
  activeSpotdlWorkers: number;
  activeZotifyWorkers: number;

  constructor(numThreads: number) {
    this.numThreads = numThreads;
    this.activeSpotdlWorkers = 0;
    this.activeZotifyWorkers = 0;
  }

  private getDownloadingPlaylist(downloader: Downloader, playlistId: string): DownloadingPlaylist | undefined {
    return downloader === SPOTDL ? this.downloadingPlaylists.spotdl.get(playlistId) : this.downloadingPlaylists.zotify.get(playlistId);
  }
  private setDownloadingPlaylist(downloader: Downloader, playlist: DownloadingPlaylist): void {
    downloader === SPOTDL ? this.downloadingPlaylists.spotdl.set(playlist.id, playlist) : this.downloadingPlaylists.zotify.set(playlist.id, playlist);
  }
  private removeDownloadingPlaylist(downloader: Downloader, playlistId: string): void {
    downloader === SPOTDL ? this.downloadingPlaylists.spotdl.delete(playlistId) : this.downloadingPlaylists.zotify.delete(playlistId);
  }

  private incrementActiveWorkers(downloader: Downloader): void {
    downloader === SPOTDL ? this.activeSpotdlWorkers++ : this.activeZotifyWorkers++;
  }
  private decrementActiveWorkers(downloader: Downloader): void {
    downloader === SPOTDL ? this.activeSpotdlWorkers-- : this.activeZotifyWorkers--;
  }

  private createWorker(playlist: DownloadingPlaylist, track: DownloadingTrack): Worker {
    const worker = playlist.downloader === SPOTDL ?
      new Worker(path.join(ROOT_DIR_PATH, 'app', 'spotdlWorker.js')) :
      new Worker(path.join(ROOT_DIR_PATH, 'app', 'zotifyWorker.js'));
    let isHandled = false;

    const handleWorker = (status: WorkerStatus) => {
      if (!isHandled) {
        isHandled = true;
        this.decrementActiveWorkers(playlist.downloader);

        if (status === 'success') {
          removeTrack(playlist, track);

          if (playlist.tracks.length === 0) {
            if (!playlist.skippedTracks) {
              globalState.setSnapshot(playlist.downloader, playlist.id, playlist.snapshotId);
            }
            this.removeDownloadingPlaylist(playlist.downloader, playlist.id);
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

  addTask(track: DownloadingTrack, playlist_id: string, snapshot_id: string, downloader: Downloader): void {
    const playlist = this.getDownloadingPlaylist(downloader, playlist_id);
    if (playlist) {
      playlist.tracks.push(track);
      this.runNext();
      return;
    }

    this.setDownloadingPlaylist(downloader, new DownloadingPlaylist(playlist_id, snapshot_id, downloader, track));
    this.runNext();
  }

  private runNext(): void {
    this.processPlaylist('spotdl', this.activeSpotdlWorkers);
    this.processPlaylist('zotify', this.activeZotifyWorkers);
  }

  private processPlaylist(downloader: Downloader, activeWorkers: number): void {
    if (activeWorkers >= this.numThreads) return;

    for (const [playlistId, playlist] of this.downloadingPlaylists[downloader]) {
      for (const track of playlist.tracks) {
        if (!track.downloading) {
          track.downloading = true;
          const worker = this.createWorker(playlist, track);
          this.incrementActiveWorkers(downloader);
          worker.postMessage(track);
          return;
        }
      }
    }
  }

  isDownloading(downloader: Downloader, playlistId: string): boolean {
    return !!this.getDownloadingPlaylist(downloader, playlistId);
  }

  tracksRemaining(downloader: Downloader, playlistId: string): number {
    const tracksLength = this.getDownloadingPlaylist(downloader, playlistId)?.tracks.length;

    if (tracksLength) {
      return tracksLength;
    }
    throw new Error(`No tracks remaining for playlist id: ${playlistId}, falsely found to be 'downloading'.`);
  }
}

function removeTrack(playlist: DownloadingPlaylist, track: DownloadingTrack): void {
  for (let i = 0; i < playlist.tracks.length; i++) {
    if (playlist.tracks[i].url === track.url) {
      playlist.tracks.splice(i, 1);
      return;
    }
  }
}