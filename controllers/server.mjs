import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs';

let spotifyAccessToken = '';
let spotifyTokenType = '';
let spotifyTokenExpiration = 0;

const server = createServer(async (req, res) => {
  console.log(req.url);
  console.log(req.method);
  let path;

  if (req.method === 'GET') {
    if (req.url.includes('js')) {
      res.setHeader('Content-Type', 'text/javascript');
      path = `./js${req.url}`;
    }
    else if (req.url.includes('css')) {
      res.setHeader('Content-Type', 'text/css');
      path = `./css${req.url}`;
    }
    else {
      res.setHeader('Content-Type', 'text/html');
      path = './html/';

      switch(req.url) {
        // html
        case '/':
          res.statusCode = 200;
          path += 'index.html';
          break;
        case '/spotSearch':
          res.statusCode = 200;
          path += 'spotSearch.html';
          break;
        default:
          res.statusCode = 404;
          path += '404.html';
      }
    }
  }
  if (req.method === 'POST') {
    switch (req.url.split('?')[0]) {
      case '/searchTrack':
        console.log(`Token 1: ${spotifyAccessToken}`);
        if (spotifyAccessToken === '' || Date.now() > spotifyTokenExpiration) {
          await getSpotifyAccessToken();
        }

        let reqBodyStr = '';
        req.on('data', (chunk) => {
          reqBodyStr += chunk.toString();
        });

        req.on('end', async () => {
          const reqBodyJson = JSON.parse(reqBodyStr);
          console.log(reqBodyJson['searchQuery']);
          const spotifySearchParams = new URLSearchParams();
          spotifySearchParams.append('q', reqBodyJson['searchQuery']);
          spotifySearchParams.append('type', 'track');
          spotifySearchParams.append('market', 'US');
          spotifySearchParams.append('limit', 20);
          spotifySearchParams.append('offset', 0);

          const spotifyResponse = await fetch(`https://api.spotify.com/v1/search?${spotifySearchParams}`, {
            method: 'GET',
            headers: {'Authorization': `${spotifyTokenType} ${spotifyAccessToken}`}
          });
          const spotifyResponseJson = await spotifyResponse.json();

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify(spotifyResponseJson['tracks']));
        });
        console.log(`Token 2: ${spotifyAccessToken}`);
        return;
      default:
        res.setHeader('Content-Type', 'text/html');
        res.statusCode = 404;
        path = './html/404.html';
    }
  }

  console.log(path)
  readFile(path, (err, data) => {
    if (err) {
      console.log(err);
      res.end();
    }

    res.end(data);
  });
});

async function getSpotifyAccessToken() {
  const spotifyCredParams = new URLSearchParams();
  spotifyCredParams.append('grant_type', 'client_credentials');
  spotifyCredParams.append('client_id', process.env.CLIENT_ID);
  spotifyCredParams.append('client_secret', process.env.CLIENT_SECRET);

  const spotifyApiResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body: spotifyCredParams,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  });

  const spotifyApiJson = await spotifyApiResponse.json();

  spotifyAccessToken = spotifyApiJson['access_token'];
  spotifyTokenType = spotifyApiJson['token_type'];
  spotifyTokenExpiration = Date.now() + 3500000;
}

server.listen(3000, '127.0.0.1', () => {
  console.log('Listening on 127.0.0.1:3000');
});