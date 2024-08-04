
const { parentPort } = require('worker_threads');
const { spawn } = require('node:child_process');
const { randomInt } = require('crypto');
const { renameSync } = require('node:fs');
const path = require('path');
const { SRC_DIR_PATH, ZOTIFY_DIR, ZOTIFY, ZOTIFY_ARGS, ZOTIFY_FORMAT, ZOTIFY_WAIT_MIN, ZOTIFY_WAIT_MAX } = require('./constants');

parentPort.on('message', (track) => {
  const wait = randomInt(ZOTIFY_WAIT_MIN, ZOTIFY_WAIT_MAX);
  setTimeout(() => {
    console.log(`Worker started: ${ZOTIFY} | ${track.url} | ${track.artists} | ${track.name}`);

    const spotdlInst = spawn(...ZOTIFY_ARGS(track.url));
    let STDOUT = '';
    let STDERR = '';

    spotdlInst.stdout.on('data', (data) => STDOUT += data.toString());
    spotdlInst.stderr.on('data', (data) => STDERR += data.toString());
    spotdlInst.on('close', (code) => {
      const mainArtist = track.artists[0];
      const expectedFilePath = path.join(SRC_DIR_PATH, ZOTIFY_DIR, `${mainArtist}/${mainArtist} - ${track.name}.${ZOTIFY_FORMAT}`);
      const desiredFilePath = path.join(SRC_DIR_PATH, ZOTIFY_DIR, `${mainArtist}/${track.artists.join(', ')} - ${track.name}.${ZOTIFY_FORMAT}`);
      renameSync(expectedFilePath, desiredFilePath);

      parentPort.postMessage({ code, STDOUT, STDERR });
    });
  }, wait);
});