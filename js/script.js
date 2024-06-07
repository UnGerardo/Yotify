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

  while (searchResultsSect.hasChildNodes()) {
    searchResultsSect.removeChild(searchResultsSect.firstChild);
  }

  searchResponseJson['items'].forEach(track => {
    const imageUrl = track['album']['images'][1]['url'];
    const albumName = track['album']['name'];
    // can have multiple artists
    const artistName = track['artists'][0]['name'];
    const trackName = track['name'];
    const duration = track['duration_ms'];
    // const trackUrl = track['external_urls']['spotify'];

    renderSearchResult(imageUrl, albumName, artistName, trackName, duration);
  });
});

function renderSearchResult(imageUrl, albumName, artistName, trackName, duration) {
  const imageElement = document.createElement('img');
  imageElement.classList.add('albumImage');
  imageElement.src = imageUrl;
  const albumParagraph = document.createElement('p');
  albumParagraph.innerText = `Album: ${albumName}`;
  const artistParagraph = document.createElement('p');
  artistParagraph.innerText = `Artist: ${artistName}`;
  const trackParagraph = document.createElement('p');
  trackParagraph.innerText = `Track: ${trackName}`;
  const durationParagraph = document.createElement('p');
  durationParagraph.innerText = `Duration: ${msToReadableTime(duration)}`;

  const resultSect = document.createElement('section');
  resultSect.classList.add('result');
  resultSect.appendChild(imageElement);
  resultSect.appendChild(albumParagraph);
  resultSect.appendChild(artistParagraph);
  resultSect.appendChild(trackParagraph);
  resultSect.appendChild(durationParagraph);

  searchResultsSect.appendChild(resultSect);
}

function msToReadableTime(msTime) {
  const totalSeconds = Math.floor(msTime / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalSeconds / 3600);

  let minutes = totalMinutes - (totalHours * 60);
  let seconds = totalSeconds - (totalHours * 3600) - (totalMinutes * 60);

  if (totalHours > 0 && minutes < 10) {
    minutes = `0${minutes}`;
  }
  if (seconds < 10) {
    seconds = `0${seconds}`;
  }

  if (totalHours > 0) {
    return `${totalHours}:${minutes}:${seconds}`;
  }
  return `${minutes}:${seconds}`;
}