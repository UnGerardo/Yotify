
const { parentPort } = require('worker_threads');
const { spawn } = require('node:child_process');
const { randomInt } = require('crypto');
const { renameSync } = require('node:fs');
const path = require('path');
const { APP_DIR_PATH, ZOTIFY_DIR, ZOTIFY, ZOTIFY_ARGS, ZOTIFY_FORMAT } = require('./constants');

parentPort.on('message', (args) => {
  const wait = randomInt(30000, 60000);
  setTimeout(() => {
    const [ trackUrl, artists, trackName ] = args;
    console.log(`Worker started: ${ZOTIFY} ${trackUrl} ${artists} ${trackName}`);

    const spotdlInst = spawn(...ZOTIFY_ARGS(trackUrl));
    let STDOUT = '';
    let STDERR = '';

    spotdlInst.stdout.on('data', (data) => STDOUT += data.toString());
    spotdlInst.stderr.on('data', (data) => STDERR += data.toString());
    spotdlInst.on('close', (code) => {
      const expectedFilePath = path.join(APP_DIR_PATH, ZOTIFY_DIR, `${artists[0]}/${artists[0]} - ${trackName}.${ZOTIFY_FORMAT}`);
      const desiredFilePath = path.join(APP_DIR_PATH, ZOTIFY_DIR, `${artists[0]}/${artists.join(', ')} - ${trackName}.${ZOTIFY_FORMAT}`);
      renameSync(expectedFilePath, desiredFilePath);

      parentPort.postMessage({ code, STDOUT, STDERR });
    });
  }, wait);
});