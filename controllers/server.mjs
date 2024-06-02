import { createServer } from 'node:http';
import { readFile } from 'node:fs';

const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');

  let path = './html/';
  switch(req.url) {
    case '/':
      res.statusCode = 200;
      path += 'index.html';
      break;
    default:
      res.statusCode = 404;
      path += '404.html';
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