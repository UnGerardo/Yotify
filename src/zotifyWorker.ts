
import { parentPort } from 'worker_threads';
import { spawn } from 'node:child_process';
import { randomInt } from 'crypto';
import { renameSync } from 'node:fs';
import path from 'path';
import { ROOT_DIR_PATH, ZOTIFY_DIR, ZOTIFY, ZOTIFY_ARGS, ZOTIFY_FORMAT, ZOTIFY_WAIT_MIN, ZOTIFY_WAIT_MAX } from './constants';
import DownloadingTrack from './classes/DownloadingTrack';

if (parentPort) {
  parentPort.on('message', (track: DownloadingTrack) => {
    const wait: number = randomInt(ZOTIFY_WAIT_MIN, ZOTIFY_WAIT_MAX);
    setTimeout(() => {
      console.log(`Worker started: ${ZOTIFY} | ${track.url} | ${track.artists} | ${track.name}`);

      const zotifyInst = spawn(...ZOTIFY_ARGS(track.url));
      let STDOUT = '';
      zotifyInst.stdout.on('data', (data) => STDOUT += data.toString());
      let STDERR = '';
      zotifyInst.stderr.on('data', (data) => STDERR += data.toString());

      zotifyInst.on('close', (code) => {
        const mainArtist = track.artists[0];
        const expectedFilePath = path.join(ROOT_DIR_PATH, ZOTIFY_DIR, `${mainArtist}/${mainArtist} - ${track.name}.${ZOTIFY_FORMAT}`);
        const desiredFilePath = path.join(ROOT_DIR_PATH, ZOTIFY_DIR, `${mainArtist}/${track.artists.join(', ')} - ${track.name}.${ZOTIFY_FORMAT}`);
        renameSync(expectedFilePath, desiredFilePath);

        if (parentPort){
          parentPort.postMessage({ code, STDOUT, STDERR });
        }
      });
    }, wait);
  });
} else {
  throw new Error('ParentPort in spotdlWorker is null. Is DOWNLOAD_THREADS >= 1?');
}