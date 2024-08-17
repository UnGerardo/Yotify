
import { parentPort } from 'worker_threads';
import { spawn } from 'node:child_process';
import { randomInt } from 'crypto';
import { renameSync } from 'node:fs';
import path from 'path';
import { ROOT_DIR_PATH, SPOTDL_DIR, SPOTDL_FORMAT, SPOTDL_ARGS, SPOTDL, SPOTDL_WAIT_MIN, SPOTDL_WAIT_MAX } from './constants';
import Track from './Track';

if (parentPort) {
  parentPort.on('message', (track: Track) => {
    const wait: number = randomInt(SPOTDL_WAIT_MIN, SPOTDL_WAIT_MAX);
    setTimeout(() => {
      console.log(`Worker started: ${SPOTDL} | ${track.url} | ${track.artists} | ${track.name}`);

      const spotdlInst = spawn(...SPOTDL_ARGS(track.url));
      let STDOUT = '';
      spotdlInst.stdout.on('data', (data) => STDOUT += data.toString());
      let STDERR = '';
      spotdlInst.stderr.on('data', (data) => STDERR += data.toString());

      spotdlInst.on('close', (code) => {
        const mainArtist = track.artists[0];
        const expectedFilePath = path.join(ROOT_DIR_PATH, SPOTDL_DIR, `${mainArtist}/${mainArtist} - ${track.name}.${SPOTDL_FORMAT}`);
        const desiredFilePath = path.join(ROOT_DIR_PATH, SPOTDL_DIR, `${mainArtist}/${track.artists.join(', ')} - ${track.name}.${SPOTDL_FORMAT}`);
        renameSync(expectedFilePath, desiredFilePath);

        if (parentPort) {
          parentPort.postMessage({ code, STDOUT, STDERR });
        }
      });
    }, wait);
  });
} else {
  throw new Error('ParentPort in spotdlWorker is null. Is DOWNLOAD_THREADS >= 1?');
}