
let SPOTIFY_ACCESS_TOKEN = '';
let SPOTIFY_TOKEN_TYPE = '';
let SPOTIFY_DISPLAY_NAME = '';

const $playlists = document.getElementById('playlists');
const $tracks = document.getElementById('tracks');

(async () => {
  const url = window.location.href;
  const urlParams = new URLSearchParams(url.split('?')[1]);

  const _spotifyTokenResponse = await fetch(`/spotify/token?${urlParams}`);
  const _spotifyTokenJson = await _spotifyTokenResponse.json();

  if (_spotifyTokenResponse.status === 400 && _spotifyTokenJson['error'] === 'AUTH_STATE') {
    window.location.href = '/spotifyAuth';
  }

  ({
    access_token: SPOTIFY_ACCESS_TOKEN,
    token_type: SPOTIFY_TOKEN_TYPE,
    display_name: SPOTIFY_DISPLAY_NAME
  } = _spotifyTokenJson);

  const _savedTracksParams = new URLSearchParams({
    limit: 1,
    offset: 0,
    market: 'US'
  });
  const _savedTracksRes = await fetch(`https://api.spotify.com/v1/me/tracks?${_savedTracksParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  }).then(res => res.json());

  $renderPlaylist('liked_songs', '/images/Liked_Songs.png', 'Liked Songs', _savedTracksRes['total'], 'Not Downloaded');

  const _playlistsParams = new URLSearchParams({
    limit: 50,
    offset: 0
  });
  const _playlistsRes = await fetch(`https://api.spotify.com/v1/me/playlists?${_playlistsParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  }).then(res => res.json());

  const snapshots = [];

  _playlistsRes['items'].forEach(playlist => {
    snapshots.push({
      playlist_id: playlist['id'],
      snapshot_id: playlist['snapshot_id']
    });
  });

  const _snapshotRes = await fetch('/spotify/playlists/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ snapshots })
  }).then(res => res.json());

  _playlistsRes['items'].forEach(playlist => {
    $renderPlaylist(
      playlist['id'],
      playlist['images'][0]['url'],
      playlist['name'],
      playlist['tracks']['total'],
      _snapshotRes[playlist['id']]
    );
  });
})();

function $renderPlaylist(playlistId, imgUrl, name, trackCount, status) {
  const $playlist = document.createElement('section');
  $playlist.classList.add('playlist');
  const $img = document.createElement('img');
  $img.src = imgUrl;
  $img.classList.add('cover-image');
  const $nameP = document.createElement('p');
  $nameP.innerText = name;
  $nameP.classList.add('ellip-overflow');
  const $trackCountP = document.createElement('p');
  $trackCountP.innerText = trackCount;
  $trackCountP.classList.add('track-count');
  const $showBtn = document.createElement('button');
  $showBtn.classList.add('btn', 'download-btn');
  const $showImg = document.createElement('img');
  $showImg.classList.add('download-image');
  $showImg.src = '/images/Show_Icon.png';
  $showBtn.addEventListener('click', async () => {
    while ($tracks.firstElementChild !== $tracks.lastElementChild) {
      $tracks.removeChild($tracks.lastElementChild);
    }

    let url = null;
    if (playlistId === 'liked_songs') {
      const _savedTracksParams = new URLSearchParams({
        limit: 50,
        offset: 0,
        market: 'US'
      });
      url = `https://api.spotify.com/v1/me/tracks?${_savedTracksParams}`;
    } else {
      const _playlistParams = new URLSearchParams({
        market: 'US',
        fields: 'items(track(album(images,name),artists(name),name,duration_ms,external_urls))',
      });
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
      body: JSON.stringify({ tracks })
    }).then(res => res.json());

    _tracksStatusRes.forEach((track) => {
      $renderTrack($tracks, track);
    });
  });
  const $downloadBtn = document.createElement('button');
  $downloadBtn.classList.add('btn', 'download-btn');
  const $downloadImg = document.createElement('img');
  $downloadImg.classList.add('download-image');
  $downloadImg.src = status === 'Downloaded' ? '/images/Downloaded_Icon.png' : '/images/Download_Icon.png';
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
        playlist_name: name
      })
    });
    const _responseHeaders = _downloadResponse.headers;

    if (_responseHeaders.get('content-type') !== 'application/zip') {
      $createModal(await _downloadResponse.text());
    } else {
      const _responseBlob = await _downloadResponse.blob();
      const url = window.URL.createObjectURL(_responseBlob);

      const $link = document.createElement('a');
      $link.style.display = 'none';
      $link.href = url;
      const encodedFileName = _responseHeaders.get('content-disposition').split("=")[1];
      $link.download = decodeURIComponent(encodedFileName);
      document.body.appendChild($link);

      $link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild($link);

      $downloadImg.src = '/images/Downloaded_Icon.png';
    }
  });

  $showBtn.appendChild($showImg);
  $downloadBtn.appendChild($downloadImg);
  $playlist.append($img, $nameP, $trackCountP, $showBtn, $downloadBtn);
  $playlists.appendChild($playlist);
}