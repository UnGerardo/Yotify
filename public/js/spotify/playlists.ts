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

let SPOTIFY_ACCESS_TOKEN: string = '';
let SPOTIFY_TOKEN_TYPE: string = '';
let SPOTIFY_DISPLAY_NAME: string = '';
let currentTrackList: SpotifyTrack[] = [];
let currentPlaylists: SpotifyPlaylist[] = [];

const $playlists = document.getElementById('playlists')!;
const $tracks = document.getElementById('tracks')!;

$setDownloaderBtnListener(async () => {
  while ($playlists.childElementCount > 2) {
    $playlists.removeChild($playlists.lastElementChild!);
  }

  const _playlistsStatusRes = await fetch('/spotify/playlists/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playlists: currentPlaylists, downloader: localStorage.getItem('downloader') })
  });

  currentPlaylists = await _playlistsStatusRes.json();
  currentPlaylists.forEach(playlist => {
    $renderPlaylist(playlist);
  });

  if (currentTrackList.length) {
    const _tracksStatusRes = await fetch('/spotify/tracks/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks: currentTrackList, downloader: localStorage.getItem('downloader') })
    });
    currentTrackList = await _tracksStatusRes.json();

    while ($tracks.firstElementChild !== $tracks.lastElementChild) {
      $tracks.removeChild($tracks.lastElementChild!);
    }

    currentTrackList.forEach((track) => {
      $renderTrack($tracks, track);
    });
  }
});

interface SpotifyPlayistResJson {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  items: Record<string, any>[];
}

(async () => {
  const url = window.location.href;
  const _urlParams = new URLSearchParams(url.split('?')[1]);

  try {
    const _spotifyTokenRes = await fetch(`/spotify/token?${_urlParams}`);
    if (!_spotifyTokenRes.ok) {
      $createModal(await _spotifyTokenRes.text(), () => { window.location.href = '/spotify/auth' });
      return;
    }
    const _spotifyTokenJson = await _spotifyTokenRes.json();

    ({
      access_token: SPOTIFY_ACCESS_TOKEN,
      token_type: SPOTIFY_TOKEN_TYPE,
      display_name: SPOTIFY_DISPLAY_NAME
    } = _spotifyTokenJson);
  } catch (err) {
    console.log(err);
    return;
  }

  const _savedTracksParams = new URLSearchParams({ limit: '1', offset: '0', market: 'US' });
  const _savedTracksRes = await fetch(`https://api.spotify.com/v1/me/tracks?${_savedTracksParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  }).then(res => res.json());
  $renderPlaylist(new SpotifyPlaylist({ id: 'liked_songs', images: [{ url: '/images/Liked_Songs.png' }], name: 'Liked Songs', tracks: { total: _savedTracksRes['total'] } }));

  const _playlistsParams = new URLSearchParams({ limit: '50', offset: '0' });
  const _playlistsRes = await fetch(`https://api.spotify.com/v1/me/playlists?${_playlistsParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  });
  const _playlistResJson: SpotifyPlayistResJson = await _playlistsRes.json();
  currentPlaylists = _playlistResJson['items'].map((playlist: Record<string, any>) => new SpotifyPlaylist(playlist));

  const _playlistsStatusRes = await fetch('/spotify/playlists/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playlists: currentPlaylists, downloader: localStorage.getItem('downloader') })
  });

  currentPlaylists = await _playlistsStatusRes.json();
  currentPlaylists.forEach(playlist => {
    $renderPlaylist(playlist);
  });
})();

