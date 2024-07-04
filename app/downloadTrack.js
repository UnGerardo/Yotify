
const { parentPort } = require('worker_threads');
const { spawn } = require('node:child_process');

parentPort.on('message', (args) => {
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
});