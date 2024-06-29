
let SPOTIFY_ACCESS_TOKEN = '';
let SPOTIFY_TOKEN_TYPE = '';
let SPOTIFY_DISPLAY_NAME = '';

const getSavedTracksBtn = document.getElementById('getSavedTracks');

(async () => {
  const url = window.location.href;
  const urlParams = new URLSearchParams(url.split('?')[1]);

  const _spotifyTokenResponse = await fetch(`/spotifyAuthToken?${urlParams}`).then(res => res.json());
  ({
    access_token: SPOTIFY_ACCESS_TOKEN,
    token_type: SPOTIFY_TOKEN_TYPE,
    display_name: SPOTIFY_DISPLAY_NAME
  } = _spotifyTokenResponse);
})();