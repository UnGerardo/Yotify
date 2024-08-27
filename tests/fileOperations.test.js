import { Stats, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { getFile } from "../build/src/utils/fileOperations.js";

const rootDir = process.cwd();
const filePath = path.join(rootDir, 'file.txt');

it('Returns a Stats object of the correct file', () => {
  writeFileSync(filePath, '', { flag: 'w' });

  const file = getFile(filePath);
  expect(file).toBeInstanceOf(Stats);
  expect(file?.isFile()).toBe(true);
  expect(file?.size).toBe(0);
});

afterAll(() => {
  unlinkSync(filePath);
})