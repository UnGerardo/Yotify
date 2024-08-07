
let SPOTIFY_ACCESS_TOKEN = '';
let SPOTIFY_TOKEN_TYPE = '';
let SPOTIFY_DISPLAY_NAME = '';
let currentTrackList = [];
let currentPlaylists = [];

const $playlists = document.getElementById('playlists');
const $tracks = document.getElementById('tracks');

$setDownloaderBtnListener(async () => {
  while ($playlists.childElementCount > 2) {
    $playlists.removeChild($playlists.lastElementChild);
  }

  const snapshots = currentPlaylists.map((playlist) => ({ playlist_id: playlist['id'], snapshot_id: playlist['snapshot_id'] }));
  const _snapshotRes = await fetch('/spotify/playlists/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ snapshots, downloader: localStorage.getItem('downloader') })
  }).then(res => res.json());

  currentPlaylists.forEach(playlist => {
    $renderPlaylist(playlist, _snapshotRes[playlist['id']]);
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
      $tracks.removeChild($tracks.lastElementChild);
    }

    currentTrackList.forEach((track) => {
      $renderTrack($tracks, track);
    });
  }
});

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

  const _savedTracksParams = new URLSearchParams({ limit: 1, offset: 0, market: 'US' });
  const _savedTracksRes = await fetch(`https://api.spotify.com/v1/me/tracks?${_savedTracksParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  }).then(res => res.json());
  $renderPlaylist({ id: 'liked_songs', images: [{ url: '/images/Liked_Songs.png' }], name: 'Liked Songs', tracks: { total: _savedTracksRes['total'] } }, 'Not Downloaded');

  const _playlistsParams = new URLSearchParams({ limit: 50, offset: 0 });
  const _playlistsRes = await fetch(`https://api.spotify.com/v1/me/playlists?${_playlistsParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  });
  currentPlaylists = (await _playlistsRes.json())['items'];

  const snapshots = currentPlaylists.map((playlist) => ({ playlist_id: playlist['id'], snapshot_id: playlist['snapshot_id'] }));
  const _snapshotRes = await fetch('/spotify/playlists/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ snapshots, downloader: localStorage.getItem('downloader') })
  }).then(res => res.json());

  currentPlaylists.forEach(playlist => {
    $renderPlaylist(playlist, _snapshotRes[playlist['id']]);
  });
})();