function $renderPlaylist(playlist: SpotifyPlaylist) {
  const $playlist = $createElement('section', ['playlist']) as HTMLElement;
  const $img = $createElement('img', ['cover-image'], { src: playlist.imageUrl }) as HTMLImageElement;
  const $nameP = $createElement('p', ['ellip-overflow'], { innerText: playlist.name }) as HTMLParagraphElement;
  const $trackCountP = $createElement('p', ['track-count'], { innerText: playlist.tracksTotal }) as HTMLParagraphElement;
  const $showBtn = $createElement('button', ['btn', 'download-btn']) as HTMLButtonElement;
  const $showImg = $createElement('img', ['download-image'], { src: SHOW_ICON }) as HTMLImageElement;
  $showBtn.addEventListener('click', async () => {
    while ($tracks.firstElementChild !== $tracks.lastElementChild) {
      $tracks.removeChild($tracks.lastElementChild!);
    }

    let url: string = '';
    if (playlist.id === 'liked_songs') {
      const _savedTracksParams = new URLSearchParams({ limit: '50', offset: '0', market: 'US' });
      url = `https://api.spotify.com/v1/me/tracks?${_savedTracksParams}`;
    } else {
      const _playlistParams = new URLSearchParams({ market: 'US', fields: SPOTIFY_PLAYLIST_FIELDS });
      url = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?${_playlistParams}`;
    }

    const _playlistRes = await fetch(url, {
      headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
    }).then(res => res.json());
    const tracks = _playlistRes['items'].map((item: Record<string, any>) => new SpotifyTrack(item['track']));

    const _tracksStatusRes = await fetch('/spotify/tracks/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks, downloader: localStorage.getItem('downloader') })
    });
    currentTrackList = await _tracksStatusRes.json();

    currentTrackList.forEach((track) => {
      $renderTrack($tracks, track);
    });
  });
  const $downloadBtn = $createElement('button', ['btn', 'download-btn']) as HTMLButtonElement;
  const $downloadImg = $createElement('img', ['download-image'], {
    src: playlist.downloadStatus === 'Downloaded' ? (playlist.downloader === SPOTDL ? SPOTDL_DOWNLOADED_ICON : ZOTIFY_DOWNLOADED_ICON) :
      '/images/Download_Icon.png'
    }) as HTMLImageElement;
  $downloadBtn.addEventListener('click', async () => {
    $downloadImg.src = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADING_ICON : ZOTIFY_DOWNLOADING_ICON;

    switch (playlist.downloadStatus) {
      case 'Downloaded':
        await downloadPlaylist(playlist.id, playlist.name, $downloadImg);
        break;
      case 'Downloading': {
        const downloaded_tracks = await getDownloadedTracks(playlist.id, playlist.name);

        if (downloaded_tracks === 0) {
          $createModal('No tracks downloaded yet.');
          return;
        }

        $createBinaryModal(
          `Currently, there are ${downloaded_tracks} downloaded tracks, do you want to download them?`,
          'Yes',
          'No',
          async () => {
            await downloadAvailable(playlist.name);
          }
        );
        break;
      }
      default: {
        const downloaded_tracks = await getDownloadedTracks(playlist.id, playlist.name);

        if (downloaded_tracks === 0 || downloaded_tracks === playlist.tracksTotal) {
          await downloadPlaylist(playlist.id, playlist.name, $downloadImg);
          playlist.downloadStatus = 'Downloading';
          playlist.downloader = localStorage.getItem('downloader')! as Downloader;
        } else {
          $createBinaryModal(
            `Currently, there are ${downloaded_tracks} downloaded tracks, do you want to download them or download the rest?`,
            'Download the current tracks',
            'Download the rest',
            async () => {
              await downloadAvailable(playlist.name);
              $downloadImg.src = DOWNLOAD_ICON;
            },
            async () => {
              await downloadPlaylist(playlist.id, playlist.name, $downloadImg);
              playlist.downloadStatus = 'Downloading';
              playlist.downloader = localStorage.getItem('downloader')! as Downloader;
            }
          );
        }
      }
    }
  });

  $showBtn.appendChild($showImg);
  $downloadBtn.appendChild($downloadImg);
  $playlist.append($img, $nameP, $trackCountP, $showBtn, $downloadBtn);
  $playlists.appendChild($playlist);
}

async function downloadAvailable(playlistName: string) {
  const _downloadResponse = await fetch('/spotify/download/playlist/available', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      display_name: SPOTIFY_DISPLAY_NAME,
      playlist_name: playlistName,
      downloader: localStorage.getItem('downloader')
    })
  });
  const _responseHeaders = _downloadResponse.headers;
  if (_responseHeaders.get('content-type') !== 'application/zip') {
    $createModal(await _downloadResponse.text());
    return;
  }

  const encodedFileName = _responseHeaders.get('content-disposition')!.split("=")[1];
  downloadBlob(encodedFileName, await _downloadResponse.blob());
}

async function downloadPlaylist(playlistId: string, playlistName: string, $downloadImg: HTMLImageElement) {
  const _downloadResponse = await fetch('/spotify/download/playlist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      access_token: SPOTIFY_ACCESS_TOKEN,
      token_type: SPOTIFY_TOKEN_TYPE,
      display_name: SPOTIFY_DISPLAY_NAME,
      playlist_id: playlistId,
      playlist_name: playlistName,
      downloader: localStorage.getItem('downloader')
    })
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

async function getDownloadedTracks(playlistId: string, playlistName: string) {
  const _partialResponse = await fetch('/spotify/playlist/tracks/available', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      access_token: SPOTIFY_ACCESS_TOKEN,
      token_type: SPOTIFY_TOKEN_TYPE,
      display_name: SPOTIFY_DISPLAY_NAME,
      playlist_id: playlistId,
      playlist_name: playlistName,
      downloader: localStorage.getItem('downloader')
    })
  });
  return (await _partialResponse.json())['downloaded_tracks'];
}

function downloadBlob(encodedFileName: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob);

  const $link = $createElement('a', [], { href: url, download: decodeURIComponent(encodedFileName), style: { display: 'none' } });
  document.body.appendChild($link);

  $link.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild($link);
}