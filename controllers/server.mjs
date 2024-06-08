import 'dotenv/config';
import { createServer } from 'node:http';
import { createReadStream, readFile, stat } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomInt } from 'node:crypto';

let spotifyAccessToken = '';
let spotifyTokenType = '';
let spotifyTokenExpiration = 0;

const server = createServer(async (req, res) => {
  let urlPath;

  if (req.method === 'GET') {
    if (req.url.includes('js')) {
      res.setHeader('Content-Type', 'text/javascript');
      urlPath = `./js${req.url}`;
    }
    else if (req.url.includes('css')) {
      res.setHeader('Content-Type', 'text/css');
      urlPath = `./css${req.url}`;
    }
    else {
      res.setHeader('Content-Type', 'text/html');
      urlPath = './html/';

      switch(req.url) {
        // html
        case '/':
          res.statusCode = 200;
          urlPath += 'index.html';
          break;
        case '/spotSearch':
          res.statusCode = 200;
          urlPath += 'spotSearch.html';
          break;
        case '/getPlaylists':
          res.statusCode = 200;
          urlPath += 'getPlaylists.html';
          break;
        // endpoints
        case '/spotifyAuth':
          const state = randomInt(1000000000);
          const scope = 'user-library-read playlist-read-private';

          const params = {
            response_type: 'code',
            client_id: process.env.CLIENT_ID,
            scope: scope,
            redirect_uri: process.env.REDIRECT_URI,
            state: state
          };
          const spotifyAuthParams = new URLSearchParams(params);

          res.writeHead(302, { Location: `https://accounts.spotify.com/authorize?${spotifyAuthParams}` });
          res.end();
          return;
        default:
          res.statusCode = 404;
          urlPath += '404.html';
      }
    }
  }
  if (req.method === 'POST') {
    let reqBodyStr = '';

    switch (req.url.split('?')[0]) {
      case '/searchTrack':
        if (spotifyAccessToken === '' || Date.now() > spotifyTokenExpiration) {
          await getSpotifyAccessToken();
        }

        req.on('data', (chunk) => {
          reqBodyStr += chunk.toString();
        });

        req.on('end', async () => {
          const reqBodyJson = JSON.parse(reqBodyStr);

          const params = {
            q: reqBodyJson['searchQuery'],
            type: 'track',
            market: 'US',
            limit: 20,
            offset: 0
          }
          const spotifySearchParams = new URLSearchParams(params);

          const spotifyResponse = await fetch(`https://api.spotify.com/v1/search?${spotifySearchParams}`, {
            method: 'GET',
            headers: {'Authorization': `${spotifyTokenType} ${spotifyAccessToken}`}
          });
          const spotifyResponseJson = await spotifyResponse.json();

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(spotifyResponseJson['tracks']));
        });
        return;
      case '/downloadTrack':
        req.on('data', (chunk) => {
          reqBodyStr += chunk.toString();
        });

        req.on('end', () => {
          const { trackUrl, artistName, trackName } = JSON.parse(reqBodyStr);

          const zotifyInstance = spawnSync('zotify', [`--root-path=${process.env.MUSIC_ROOT_PATH}`, trackUrl]);

          if (zotifyInstance.error) {
            console.log(`Error: ${zotifyInstance.error.message}`);
          } else {
            console.log(`STDOUT: \n${zotifyInstance.stdout}`);
            console.log(`STDERR: \n${zotifyInstance.stderr}`);
            console.log(`STATUS: ${zotifyInstance.status}`);
          }

          const trackFilePath = `${process.env.MUSIC_ROOT_PATH}${artistName}/${artistName} - ${trackName}.ogg`;
          stat(trackFilePath, (err, stats) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('File not found');
              return;
            }

            res.writeHead(200, {
              'Content-Type': 'application/ogg',
              'Content-Length': stats.size,
              'Content-Disposition': `attachment; filename='${artistName} - ${trackName}.ogg'`
            });

            const readStream = createReadStream(trackFilePath);
            readStream.pipe(res);
          });
        });
        return;
      default:
        res.setHeader('Content-Type', 'text/html');
        res.statusCode = 404;
        urlPath = './html/404.html';
    }
  }

  readFile(urlPath, (err, data) => {
    if (err) {
      console.log(err);
      res.end();
    }

    res.end(data);
  });
});

async function getSpotifyAccessToken() {
  const params = {
    grant_type: 'client_credentials',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  };
  const spotifyCredParams = new URLSearchParams(params);

  const spotifyApiResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body: spotifyCredParams,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  });

  const spotifyApiJson = await spotifyApiResponse.json();

  ({ access_token: spotifyAccessToken, token_type: spotifyTokenType } = spotifyApiJson);
  spotifyTokenExpiration = Date.now() + 3500000;
}

server.listen(3000, '127.0.0.1', () => {
  console.log('Listening on 127.0.0.1:3000');
});