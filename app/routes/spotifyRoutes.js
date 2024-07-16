
const express = require('express');
const router = express.Router();
const spotifyControllers = require('../controllers/spotifyControllers.js');

router.get('/search', spotifyControllers.search);
router.get('/playlists', spotifyControllers.playlists);

router.get('/auth', spotifyControllers.auth);
router.get('/token', spotifyControllers.token);
router.get('/search/tracks/:query', spotifyControllers.searchTracks);
router.get('/playlist/tracks', spotifyControllers.playlistTracks);

router.post('/playlists/status', spotifyControllers.playlistsStatus);
router.post('/download/track', spotifyControllers.downloadTrack);
router.post('/download/playlist', spotifyControllers.downloadPlaylist);

module.exports = router;