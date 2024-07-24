
const { parentPort } = require('worker_threads');
const { spawn } = require('node:child_process');
const { randomInt } = require('crypto');
const { renameSync } = require('node:fs');
const path = require('path');
const { APP_DIR_PATH, ZOTIFY_DIR, ZOTIFY, ZOTIFY_ARGS, ZOTIFY_FORMAT } = require('./constants');

parentPort.on('message', (track) => {
  const wait = randomInt(30000, 60000);
  setTimeout(() => {
    console.log(`Worker started: ${ZOTIFY} ${track.url} ${track.artists} ${track.name}`);

    const spotdlInst = spawn(...ZOTIFY_ARGS(track.url));
    let STDOUT = '';
    let STDERR = '';

    spotdlInst.stdout.on('data', (data) => STDOUT += data.toString());
    spotdlInst.stderr.on('data', (data) => STDERR += data.toString());
    spotdlInst.on('close', (code) => {
      const mainArtist = track.artists[0];
      const expectedFilePath = path.join(APP_DIR_PATH, ZOTIFY_DIR, `${mainArtist}/${mainArtist} - ${track.name}.${ZOTIFY_FORMAT}`);
      const desiredFilePath = path.join(APP_DIR_PATH, ZOTIFY_DIR, `${mainArtist}/${artists.join(', ')} - ${track.name}.${ZOTIFY_FORMAT}`);
      renameSync(expectedFilePath, desiredFilePath);

      parentPort.postMessage({ code, STDOUT, STDERR });
    });
  }, wait);
});