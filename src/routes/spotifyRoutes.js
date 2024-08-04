
const express = require('express');
const router = express.Router();
const spotifyControllers = require('../controllers/spotifyControllers.js');

router.get('/search', spotifyControllers.search);
router.get('/playlists', spotifyControllers.playlists);

router.get('/auth', spotifyControllers.auth);
router.get('/token', spotifyControllers.token);
router.get('/search/tracks', spotifyControllers.searchTracks);

router.post('/tracks/status', spotifyControllers.tracksStatus);
router.post('/playlists/status', spotifyControllers.playlistsStatus);
router.post('/playlist/tracks/available', spotifyControllers.availablePlaylistTracks);
router.post('/download/track', spotifyControllers.downloadTrack);
router.post('/download/playlist', spotifyControllers.downloadPlaylist);
router.post('/download/playlist/available', spotifyControllers.downloadPlaylistAvailable);

module.exports = router;