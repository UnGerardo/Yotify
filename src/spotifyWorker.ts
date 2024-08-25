import { parentPort } from 'worker_threads';
import { spawn } from 'node:child_process';
import { randomInt } from 'crypto';
import { renameSync } from 'node:fs';
import path from 'path';
import {
  ROOT_DIR_PATH,
  ZOTIFY_DIR,
  ZOTIFY_ARGS,
  ZOTIFY_FORMAT,
  ZOTIFY_WAIT_MIN,
  ZOTIFY_WAIT_MAX,
  SPOTDL_DIR,
  SPOTDL,
  SPOTDL_ARGS,
  SPOTDL_FORMAT,
  SPOTDL_WAIT_MIN,
  SPOTDL_WAIT_MAX,
  spotdlFileSanitize,
  zotifyFileSanitize
} from './constants';
import DownloadingTrack from './classes/DownloadingTrack';

if (parentPort) {
  parentPort.on('message', (track: DownloadingTrack) => {
    const WAIT_MIN = track.downloader === SPOTDL ? SPOTDL_WAIT_MIN : ZOTIFY_WAIT_MIN;
    const WAIT_MAX = track.downloader === SPOTDL ? SPOTDL_WAIT_MAX : ZOTIFY_WAIT_MAX;
    const SAVE_DIR = track.downloader === SPOTDL ? SPOTDL_DIR : ZOTIFY_DIR;
    const FORMAT = track.downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT;
    const sanitizeFunc = track.downloader === SPOTDL ? spotdlFileSanitize : zotifyFileSanitize;

    const wait: number = randomInt(WAIT_MIN, WAIT_MAX);
    setTimeout(() => {
      console.log(`Worker started: ${track.downloader} | ${track.url} | ${track.artists} | ${track.name}`);

      const instance = track.downloader === SPOTDL ? spawn(...SPOTDL_ARGS(track.url)) : spawn(...ZOTIFY_ARGS(track.url));
      let STDOUT = '';
      instance.stdout.on('data', (data) => STDOUT += data.toString());
      let STDERR = '';
      instance.stderr.on('data', (data) => STDERR += data.toString());

      instance.on('close', (code) => {
        const mainArtist = sanitizeFunc(track.artists[0]);
        const artists = sanitizeFunc(track.artists.join(', '));
        const trackName = sanitizeFunc(track.name);

        const expectedFilePath = path.join(ROOT_DIR_PATH, SAVE_DIR, `${mainArtist}/${mainArtist} - ${trackName}.${FORMAT}`);
        const desiredFilePath = path.join(ROOT_DIR_PATH, SAVE_DIR, `${mainArtist}/${artists} - ${trackName}.${FORMAT}`);
        renameSync(expectedFilePath, desiredFilePath);

        if (parentPort){
          parentPort.postMessage({ code, STDOUT, STDERR });
        }
      });
    }, wait);
  });
} else {
  throw new Error('ParentPort in spotifyWorker is null. Is DOWNLOAD_THREADS >= 1?');
}