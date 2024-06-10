
let spotifyAccessToken = '';
let spotifyTokenType = '';

(async () => {
  const url = window.location.href;
  const urlParams = new URLSearchParams(url.split('?')[1]);
  console.log(urlParams)

  const spotifyTokenResponse = await fetch(`/spotifyAuthToken?${urlParams}`);
  const spotifyTokenJson = await spotifyTokenResponse.json();

  ({ access_token: spotifyAccessToken, token_type: spotifyTokenType } = spotifyTokenJson);
})();