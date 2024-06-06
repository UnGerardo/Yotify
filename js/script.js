let spotifyAccessToken = '';
let spotifyTokenType = '';
let spotifyTokenExpiration = 0;

// naming scheme to differentiatie DOM elements and global vars? from normal vars
const searchBtn = document.getElementById('searchBtn');
const searchQueryInput = document.getElementById('searchInput');

searchBtn.addEventListener('click', async () => {
  if (spotifyAccessToken === '' || Date.now() > spotifyTokenExpiration) {
    const response = await fetch('/spotToken');
    const data = await response.json();
    console.log(data);

    spotifyAccessToken = data['access_token'];
    spotifyTokenType = data['token_type'];
    spotifyTokenExpiration = Date.now() + 3000000;
  }
});