function $renderPlaylist(playlist, downloaded) {
  const playlistId = playlist['id'];
  const imgUrl = playlist['images'][0]['url'];
  const name = playlist['name'];
  const trackCount = playlist['tracks']['total'];

  const $playlist = $createElement('section', ['playlist']);
  const $img = $createElement('img', ['cover-image'], { src: imgUrl });
  const $nameP = $createElement('p', ['ellip-overflow'], { innerText: name });
  const $trackCountP = $createElement('p', ['track-count'], { innerText: trackCount });
  const $showBtn = $createElement('button', ['btn', 'download-btn']);
  const $showImg = $createElement('img', ['download-image'], { src: '/images/Show_Icon.png' });
  $showBtn.addEventListener('click', async () => {
    while ($tracks.firstElementChild !== $tracks.lastElementChild) {
      $tracks.removeChild($tracks.lastElementChild);
    }

    let url = null;
    if (playlistId === 'liked_songs') {
      const _savedTracksParams = new URLSearchParams({ limit: 50, offset: 0, market: 'US' });
      url = `https://api.spotify.com/v1/me/tracks?${_savedTracksParams}`;
    } else {
      const _playlistParams = new URLSearchParams({ market: 'US', fields: SPOTIFY_PLAYLIST_FIELDS });
      url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?${_playlistParams}`;
    }

    const _playlistRes = await fetch(url, {
      headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
    }).then(res => res.json());
    const tracks = _playlistRes['items'].map((item) => item['track']);

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
  const $downloadBtn = $createElement('button', ['btn', 'download-btn']);
  const $downloadImg = $createElement('img', ['download-image'], {
    src: downloaded === SPOTDL ? SPOTDL_DOWNLOADED_ICON :
      downloaded === ZOTIFY ? ZOTIFY_DOWNLOADED_ICON :
      downloaded === SPOTDL_DOWNLOADING ? SPOTDL_DOWNLOADING_ICON :
      downloaded === ZOTIFY_DOWNLOADING ? ZOTIFY_DOWNLOADING_ICON : DOWNLOAD_ICON
    });
  $downloadBtn.addEventListener('click', async () => {
    $downloadImg.src = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADING_ICON : ZOTIFY_DOWNLOADING_ICON;

    switch (downloaded) {
      case SPOTDL:
      case ZOTIFY:
        await downloadPlaylist(playlistId, name, $downloadImg);
        break;
      case SPOTDL_DOWNLOADING:
      case ZOTIFY_DOWNLOADING: {
        const downloaded_tracks = await getDownloadedTracks(playlistId, name);

        if (downloaded_tracks === 0) {
          $createModal('No tracks downloaded yet.');
          return;
        }

        $createBinaryModal(
          `Currently, there are ${downloaded_tracks} downloaded tracks, do you want to download them?`,
          'Yes',
          'No',
          async () => {
            await downloadAvailable(name);
          }
        );
        break;
      }
      default: {
        const downloaded_tracks = await getDownloadedTracks(playlistId, name);

        if (downloaded_tracks === 0 || downloaded_tracks === parseInt(trackCount)) {
          await downloadPlaylist(playlistId, name, $downloadImg);
          downloaded = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADING : ZOTIFY_DOWNLOADING;
        } else {
          $createBinaryModal(
            `Currently, there are ${downloaded_tracks} downloaded tracks, do you want to download them or download the rest?`,
            'Download the current tracks',
            'Download the rest',
            async () => {
              await downloadAvailable(name);
              $downloadImg.src = DOWNLOAD_ICON;
            },
            async () => {
              await downloadPlaylist(playlistId, name, $downloadImg);
              downloaded = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADING : ZOTIFY_DOWNLOADING;
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

async function downloadAvailable(name) {
  const _downloadResponse = await fetch('/spotify/download/playlist/available', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      display_name: SPOTIFY_DISPLAY_NAME,
      playlist_name: name,
      downloader: localStorage.getItem('downloader')
    })
  });
  const _responseHeaders = _downloadResponse.headers;
  if (_responseHeaders.get('content-type') !== 'application/zip') {
    $createModal(await _downloadResponse.text());
    return;
  }

  const encodedFileName = _responseHeaders.get('content-disposition').split("=")[1];
  downloadBlob(encodedFileName, await _downloadResponse.blob());
}

async function downloadPlaylist(playlistId, name, $downloadImg) {
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
      playlist_name: name,
      downloader: localStorage.getItem('downloader')
    })
  });
  const _responseHeaders = _downloadResponse.headers;
  if (_responseHeaders.get('content-type') !== 'application/zip') {
    $createModal(await _downloadResponse.text());
    return;
  }

  const encodedFileName = _responseHeaders.get('content-disposition').split("=")[1];
  downloadBlob(encodedFileName, await _downloadResponse.blob());
  $downloadImg.src = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADED_ICON : ZOTIFY_DOWNLOADED_ICON;
}

async function getDownloadedTracks(playlistId, name) {
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
      playlist_name: name,
      downloader: localStorage.getItem('downloader')
    })
  });
  return (await _partialResponse.json())['downloaded_tracks'];
}

function downloadBlob(encodedFileName, blob) {
  const url = window.URL.createObjectURL(blob);

  const $link = $createElement('a', [], { href: url, download: decodeURIComponent(encodedFileName), style: { display: 'none' } });
  document.body.appendChild($link);

  $link.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild($link);
}