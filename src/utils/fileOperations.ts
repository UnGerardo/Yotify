
import { Stats, statSync, truncateSync, writeFileSync } from 'node:fs';

export const getFile = (path: string): Stats | null => {
  try {
    return statSync(path);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Error getting file: ${err.stack}`);
  }
}

export const clearFile = (path: string): void => {
  try {
    truncateSync(path, 0);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw new Error(`Error clearing file: ${err.stack}`);
    }
  }
}

export const appendToFile = (path: string, data: string): void => {
  try {
    writeFileSync(path, data, { flag: 'a' });
  } catch (err: any) {
    throw new Error(`Error appending to file: ${err.stack}`);
  }
}

export const sanitizeFileName = (name: string): string => {
  return name.replace(/([^a-zA-Z0-9_ ]+)/gi, '-');
}
