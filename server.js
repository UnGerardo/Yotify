require('dotenv').config();

const express = require('express');
const path = require('node:path');

const routes = require('./app/routes.js');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// middleware that handles 404 errors
app.use(function(req, res, next) {
  res.status(404).sendFile(path.join(__dirname, '/views/404.html'));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});