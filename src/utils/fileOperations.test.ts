import { readFileSync, Stats, statSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { appendToFile, clearFile, getFile, sanitizeFileName } from "./fileOperations";

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

describe('appendToFile()', () => {
  const filePath = path.join(rootDir, 'file-append.txt');
  writeFileSync(filePath, '', { flag: 'w' });

  it('Appends to a file', () => {
    const fileBeforeAppend = statSync(filePath);
    expect(fileBeforeAppend.size).toBe(0);

    const data = 'This is a string.';
    appendToFile(filePath, data);

    const fileAfterAppend = statSync(filePath);
    expect(fileAfterAppend.size).toBe(data.length);

    const dataInFile = readFileSync(filePath, 'utf8');
    expect(dataInFile).toBe(data);
  });

  afterAll(() => {
    unlinkSync(filePath);
  });
});

describe('sanitizeFileName()', () => {
  const regex = /([^a-zA-Z0-9_\- ]+)/gi;

  it("Replaces all non-matching chars with '-'", () => {
    const string = 'abc123!@#$%^&*()-=_+[]{}\\|;:\'"`~,./<>?\u0000';
    const sanitizedString = sanitizeFileName(string);

    expect(regex.test(string)).toBe(true);
    expect(regex.test(sanitizedString)).toBe(false);
    expect(string === sanitizedString).toBe(false);
  });

  it('Does not modify a string with no matches', () => {
    const goodString = 'a-5tr1ng-w1th-n0-una11owed-char5';
    const sanitizedString = sanitizeFileName(goodString);

    expect(regex.test(goodString)).toBe(false);
    expect(regex.test(sanitizedString)).toBe(false);
    expect(goodString).toStrictEqual(sanitizedString);
  });
});