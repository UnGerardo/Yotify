import 'dotenv/config';

import express, { Request, Response } from 'express';
import path from 'node:path';

import spotifyRoutes from './routes/spotifyRoutes.js';
import { PORT, APP_DIR_PATH } from './constants.js';

const app = express();
const port: number = PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(APP_DIR_PATH, 'build/public')));
app.use(express.static(path.join(APP_DIR_PATH, 'public')));

app.use('/spotify', spotifyRoutes);
app.use('/favicon.ico', (req: Request, res: Response) => {
  res.type('image/x-icon').sendFile(path.join(APP_DIR_PATH, 'public/images/favicon.ico'));
});
app.use('/', (req: Request, res: Response) => {
  res.sendFile(path.join(APP_DIR_PATH, 'views/index.html'));
});

app.use((req: Request, res: Response, next) => {
  res.status(404).sendFile(path.join(APP_DIR_PATH, 'views/404.html'));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});