import { SpotifyPlaylist, SpotifyTrack } from "../SpotifyClasses.js";
import { $setDownloaderBtnListener } from "../downloader.js";
import { $renderTrack } from "../renderTrack.js";
import { $createBinaryModal, $createModal } from "../modal.js";
import { $createElement } from "../createElement.js";
import {
  SPOTDL,
  SPOTDL_DOWNLOADED_ICON,
  SPOTIFY_PLAYLIST_FIELDS,
  DOWNLOAD_ICON,
  SPOTDL_DOWNLOADING_ICON,
  ZOTIFY_DOWNLOADED_ICON,
  ZOTIFY_DOWNLOADING_ICON,
  SHOW_ICON
} from "../constants.js";
import { downloadBlob } from "../downloadBlob.js";
import { $clearElementExceptForFirst } from "../clearElementExceptForFirst.js";

let SPOTIFY_ACCESS_TOKEN: string = '';
let SPOTIFY_TOKEN_TYPE: string = '';
let SPOTIFY_DISPLAY_NAME: string = '';
let currentTrackList: SpotifyTrack[] = [];
let currentPlaylists: SpotifyPlaylist[] = [];

const $playlists = document.getElementById('playlists')!;
const $tracks = document.getElementById('tracks')!;

$setDownloaderBtnListener(async () => {
  currentPlaylists = await _setPlaylistsStatus();
  $clearElementExceptForFirst($playlists);
  currentPlaylists.forEach((playlist) => $renderPlaylist(playlist));

  if (currentTrackList.length) {
    currentTrackList = await _setTracksStatus(currentTrackList);
    $clearElementExceptForFirst($tracks);
    currentTrackList.forEach((track) => $renderTrack($tracks, track));
  }
});

(async () => {
  try {
    await _completeSpotifyAuth();
  } catch (err) {
    console.log(err);
    return;
  }

  $renderLikedSongs();
  $renderPlaylists();
})();

async function _completeSpotifyAuth() {
  const _spotifyRedirectUrl = window.location.href;
  const _spotifyRedirectUrlParams = new URLSearchParams(_spotifyRedirectUrl.split('?')[1]);

  const _spotifyTokenRes = await fetch(`/spotify/token?${_spotifyRedirectUrlParams}`);
  if (!_spotifyTokenRes.ok) {
    $createModal(await _spotifyTokenRes.text(), () => { window.location.href = '/spotify/auth' });
    return;
  }

  const _spotifyTokenJson: SpotifyTokenJson = await _spotifyTokenRes.json();
  SPOTIFY_ACCESS_TOKEN = _spotifyTokenJson.access_token;
  SPOTIFY_TOKEN_TYPE = _spotifyTokenJson.token_type;
  SPOTIFY_DISPLAY_NAME = _spotifyTokenJson.display_name;
}

// Rendering functions ----------------------------------------------------------------------------------------------- Rendering functions

async function $renderLikedSongs(): Promise<void> {
  const likedSongsTotal = await _getLikedSongsTotal();

  const $playlist = $createElement('section', ['playlist']) as HTMLElement;
  const $img = $createElement('img', ['cover-image'], { src: '/images/Liked_Songs.png' }) as HTMLImageElement;
  const $nameP = $createElement('p', ['ellip-overflow'], { innerText: 'Liked Songs' }) as HTMLParagraphElement;
  const $trackCountP = $createElement('p', ['track-count'], { innerText: likedSongsTotal }) as HTMLParagraphElement;
  const $showImg = $createElement('img', ['download-image'], { src: SHOW_ICON }) as HTMLImageElement;
  const $showBtn = $createElement('button', ['btn', 'download-btn']) as HTMLButtonElement;
  const $downloadImg = $createElement('img', ['download-image'], { src: DOWNLOAD_ICON }) as HTMLImageElement;
  const $downloadBtn = $createElement('button', ['btn', 'download-btn']) as HTMLButtonElement;

  $showBtn.addEventListener('click', async () => {
    await setLikedSongs();

    $clearElementExceptForFirst($tracks);
    currentTrackList.forEach((track) => {
      $renderTrack($tracks, track);
    });
  });
  $downloadBtn.addEventListener('click', async () => {
    $downloadImg.src = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADING_ICON : ZOTIFY_DOWNLOADING_ICON;

    const downloaded_tracks = await _getAvailableLikedSongs();
    if (downloaded_tracks === 0 || downloaded_tracks === likedSongsTotal) return await downloadLikedSongs($downloadImg);

    $createBinaryModal(
      `Currently, there are ${downloaded_tracks} downloaded tracks, do you want to download them or download the rest?`,
      'Download the current tracks', 'Download the rest',
      async () => {
        await downloadAvailableLikedSongs();
        $downloadImg.src = DOWNLOAD_ICON;
      },
      async () => await downloadLikedSongs($downloadImg)
    );
  });

  $showBtn.appendChild($showImg);
  $downloadBtn.appendChild($downloadImg);
  $playlist.append($img, $nameP, $trackCountP, $showBtn, $downloadBtn);
  $playlists.appendChild($playlist);
}

