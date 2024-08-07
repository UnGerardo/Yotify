
import express from 'express';
import {
  auth,
  availablePlaylistTracks,
  downloadPlaylist,
  downloadPlaylistAvailable,
  downloadTrack,
  playlists,
  playlistsStatus,
  search,
  searchTracks,
  token,
  tracksStatus
} from '../controllers/spotifyControllers.js';

const router = express.Router();

router.get('/search', search);
router.get('/playlists', playlists);

router.get('/auth', auth);
router.get('/token', token);
router.get('/search/tracks', searchTracks);

router.post('/tracks/status', tracksStatus);
router.post('/playlists/status', playlistsStatus);
router.post('/playlist/tracks/available', availablePlaylistTracks);
router.post('/download/track', downloadTrack);
router.post('/download/playlist', downloadPlaylist);
router.post('/download/playlist/available', downloadPlaylistAvailable);

export default router;