
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

  $renderPlaylist('liked_songs', 'Liked_Songs.png', 'Liked Songs', _savedTracksRes['total']);

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

    if (playlistId === 'liked_songs') {
      const _savedTracksParams = new URLSearchParams({
        limit: 50,
        offset: 0,
        market: 'US'
      });
      const _savedTracksRes = await fetch(`https://api.spotify.com/v1/me/tracks?${_savedTracksParams}`, {
        headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
      }).then(res => res.json());

      _savedTracksRes['items'].forEach(track => {
        const albumImgUrl = track['track']['album']['images'][1]['url'];
        const albumName = track['track']['album']['name'];
        const artistNames = track['track']['artists'].map((artist) => artist['name']);
        const trackName = track['track']['name'];
        const duration = track['track']['duration_ms'];
        const trackUrl = track['track']['external_urls']['spotify'];

        $renderTrack($tracks, albumImgUrl, albumName, artistNames, trackName, duration, trackUrl);
      });

      return;
    }

    const _playlistParams = new URLSearchParams({
      market: 'US',
      fields: 'tracks(next,items(track(album(images,name),artists(name),name,duration_ms,external_urls))',
    });
    const _playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?${_playlistParams}`, {
      headers: { 'Authorization': `${SPOTIFY_TOKEN_TYPE} ${SPOTIFY_ACCESS_TOKEN}`}
    }).then(res => res.json());

    _playlistRes['tracks']['items'].forEach(track => {
      const albumImgUrl = track['track']['album']['images'][1]['url'];
      const albumName = track['track']['album']['name'];
      const artistNames = track['track']['artists'].map((artist) => artist['name']);
      const trackName = track['track']['name'];
      const duration = track['track']['duration_ms'];
      const trackUrl = track['track']['external_urls']['spotify'];

      $renderTrack($tracks, albumImgUrl, albumName, artistNames, trackName, duration, trackUrl);
    });
  });

  $playlist.append($img, $nameP, $trackCountP, $showBtn);
  $playlists.appendChild($playlist);
}