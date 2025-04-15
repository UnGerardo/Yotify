
import express, { Request, Response } from 'express';
import path from 'node:path';
import { ROOT_DIR_PATH } from '../constants.js';
import { auth, token } from '../controllers/spotifyAuthControllers.js';
import { downloadTrack, searchTracks, tracksStatus } from '../controllers/spotifyTrackController.js';
import {
  availablePlaylistTracks,
  downloadPlaylist,
  downloadPlaylistAvailable,
  playlistsStatus,
} from '../controllers/spotifyPlaylistControllers.js';
import { availableLikedSongs, downloadAvailableLikedSongs, downloadLikedSongs } from '../controllers/spotifyLikedSongsControllers.js';

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

router.post('/liked-songs/tracks/available', availableLikedSongs);
router.post('/download/liked-songs', downloadLikedSongs);
router.post('/download/liked-songs/available', downloadAvailableLikedSongs);

export default router;