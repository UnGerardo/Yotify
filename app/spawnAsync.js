
const { spawn } = require('node:child_process');

async function spawnAsync(program, args, options) {
  return new Promise((resolve, reject) => {
    const spotdlInst = spawn(program, args, options);

    spotdlInst.stdout.on('data', (data) => {
      console.log(`STDOUT: ${data}`);
    });
    spotdlInst.stderr.on('data', (data) => {
      console.log(`STDOUT: ${data}`);
    });
    spotdlInst.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      }
      reject(code);
    });
  });
}

module.exports = spawnAsync;