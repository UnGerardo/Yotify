
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

// app.post('/downloadTrack', (req, res) => {
//   try {
//     res.writeHead(200, {
//       'Content-Type': 'application/zip',
//       'Content-Disposition': 'attachment; filename=songs.zip',
//     });

//     const archive = archiver('zip', { zlib: { level: 9 } });
//     archive.pipe(res);

//     readdirSync(path.join(__dirname, '\\Music\\AmaLee')).forEach((file) => {
//       const filePath = path.join(__dirname, '\\Music\\AmaLee\\', file);
//       archive.file(filePath, { name: file });
//     });

//     archive.finalize();
//   } catch (error) {
//     console.error('Error downloading or archiving files:', error);
//     res.writeHead(500, { 'Content-Type': 'text/plain' });
//     res.end('Internal Server Error');
//   }
// });

module.exports = router;