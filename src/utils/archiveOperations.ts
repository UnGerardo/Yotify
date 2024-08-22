import archiver, { Archiver } from 'archiver';
import { Response } from "express";
import PlaylistTrack from 'src/classes/PlaylistTrack';
import { sanitizeFileName } from './fileOperations';

export function sendArchiveToClient(playlistName: string, res: Response, tracks: PlaylistTrack[], downloader: Downloader): void {
  res.type('application/zip').set('Content-Disposition', `attachment; filename=${sanitizeFileName(playlistName)}-Tracks.zip`);

  const archive: Archiver = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  for (const track of tracks) {
    archive.file(track.getFilePath(downloader), { name: sanitizeFileName(track.getFileName(downloader)) });
  };

  archive.finalize();
}