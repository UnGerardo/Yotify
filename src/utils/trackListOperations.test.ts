import { Stats } from 'fs';
import { getFile } from './fileOperations';
import PlaylistTrack from '../classes/PlaylistTrack';
import { downloadMissingTracks, hasMissingTracks } from './trackListOperations';
import workerPool from '../classes/WorkerPool';

jest.mock('./fileOperations');
const mockedGetFile = jest.mocked(getFile);

describe('hasMissingTracks()', () => {
  const tracks = Array(3).fill({ getFilePath: () => '' }) as unknown as PlaylistTrack[];
  Object.freeze(tracks);
  const downloader = 'none';

  beforeEach(() => {
    mockedGetFile.mockClear();
  });

  it('Returns true if at least one file is not found', () => {
    mockedGetFile.mockReturnValueOnce({} as Stats)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({} as Stats);

    expect(hasMissingTracks(tracks, downloader)).toBe(true);
    expect(mockedGetFile).toHaveBeenCalledTimes(2);
  });

  it('Returns false if all files are found', () => {
    mockedGetFile.mockReturnValue({} as Stats);

    expect(hasMissingTracks(tracks, downloader)).toBe(false);
    expect(mockedGetFile).toHaveBeenCalledTimes(3);
  });

  it('Throws an error if any empty array is passed in', () => {
    expect(() => hasMissingTracks([], downloader)).toThrow('hasMissingTracks() received an empty array');
  });
});

jest.mock('../classes/WorkerPool');
const mockedAddTask = jest.mocked(workerPool.addTask);

describe('downloadMissingTracks()', () => {
  const tracks = Array(4).fill({ getFilePath: () => '' }) as unknown as PlaylistTrack[];
  Object.freeze(tracks);
  const playlistId = 'playlistId';
  const snapshotId = 'snapshotId';
  const downloader = 'none';

  beforeEach(() => {
    mockedGetFile.mockClear();
    mockedAddTask.mockClear();
  });

  it('Calls addTask for each null returned from getFile', () => {
    mockedGetFile.mockReturnValueOnce({} as Stats)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({} as Stats)
      .mockReturnValueOnce(null);

    downloadMissingTracks(tracks, playlistId, snapshotId, downloader);

    expect(mockedAddTask).toHaveBeenCalledTimes(2);
  });

  it('Throws an error if any empty array is passed in', () => {
    expect(() => downloadMissingTracks([], playlistId, snapshotId, downloader)).toThrow('downloadMissingTracks() received an empty array');
  });
});