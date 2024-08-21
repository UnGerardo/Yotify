import path from "node:path";
import { ROOT_DIR_PATH, SPOTDL, SPOTDL_DIR, SPOTDL_FORMAT, spotdlFileSanitize, ZOTIFY_DIR, ZOTIFY_FORMAT, zotifyFileSanitize } from "src/constants";

export default class PlaylistTrack {
  artistNames: string[];
  name: string;
  url: string;

  constructor(item: PlaylistTrackJson) {
    this.artistNames = item.track.artists.map((artist) => artist.name);
    this.name = item.track.name;
    this.url = item.track.external_urls.spotify;
  }

  getFilePath(downloader: Downloader): string {
    const sanitizeFunc = downloader === SPOTDL ? spotdlFileSanitize : zotifyFileSanitize;
    const DIR = downloader === SPOTDL ? SPOTDL_DIR : ZOTIFY_DIR;

    return path.join(ROOT_DIR_PATH, DIR, sanitizeFunc(this.artistNames[0]), this.getFileName(downloader));
  }

  getFileName(downloader: Downloader): string {
    const sanitizeFunc = downloader === SPOTDL ? spotdlFileSanitize : zotifyFileSanitize;
    const FORMAT = downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT;

    const artists: string = sanitizeFunc(this.artistNames.join(', '));
    const trackName: string = sanitizeFunc(this.name);

    return `${artists} - ${trackName}.${FORMAT}`;
  }
}