
import { Query } from 'express-serve-static-core';
import { SpotifyPlaylist, SpotifyTrack } from './controllers/spotifyControllers';

interface RequestQuery<T extends Query> extends Express.Request {
  query: T
}

export type TokenReqQuery = RequestQuery<{ code: string, state: string, error: Record<string, string> }>;

export type SearchTracksReqQuery = RequestQuery<{ query: string, downloader: Downloader }>;

interface RequestBody<T> extends Express.Request {
  body: T
}

export type TracksStatusReqBody = RequestBody<{ tracks: SpotifyTrack[], downloader: Downloader }>;

export type PlaylistsStatusReqBody = RequestBody<{ playlists: SpotifyPlaylist[], downloader: Downloader }>;

export type AvailablePlaylistTracksReqBody = RequestBody<{
  access_token: string,
  token_type: string,
  display_name: string,
  playlist_id: string,
  playlist_name: string,
  downloader: Downloader
}>;

export type DownloadTrackReqBody = RequestBody<{
  track_url: string,
  downloader: Downloader,
  artists: string,
  track_name: string
}>;

export type DownloadPlaylistReqBody = RequestBody<{
  access_token: string,
  token_type: string,
  display_name: string,
  playlist_id: string,
  playlist_name: string,
  downloader: Downloader
}>;

export type DownloadPlaylistAvailableReqBody = RequestBody<{
  display_name: string,
  playlist_name: string,
  downloader: Downloader
}>;