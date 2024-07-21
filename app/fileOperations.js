
const { statSync, truncateSync, writeFileSync } = require('node:fs');

exports.getFile = (path) => {
  try {
    return statSync(path);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Error getting file: ${err.stack}`);
  }
}

exports.clearFile = (path) => {
  try {
    truncateSync(path, 0);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw new Error(`Error clearing file: ${err.stack}`);
    }
  }
}

exports.appendToFile = (path, data) => {
  try {
    writeFileSync(path, data, { flag: 'a' });
  } catch (err) {
    throw new Error(`Error appending to file: ${err.stack}`);
  }
}