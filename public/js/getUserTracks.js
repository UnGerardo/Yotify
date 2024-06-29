
let SPOTIFY_ACCESS_TOKEN = '';
let SPOTIFY_TOKEN_TYPE = '';

const getSavedTracksBtn = document.getElementById('getSavedTracks');

(async () => {
  const url = window.location.href;
  const urlParams = new URLSearchParams(url.split('?')[1]);

  const spotifyTokenResponse = await fetch(`/spotifyAuthToken?${urlParams}`);
  const spotifyTokenJson = await spotifyTokenResponse.json();

  ({ access_token: SPOTIFY_ACCESS_TOKEN, token_type: SPOTIFY_TOKEN_TYPE } = spotifyTokenJson);

  getSavedTracksBtn.addEventListener('click', async () => {
    const getSavedTracksReponse = await fetch(`/getSavedTracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: SPOTIFY_ACCESS_TOKEN,
        token_type: SPOTIFY_TOKEN_TYPE
      })
    });
  });
});