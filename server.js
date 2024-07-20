require('dotenv').config();

const express = require('express');
const favicon = require('express-favicon');
const path = require('node:path');

const spotifyRoutes = require('./app/routes/spotifyRoutes.js');
const { APP_DIR_PATH } = require('./app/constants.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(APP_DIR_PATH, 'public')));

app.use('/spotify', spotifyRoutes);
app.use('/', (req, res) => {
  res.sendFile(path.join(APP_DIR_PATH, 'views/index.html'));
});

app.use(favicon(path.join(APP_DIR_PATH, 'public/images/Yotify_Icon.ico')));

// middleware that handles 404 errors
app.use(function(req, res, next) {
  res.status(404).sendFile(path.join(APP_DIR_PATH, 'views/404.html'));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});