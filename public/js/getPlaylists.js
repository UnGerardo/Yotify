
let spotifyAccessToken = '';
let spotifyTokenType = '';

const getSavedTracksBtn = document.getElementById('getSavedTracks');

(async () => {
  const url = window.location.href;
  const urlParams = new URLSearchParams(url.split('?')[1]);

  const spotifyTokenResponse = await fetch(`/spotifyAuthToken?${urlParams}`);
  const spotifyTokenJson = await spotifyTokenResponse.json();

  ({ access_token: spotifyAccessToken, token_type: spotifyTokenType } = spotifyTokenJson);

  getSavedTracksBtn.addEventListener('click', async () => {
    const getSavedTracksReponse = await fetch(`/getSavedTracks`, {
      method: 'POST',
      body: JSON.stringify({
        access_token: spotifyAccessToken,
        token_type: spotifyTokenType
      })
    });
  });
})();