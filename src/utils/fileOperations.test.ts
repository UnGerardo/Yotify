import { Stats, statSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { clearFile, getFile } from "./fileOperations";

const rootDir = process.cwd();
const nonExistentFilePath = path.join(rootDir, 'non-existent.txt');

describe('getFile()', () => {
  const filePath = path.join(rootDir, 'file.txt');
  writeFileSync(filePath, '', { flag: 'w' });

  it('Returns a Stats object of the correct file', () => {
    const file = getFile(filePath);
    expect(file).toBeInstanceOf(Stats);
    expect(file?.isFile()).toBe(true);
    expect(file?.size).toBe(0);
  });

  it('Returns null for a non-existent file', () => {
    const file = getFile(nonExistentFilePath);
    expect(file).toBeNull();
  });

  afterAll(() => {
    unlinkSync(filePath);
  });
});

describe('clearFile()', () => {
  const filePath = path.join(rootDir, 'file-with-text.txt');
  const asciiChars = 'acdef12345';
  writeFileSync(filePath, asciiChars, { flag: 'w' });

  it('Clears a file', () => {
    const fileBeforeClear = statSync(filePath);
    expect(fileBeforeClear.size).toBe(asciiChars.length);
    clearFile(filePath);
    const fileAfterClear = statSync(filePath);
    expect(fileAfterClear.size).toBe(0);
  });

  it('Does not throw an error on a non-existent file', () => {
    clearFile(nonExistentFilePath);
  });

  afterAll(() => {
    unlinkSync(filePath);
  });
});