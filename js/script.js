let spotifyAccessToken = '';
let spotifyTokenType = '';
let spotifyTokenExpiration = 0;

// naming scheme to differentiatie DOM elements and global vars? from normal vars
const searchBtn = document.getElementById('searchBtn');
const searchQueryInput = document.getElementById('searchInput');
const searchResultsSect = document.getElementById('searchResults');

searchBtn.addEventListener('click', async () => {
  const searchQuery = searchQueryInput.value;

  const searchResponse = await fetch(`/searchTrack`, {
    method: 'POST',
    body: JSON.stringify({
      searchQuery
    })
  });
  const searchResponseJson = await searchResponse.json();

  searchResponseJson['items'].forEach(track => {
    const imageUrl = track['album']['images'][1]['url'];
    const albumName = track['album']['name'];
    // can have multiple artists
    const artistName = track['artists'][0]['name'];
    const trackName = track['name'];
    // const trackUrl = track['external_urls']['spotify'];

    renderSearchResult(imageUrl, albumName, artistName, trackName);
  });
});

function renderSearchResult(imageUrl, albumName, artistName, trackName) {
  const imageElement = document.createElement('img');
  imageElement.src = imageUrl;
  const albumParagraph = document.createElement('p');
  albumParagraph.innerText = `Album: ${albumName}`;
  const artistParagraph = document.createElement('p');
  artistParagraph.innerText = `Artist: ${artistName}`;
  const trackParagraph = document.createElement('p');
  trackParagraph.innerText = `Track: ${trackName}`;

  const resultSect = document.createElement('section');
  resultSect.classList.add('result');
  resultSect.appendChild(imageElement);
  resultSect.appendChild(albumParagraph);
  resultSect.appendChild(artistParagraph);
  resultSect.appendChild(trackParagraph);

  searchResultsSect.appendChild(resultSect);
}