async function $renderPlaylists(): Promise<void> {
  const _playlistsParams = new URLSearchParams({ limit: '50', offset: '0' });
  const _playlistsRes = await fetch(`https://api.spotify.com/v1/me/playlists?${_playlistsParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  });

  if (!_playlistsRes.ok) {
    const { error }: { error: SpotifyError } = await _playlistsRes.json();
    $createModal(`Error: ${error.message}`);
    return;
  }

  const _playlistsJson: SpotifyPlayistJson = await _playlistsRes.json();
  currentPlaylists = _playlistsJson['items'].map((playlist: Record<string, any>) => new SpotifyPlaylist(playlist));

  currentPlaylists = await _setPlaylistsStatus();
  currentPlaylists.forEach(playlist => {
    $renderPlaylist(playlist);
  });
}

function $renderPlaylist(playlist: SpotifyPlaylist): void {
  const $playlist = $createElement('section', ['playlist']) as HTMLElement;
  const $img = $createElement('img', ['cover-image'], { src: playlist.imageUrl }) as HTMLImageElement;
  const $nameP = $createElement('p', ['ellip-overflow'], { innerText: playlist.name }) as HTMLParagraphElement;
  const $trackCountP = $createElement('p', ['track-count'], { innerText: playlist.tracksTotal }) as HTMLParagraphElement;
  const $showBtn = $createElement('button', ['btn', 'download-btn']) as HTMLButtonElement;
  const $showImg = $createElement('img', ['download-image'], { src: SHOW_ICON }) as HTMLImageElement;
  const $downloadBtn = $createElement('button', ['btn', 'download-btn']) as HTMLButtonElement;
  const $downloadImg = $createElement('img', ['download-image'], {
    src: playlist.downloadStatus === 'Downloaded' ? (playlist.downloader === SPOTDL ? SPOTDL_DOWNLOADED_ICON : ZOTIFY_DOWNLOADED_ICON) :
    DOWNLOAD_ICON
  }) as HTMLImageElement;

  $showBtn.addEventListener('click', async () => {
    $clearElementExceptForFirst($tracks);

    await setPlaylistTracks(playlist.id);
    currentTrackList.forEach((track) => {
      $renderTrack($tracks, track);
    });
  });
  $downloadBtn.addEventListener('click', async () => {
    $downloadImg.src = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADING_ICON : ZOTIFY_DOWNLOADING_ICON;

    if (playlist.downloadStatus === 'Downloaded') {
      await downloadPlaylist(playlist.id, playlist.name, $downloadImg);
    } else if (playlist.downloadStatus === 'Downloading'){
      const downloaded_tracks = await _getAvailablePlaylistSongs(playlist.id, playlist.name);

      if (downloaded_tracks === 0) return $createModal('No tracks downloaded yet.');

      $createBinaryModal(`Currently, there are ${downloaded_tracks} downloaded tracks, do you want to download them?`,
        'Yes', 'No',
        async () => {
          await downloadAvailablePlaylistSongs(playlist.name);
        }
      );
    } else {
      const downloaded_tracks = await _getAvailablePlaylistSongs(playlist.id, playlist.name);

      if (downloaded_tracks === 0 || downloaded_tracks === playlist.tracksTotal) {
        await downloadPlaylist(playlist.id, playlist.name, $downloadImg);
        playlist.downloadStatus = 'Downloading';
        playlist.downloader = localStorage.getItem('downloader')! as Downloader;
        return;
      }

      $createBinaryModal(
        `Currently, there are ${downloaded_tracks} downloaded tracks, do you want to download them or download the rest?`,
        'Download the current tracks', 'Download the rest',
        async () => {
          await downloadAvailablePlaylistSongs(playlist.name);
          $downloadImg.src = DOWNLOAD_ICON;
        },
        async () => {
          await downloadPlaylist(playlist.id, playlist.name, $downloadImg);
          playlist.downloadStatus = 'Downloading';
          playlist.downloader = localStorage.getItem('downloader')! as Downloader;
        }
      );
    }
  });

  $showBtn.appendChild($showImg);
  $downloadBtn.appendChild($downloadImg);
  $playlist.append($img, $nameP, $trackCountP, $showBtn, $downloadBtn);
  $playlists.appendChild($playlist);
}

// Set playlist tracks functions ----------------------------------------------------------------------------------------------- Set playlist tracks functions

async function setLikedSongs(): Promise<void> {
  const _likedSongsParams = new URLSearchParams({ limit: '50', offset: '0', market: 'US' });
  const _likedSongsRes = await fetch(`https://api.spotify.com/v1/me/tracks?${_likedSongsParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  });

  if (!_likedSongsRes.ok) {
    const { error }: { error: SpotifyError } = await _likedSongsRes.json();
    $createModal(`Error: ${error.message}`);
    return;
  }

  const _likedSongsJson = await _likedSongsRes.json();
  const tracks: SpotifyTrack[] = _likedSongsJson['items'].map((item: Record<string, any>) => new SpotifyTrack(item['track']));
  currentTrackList = await _setTracksStatus(tracks);
}

async function setPlaylistTracks(playlistId: string): Promise<void> {
  const _playlistTracksParams = new URLSearchParams({ market: 'US', fields: SPOTIFY_PLAYLIST_FIELDS });
  const _playlistTracksRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?${_playlistTracksParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  });

  if (!_playlistTracksRes.ok) {
    const { error }: { error: SpotifyError } = await _playlistTracksRes.json();
    $createModal(`Error: ${error.message}`);
    return;
  }

  const _playlistTracksJson = await _playlistTracksRes.json();
  const tracks = _playlistTracksJson['items'].map((item: Record<string, any>) => new SpotifyTrack(item['track']));
  currentTrackList = await _setTracksStatus(tracks);
}

