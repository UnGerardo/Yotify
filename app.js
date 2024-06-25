
const express = require('express');
const path = require('node:path');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/index.html'));
});

app.get('/spotSearch', (req, res) => {
  res.sendFile(path.join(__dirname, '/html/spotSearch.html'));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});