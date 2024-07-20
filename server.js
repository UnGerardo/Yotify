require('dotenv').config();

const express = require('express');
const favicon = require('express-favicon');
const path = require('node:path');

const spotifyRoutes = require('./app/routes/spotifyRoutes.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/spotify', spotifyRoutes);
app.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, './views/index.html'));
});

app.use(favicon(`${__dirname}/public/images/Yotify_Icon.ico`));

// middleware that handles 404 errors
app.use(function(req, res, next) {
  res.status(404).sendFile(path.join(__dirname, '/views/404.html'));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});