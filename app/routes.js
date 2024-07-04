
const express = require('express');
const router = express.Router();
const controllers = require('./controllers.js');

router.get('/', controllers.homePage);
router.get('/spotifySearch', controllers.spotifySearch);
router.get('/getUserTracks', controllers.getUserTracks);

router.get('/spotifyAuth', controllers.spotifyAuth);
router.get('/spotifyAuthToken', controllers.spotifyAuthToken);
router.get('/searchTrack', controllers.searchTrack);

router.post('/downloadTrack', controllers.downloadTrack);
router.post('/downloadPlaylist', controllers.downloadPlaylist);

module.exports = router;