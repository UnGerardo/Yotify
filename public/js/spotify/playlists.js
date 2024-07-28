
let SPOTIFY_ACCESS_TOKEN = '';
let SPOTIFY_TOKEN_TYPE = '';
let SPOTIFY_DISPLAY_NAME = '';
let currentTrackList = [];
let currentPlaylists = [];

const $downloaderBtn = document.getElementById('downloader');
const $playlists = document.getElementById('playlists');
const $tracks = document.getElementById('tracks');

if (!localStorage.getItem('downloader')) {
  localStorage.setItem('downloader', 'zotify');
} else {
  if (localStorage.getItem('downloader') === 'spotdl') {
    $downloaderBtn.innerText = 'Downloader: Spotdl';
    $downloaderBtn.style.color = '#f00';
    $downloaderBtn.style.border = '1px #f00 solid';
  } else {
    $downloaderBtn.innerText = 'Downloader: Zotify';
    $downloaderBtn.style.color = '#0f0';
    $downloaderBtn.style.border = '1px #0f0 solid';
  }
}

$downloaderBtn.addEventListener('click', async () => {
  if (localStorage.getItem('downloader') === 'zotify') {
    $downloaderBtn.innerText = 'Downloader: Spotdl';
    $downloaderBtn.style.color = '#f00';
    $downloaderBtn.style.border = '1px #f00 solid';
    localStorage.setItem('downloader', 'spotdl');
    $createModal('Spotdl searches for Spotify songs on YouTube Music. It is not 100% accurate, but can come with more track information and lyrics.');
  } else {
    $downloaderBtn.innerText = 'Downloader: Zotify';
    $downloaderBtn.style.color = '#0f0';
    $downloaderBtn.style.border = '1px #0f0 solid';
    localStorage.setItem('downloader', 'zotify');
    $createModal('Zotify gets songs directly from Spotify. 100% accurate, no lyrics.');
  }

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
    if (_spotifyTokenRes.status === 500) {
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
      const _playlistParams = new URLSearchParams({ market: 'US', fields: 'items(track(album(images,name),artists(name),name,duration_ms,external_urls))' });
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
    src: downloaded === 'spotdl' ? '/images/Spotdl_Downloaded_Icon.png' :
      downloaded === 'zotify' ? '/images/Zotify_Downloaded_Icon.png' : '/images/Download_Icon.png'
  });
  $downloadBtn.addEventListener('click', async () => {
    $downloadImg.src = '/images/Downloading_Icon.gif';

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

    const _responseBlob = await _downloadResponse.blob();
    const url = window.URL.createObjectURL(_responseBlob);

    const encodedFileName = _responseHeaders.get('content-disposition').split("=")[1];
    const $link = $createElement('a', [], { href: url, download: decodeURIComponent(encodedFileName), style: { display: 'none' } });
    document.body.appendChild($link);

    $link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild($link);

    $downloadImg.src = localStorage.getItem('downloader') === 'spotdl' ?
      '/images/Spotdl_Downloaded_Icon.png' :
      '/images/Zotify_Downloaded_Icon.png';
  });

  $showBtn.appendChild($showImg);
  $downloadBtn.appendChild($downloadImg);
  $playlist.append($img, $nameP, $trackCountP, $showBtn, $downloadBtn);
  $playlists.appendChild($playlist);
}