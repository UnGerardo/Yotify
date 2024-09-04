import { Stats } from 'fs';
import { getFile } from './fileOperations';
import PlaylistTrack from '../classes/PlaylistTrack';
import { hasMissingTracks } from './trackListOperations';

jest.mock('./fileOperations');

const mockedGetFile = jest.mocked(getFile);

describe('hasMissingTracks()', () => {
  const tracks = Array(3).fill({ getFilePath: () => '' }) as unknown as PlaylistTrack[];
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
    mockedGetFile.mockReturnValueOnce({} as Stats)
    .mockReturnValueOnce({} as Stats)
    .mockReturnValueOnce({} as Stats);

    expect(hasMissingTracks(tracks, downloader)).toBe(false);
    expect(mockedGetFile).toHaveBeenCalledTimes(3);
  });

  it('Returns false for an empty array', () => {
    expect(hasMissingTracks([], downloader)).toBe(false);
    expect(mockedGetFile).not.toHaveBeenCalled();
  });
});