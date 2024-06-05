import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import fetch from 'node-fetch';

const server = createServer(async (req, res) => {
  let path;

  if (req.url.includes('js')) {
    res.setHeader('Content-Type', 'text/javascript');
    console.log(req.url)
    path = `.${req.url}`;
  }
  else if (req.url.includes('css')) {
    res.setHeader('Content-Type', 'text/css');
    console.log(req.url)
    path = `.${req.url}`;
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

      // endpoints
      case '/spotToken':
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', process.env.CLIENT_ID);
        params.append('client_secret', process.env.CLIENT_SECRET);

        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          body: params,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        });

        const data = await response.json();

        console.log(data);
        res.end(JSON.stringify({
          req: 'Complete',
        }));
        return;
        break;
      default:
        res.statusCode = 404;
        path += '404.html';
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

server.listen(3000, '127.0.0.1', () => {
  console.log('Listening on 127.0.0.1:3000');
});