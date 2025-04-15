import 'dotenv/config';

import express, { Request, Response } from 'express';
import path from 'node:path';

import spotifyRoutes from './routes/spotifyRoutes.js';
import { PLAYLIST_FILES_DIR, PORT, ROOT_DIR_PATH, SPOTDL_DIR, ZOTIFY_DIR } from './constants.js';
import { mkdirSync } from 'node:fs';

const app = express();
const port: number = PORT || 3000;

mkdirSync(path.join(ROOT_DIR_PATH, SPOTDL_DIR), { recursive: true });
mkdirSync(path.join(ROOT_DIR_PATH, ZOTIFY_DIR), { recursive: true });
mkdirSync(path.join(ROOT_DIR_PATH, PLAYLIST_FILES_DIR), { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(ROOT_DIR_PATH, 'build/public')));
app.use(express.static(path.join(ROOT_DIR_PATH, 'public')));

app.use('/spotify', spotifyRoutes);
app.get('/favicon.ico', (req: Request, res: Response) => {
  res.type('image/x-icon').sendFile(path.join(ROOT_DIR_PATH, 'public/images/favicon.ico'));
});
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(ROOT_DIR_PATH, 'views/index.html'));
});

app.use((req: Request, res: Response, next) => {
  res.status(404).sendFile(path.join(ROOT_DIR_PATH, 'views/404.html'));
});

export const listener = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

export default app;