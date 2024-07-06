
let SPOTIFY_ACCESS_TOKEN = '';
let SPOTIFY_TOKEN_TYPE = '';
let SPOTIFY_DISPLAY_NAME = '';

const $playlists = document.getElementById('playlists');
const $tracks = document.getElementById('tracks');

(async () => {
  const url = window.location.href;
  const urlParams = new URLSearchParams(url.split('?')[1]);

  const _spotifyTokenResponse = await fetch(`/spotifyAuthToken?${urlParams}`);
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

  $renderPlaylist('liked_songs', '/images/Liked_Songs.png', 'Liked Songs', _savedTracksRes['total']);

  const _playlistsParams = new URLSearchParams({
    limit: 50,
    offset: 0
  });
  const _playlistsRes = await fetch(`https://api.spotify.com/v1/me/playlists?${_playlistsParams}`, {
    headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
  }).then(res => res.json());

  _playlistsRes['items'].forEach(playlist => {
    $renderPlaylist(playlist['id'], playlist['images'][0]['url'], playlist['name'], playlist['tracks']['total']);
  });
})();

function $renderPlaylist(playlistId, imgUrl, name, trackCount) {
  const $playlist = document.createElement('section');
  $playlist.classList.add('playlist');
  const $img = document.createElement('img');
  $img.src = imgUrl;
  $img.classList.add('cover-image');
  const $nameP = document.createElement('p');
  $nameP.innerText = name;
  const $trackCountP = document.createElement('p');
  $trackCountP.innerText = trackCount;
  const $showBtn = document.createElement('button');
  $showBtn.innerText = 'Show';
  $showBtn.addEventListener('click', async () => {
    while ($tracks.firstElementChild !== $tracks.lastElementChild) {
      $tracks.removeChild($tracks.lastElementChild);
    }

    const _playlistSongParams = new URLSearchParams({
      playlist_id: playlistId,
      access_token: SPOTIFY_ACCESS_TOKEN,
      token_type: SPOTIFY_TOKEN_TYPE
    })
    const _playlistSongsRes = await fetch(`/getPlaylistSongs?${_playlistSongParams}`).then(res => res.json());

    _playlistSongsRes.forEach((track) => {
      $renderTrack($tracks, track);
    });
  });
  const $saveBtn = document.createElement('button');
  $saveBtn.innerText = 'Save';
  $saveBtn.addEventListener('click', async () => {
    const _downloadResponse = await fetch('/downloadPlaylist', {
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
      console.log('Tracks written and downloading');
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
    }
  });

  $playlist.append($img, $nameP, $trackCountP, $showBtn, $saveBtn);
  $playlists.appendChild($playlist);
}