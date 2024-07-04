
const { spawn } = require('node:child_process');

module.exports.spawnAsync = async (program, args, options) => {
  return new Promise((resolve, reject) => {
    const spotdlInst = spawn(program, args, options);

    spotdlInst.stdout.on('data', (data) => {
      console.log(`STDOUT: ${data}`);
    });
    spotdlInst.stderr.on('data', (data) => {
      console.log(`STDERR: ${data}`);
    });
    spotdlInst.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      }
      reject(code);
    });
  });
}