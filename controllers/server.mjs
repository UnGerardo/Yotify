import { createServer } from 'node:http';
import { readFile } from 'node:fs';

const server = createServer((req, res) => {
  let path;

  if (req.url.includes('js')) {
    res.setHeader('Content-Type', 'text/javascript');
    console.log(req.url)
    path = req.url;
  }
  else if (req.url.includes('css')) {
    res.setHeader('Content-Type', 'text/css');
    console.log(req.url)
    path = req.url;
  }
  else {
    res.setHeader('Content-Type', 'text/html');
    path = './html/';

    switch(req.url) {
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