import { Response } from "express";
import { createReadStream, renameSync } from "node:fs";
import { spawn } from 'node:child_process';
import path from 'node:path';

import globalState from "../classes/GlobalState.js";
import SpotifyTrack from "../classes/SpotifyTrack.js";
import {
  CREATE_SPOTIFY_SEARCH_URL,
  ROOT_DIR_PATH,
  SET_GENERIC_SPOTIFY_TOKEN,
  SPOTDL,
  SPOTDL_ARGS,
  SPOTDL_DIR,
  SPOTDL_FORMAT,
  spotdlFileSanitize,
  ZOTIFY_ARGS,
  ZOTIFY_DIR,
  ZOTIFY_FORMAT,
  zotifyFileSanitize
} from "../constants.js";
import { DownloadTrackReqBody, SearchTracksReqQuery, TracksStatusReqBody } from "../RequestInterfaces.js";
import { getFile } from "../utils/fileOperations.js";
import handleServerError from "../utils/handleServerError.js";

export const searchTracks = async (req: SearchTracksReqQuery, res: Response) => {
  try {
    const { query, downloader } = req.query;
    await SET_GENERIC_SPOTIFY_TOKEN();

    const tracks: SpotifyTrack[] = await _reqSpotifyTracks(query);
    attachTrackDownloadStatus(tracks, downloader);

    res.json(tracks);
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

export const tracksStatus = (req: TracksStatusReqBody, res: Response) => {
  try {
    const { tracks, downloader } = req.body;
    attachTrackDownloadStatus(tracks, downloader);
    res.json(tracks);
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

export const downloadTrack = async (req: DownloadTrackReqBody, res: Response) => {
  try {
    const { track_url, downloader } = req.body;
    const sanitizeFunc = downloader === SPOTDL ? spotdlFileSanitize : zotifyFileSanitize;
    const SAVE_DIR = downloader === SPOTDL ? SPOTDL_DIR : ZOTIFY_DIR;
    const FORMAT = downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT;

    const artists = sanitizeFunc(req.body['artists']);
    const track_name = sanitizeFunc(req.body['track_name']);
    const mainArtist = artists.split(', ')[0];

    const expectedFilePath = path.join(ROOT_DIR_PATH, SAVE_DIR, mainArtist, `${artists} - ${track_name}.${FORMAT}`);

    console.log(`Fetching: ${downloader} | ${track_url} | ${artists} | ${track_name}`);
    let fileInfo = getFile(expectedFilePath);
    if (!fileInfo) {
      console.log(`Downloading: ${downloader} | ${track_url} | ${artists} | ${track_name}`);
      const downloadOutput = await download(track_url, downloader);
      const downloadFilePath = path.join(ROOT_DIR_PATH, SAVE_DIR, mainArtist, `${mainArtist} - ${track_name}.${FORMAT}`);

      fileInfo = getFile(downloadFilePath);
      if (!fileInfo) {
        throw new Error(`Newly downloaded track '${mainArtist} - ${track_name}.${FORMAT}' not found in ${SAVE_DIR}. ${downloadOutput}`);
      }

      renameSync(downloadFilePath, expectedFilePath);
    }

    const mostCompatibleFileName = spotdlFileSanitize(`${artists} - ${track_name}.${FORMAT}`);
    res.type('audio/mpeg').set({
      'Content-Length': fileInfo.size,
      'Content-Disposition': `attachment; filename=${encodeURIComponent(mostCompatibleFileName)}`
    });

    const readStream = createReadStream(expectedFilePath);
    readStream.pipe(res);
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

async function _reqSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  const _spotifySearchRes = await fetch(CREATE_SPOTIFY_SEARCH_URL(query), {
    method: 'GET',
    headers: { 'Authorization': `${globalState.spotifyTokenType} ${globalState.spotifyToken}` }
  });

  if (!_spotifySearchRes.ok) {
    const { error } = await _spotifySearchRes.json();
    throw error;
  }

  const _spotifySearchJson: Record<string, any> = await _spotifySearchRes.json();
  const searchItems: SpotifyTrack[] = _spotifySearchJson['tracks']['items'].map((item: Record<string, any>) => new SpotifyTrack(item));
  return searchItems;
}

function attachTrackDownloadStatus(tracks: SpotifyTrack[], downloader: Downloader): SpotifyTrack[] {
  const sanitizeFunc = downloader === SPOTDL ? spotdlFileSanitize : zotifyFileSanitize;
  const DIR = downloader === SPOTDL ? SPOTDL_DIR : ZOTIFY_DIR;
  const FORMAT = downloader === SPOTDL ? SPOTDL_FORMAT : ZOTIFY_FORMAT;

  tracks.forEach((track) => {
    const mainArtist = sanitizeFunc(track.artistNames[0]);
    const trackFileName = sanitizeFunc(`${track.artistNames.join(', ')} - ${track.name}`);
    const trackFilePath = path.join(ROOT_DIR_PATH, DIR, mainArtist, `${trackFileName}.${FORMAT}`);

    const isDownloaded = getFile(trackFilePath);
    track.downloadStatus = isDownloaded ? 'Downloaded' : 'Not Downloaded';
    track.downloader = isDownloaded ? downloader : 'none';
  });
  return tracks;
}

async function download(trackUrl: string, downloader: Downloader): Promise<string | number> {
  return new Promise((resolve, reject) => {
    const instance = downloader === SPOTDL ? spawn(...SPOTDL_ARGS(trackUrl)) : spawn(...ZOTIFY_ARGS(trackUrl));

    let STDOUT = '';
    let STDERR = '';

    instance.stdout.on('data', (data) => {
      STDOUT += data.toString();
    });
    instance.stderr.on('data', (data) => {
      STDERR += data.toString();
    });
    instance.on('close', (code) => {
      if (code === 0) {
        resolve(`Download STDOUT: ${STDOUT}. Download STDERR: ${STDERR}.`);
      }
      reject(code);
    });
  });
}
