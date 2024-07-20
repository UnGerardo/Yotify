
const { parentPort } = require('worker_threads');
const { spawn } = require('node:child_process');
const { randomInt } = require('crypto');
const { statSync, renameSync } = require('node:fs');
const path = require('path');
const { APP_DIR_PATH, SPOTDL_DIR } = require('./constants');

parentPort.on('message', (args) => {
  const wait = randomInt(30000, 60000);
  setTimeout(() => {
    const [ spotdlArgs, artists, trackName ] = args;
    console.log(`Worker started: ${spotdlArgs[1][3]} ${artists} ${trackName}`);

    const spotdlInst = spawn(...spotdlArgs);
    let STDOUT = '';
    let STDERR = '';

    spotdlInst.stdout.on('data', (data) => {
      STDOUT += data.toString();
    });
    spotdlInst.stderr.on('data', (data) => {
      STDERR += data.toString();
    });
    spotdlInst.on('close', (code) => {
      const expectedFilePath = path.join(APP_DIR_PATH, SPOTDL_DIR, `${artists[0]}/${artists[0]} - ${trackName}.mp3`);
      const desiredFilePath = path.join(APP_DIR_PATH, SPOTDL_DIR, `${artists[0]}/${artists.join(', ')} - ${trackName}.mp3`);

      try {
        statSync(expectedFilePath);
        try {
          renameSync(expectedFilePath, desiredFilePath);
        } catch (error) {
          console.log(`Renaming Error 34: ${error}`);
        }
      } catch (err) {
        console.log(`Error 37: ${err}`);
      }

      parentPort.postMessage({ code, STDOUT, STDERR});
    });
  }, wait);
});