
const { parentPort } = require('worker_threads');
const { spawn } = require('node:child_process');
const { randomInt } = require('crypto');

parentPort.on('message', (args) => {
  const wait = randomInt(30000, 60000);
  setTimeout(() => {
    console.log(`Worker started: ${args[0]} ${args[1][3]}`);

    const spotdlInst = spawn(...args);
    let STDOUT = '';
    let STDERR = '';

    spotdlInst.stdout.on('data', (data) => {
      STDOUT += data.toString();
    });
    spotdlInst.stderr.on('data', (data) => {
      STDERR += data.toString();
    });
    spotdlInst.on('close', (code) => {
      parentPort.postMessage({ code, STDOUT, STDERR});
    });
  }, wait);
});