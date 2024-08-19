
import express, { Request, Response } from 'express';
import path from 'node:path';
import { ROOT_DIR_PATH } from 'src/constants.js';
import {
  availablePlaylistTracks,
  downloadPlaylist,
  downloadPlaylistAvailable,
  playlistsStatus,
} from '../controllers/spotifyControllers.js';
import { auth, token } from 'src/controllers/spotifyAuthControllers.js';
import { downloadTrack, searchTracks, tracksStatus } from 'src/controllers/spotifyTrackController.js';

const router = express.Router();

router.get('/search', (req: Request, res: Response) => {
  res.sendFile(path.join(ROOT_DIR_PATH, 'views/spotify/search.html'));
});
router.get('/playlists', (req: Request, res: Response) => {
  res.sendFile(path.join(ROOT_DIR_PATH, 'views/spotify/playlists.html'));
});

router.get('/auth', auth);
router.get('/token', token);

router.get('/search/tracks', searchTracks);
router.post('/tracks/status', tracksStatus);
router.post('/download/track', downloadTrack);

router.post('/playlists/status', playlistsStatus);
router.post('/playlist/tracks/available', availablePlaylistTracks);
router.post('/download/playlist', downloadPlaylist);
router.post('/download/playlist/available', downloadPlaylistAvailable);

export default router;