// Get track count functions ----------------------------------------------------------------------------------------------- Get track count functions

async function _getLikedSongsTotal(): Promise<number> {
  const _likedSongsParams = new URLSearchParams({ limit: '1', offset: '0', market: 'US' });
  const _likedSongsRes = await fetch(`https://api.spotify.com/v1/me/tracks?${_likedSongsParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  });

  if (!_likedSongsRes.ok) {
    const { error }: { error: SpotifyError } = await _likedSongsRes.json();
    $createModal(`Error: ${error.message}`);
    return 0;
  }

  const _likedSongsJson = await _likedSongsRes.json();
  return _likedSongsJson['total'];
}

async function _getAvailableLikedSongs(): Promise<number> {
  return await _getAvailableSongs('/spotify/liked-songs/tracks/available', JSON.stringify({
    display_name: SPOTIFY_DISPLAY_NAME,
    downloader: localStorage.getItem('downloader')
  }));
}

export async function _getAvailablePlaylistSongs(playlistId: string, playlistName: string): Promise<number> {
  return await _getAvailableSongs('/spotify/liked-songs/tracks/available', JSON.stringify({
    access_token: SPOTIFY_ACCESS_TOKEN,
    token_type: SPOTIFY_TOKEN_TYPE,
    display_name: SPOTIFY_DISPLAY_NAME,
    playlist_id: playlistId,
    playlist_name: playlistName,
    downloader: localStorage.getItem('downloader')
  }));
}

async function _getAvailableSongs(url: string, body: string): Promise<number> {
  const _partialResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body
  });
  return (await _partialResponse.json())['downloaded_tracks'];
}

// Download available songs functions ----------------------------------------------------------------------------------------------- Download available songs functions

export async function downloadAvailableLikedSongs(): Promise<void> {
  await downloadAvailableSongs('/spotify/download/liked-songs/available', JSON.stringify({
    display_name: SPOTIFY_DISPLAY_NAME,
    downloader: localStorage.getItem('downloader')
  }));
}

async function downloadAvailablePlaylistSongs(playlistName: string): Promise<void> {
  await downloadAvailableSongs('/spotify/download/playlist/available', JSON.stringify({
    display_name: SPOTIFY_DISPLAY_NAME,
    playlist_name: playlistName,
    downloader: localStorage.getItem('downloader')
  }));
}

async function downloadAvailableSongs(url: string, body: string): Promise<void> {
  const _downloadResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body
  });
  const _responseHeaders = _downloadResponse.headers;
  if (_responseHeaders.get('content-type') !== 'application/zip') {
    $createModal(await _downloadResponse.text());
    return;
  }

  const encodedFileName = _responseHeaders.get('content-disposition')!.split("=")[1];
  downloadBlob(encodedFileName, await _downloadResponse.blob());
}

// Download all songs functions ----------------------------------------------------------------------------------------------- Download all songs functions

export async function downloadLikedSongs($downloadImg: HTMLImageElement): Promise<void> {
  await downloadCollection('/spotify/download/liked-songs', JSON.stringify({
    access_token: SPOTIFY_ACCESS_TOKEN,
    token_type: SPOTIFY_TOKEN_TYPE,
    display_name: SPOTIFY_DISPLAY_NAME,
    downloader: localStorage.getItem('downloader')
  }), $downloadImg);
}

async function downloadPlaylist(playlistId: string, playlistName: string, $downloadImg: HTMLImageElement): Promise<void> {
  await downloadCollection('/spotify/download/playlist', JSON.stringify({
    access_token: SPOTIFY_ACCESS_TOKEN,
    token_type: SPOTIFY_TOKEN_TYPE,
    display_name: SPOTIFY_DISPLAY_NAME,
    playlist_id: playlistId,
    playlist_name: playlistName,
    downloader: localStorage.getItem('downloader'),
  }), $downloadImg);
}

async function downloadCollection(url: string, body: string, $downloadImg: HTMLImageElement): Promise<void> {
  const _downloadResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body
  });

  const _responseHeaders = _downloadResponse.headers;
  if (_responseHeaders.get('content-type') !== 'application/zip') {
    $createModal(await _downloadResponse.text());
    return;
  }

  const encodedFileName = _responseHeaders.get('content-disposition')!.split("=")[1];
  downloadBlob(encodedFileName, await _downloadResponse.blob());
  $downloadImg.src = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADED_ICON : ZOTIFY_DOWNLOADED_ICON;
}

// Get download status functions ----------------------------------------------------------------------------------------------- Get download status functions

async function _setPlaylistsStatus(): Promise<SpotifyPlaylist[]> {
  const _playlistsStatus = await fetch('/spotify/playlists/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlists: currentPlaylists, downloader: localStorage.getItem('downloader') })
  });

  if (!_playlistsStatus.ok) {
    $createModal(await _playlistsStatus.text());
    return currentPlaylists;
  }

  return await _playlistsStatus.json() as SpotifyPlaylist[];
}

async function _setTracksStatus(tracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
  const _tracksStatusRes = await fetch('/spotify/tracks/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracks, downloader: localStorage.getItem('downloader') })
  });

  if (!_tracksStatusRes.ok) {
    $createModal(await _tracksStatusRes.text());
    return [];
  }

  return await _tracksStatusRes.json() as SpotifyTrack[];
}