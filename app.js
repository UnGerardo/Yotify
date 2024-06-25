
const express = require('express');
const { randomBytes } = require('node:crypto');
const path = require('node:path');

const app = express();
const port = 3000;

const USER_ID_STATE_MAP = new Map();
let userId = 0;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/index.html'));
});

app.get('/spotSearch', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/spotSearch.html'));
});

app.get('/getPlaylists', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/getPlaylists.html'));
});

app.get('/spotifyAuth', (req, res) => {
  const randomStr = randomBytes(16).toString('hex');
  let stateStr = `${userId}:${randomStr}`;
  USER_ID_STATE_MAP.set(userId, randomStr);
  userId++;

  const scope = 'user-library-read playlist-read-private';

  const spotifyAuthParams = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CLIENT_ID,
    scope: scope,
    redirect_uri: process.env.REDIRECT_URI,
    state: stateStr,
    show_dialog: true
  });

  res.redirect(302, `https://accounts.spotify.com/authorize?${spotifyAuthParams}`);
});

// middleware that handles 404 errors
app.use(function(req, res, next) {
  res.status(404).sendFile(path.join(__dirname, '/html/404.html'));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});