
const { parentPort } = require('worker_threads');
const { spawn } = require('node:child_process');
const { randomInt } = require('crypto');
const { renameSync } = require('node:fs');
const path = require('path');
const { APP_DIR_PATH, SPOTDL_DIR, SPOTDL_FORMAT, SPOTDL_ARGS } = require('./constants');

parentPort.on('message', (args) => {
  const wait = randomInt(30000, 60000);
  setTimeout(() => {
    const [ trackUrl, artists, trackName ] = args;
    console.log(`Worker started: ${trackUrl} ${artists} ${trackName}`);

    const spotdlInst = spawn(...SPOTDL_ARGS(trackUrl));
    let STDOUT = '';
    let STDERR = '';

    spotdlInst.stdout.on('data', (data) => {
      STDOUT += data.toString();
    });
    spotdlInst.stderr.on('data', (data) => {
      STDERR += data.toString();
    });
    spotdlInst.on('close', (code) => {
      const expectedFilePath = path.join(APP_DIR_PATH, SPOTDL_DIR, `${artists[0]}/${artists[0]} - ${trackName}.${SPOTDL_FORMAT}`);
      const desiredFilePath = path.join(APP_DIR_PATH, SPOTDL_DIR, `${artists[0]}/${artists.join(', ')} - ${trackName}.${SPOTDL_FORMAT}`);
      renameSync(expectedFilePath, desiredFilePath);

      parentPort.postMessage({ code, STDOUT, STDERR });
    });
  }, wait);
});