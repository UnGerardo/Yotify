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
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      search_query: searchQuery
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
    const trackUrl = track['external_urls']['spotify'];

    renderSearchResult(imageUrl, albumName, artistName, trackName, duration, trackUrl);
  });
});

function renderSearchResult(imageUrl, albumName, artistName, trackName, duration, trackUrl) {
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
  const downloadBtn = document.createElement('button');
  downloadBtn.innerText = 'Download';
  downloadBtn.addEventListener('click', async () => {
    const downloadResponse = await fetch('/downloadTrack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        artist_name: artistName,
        track_name: trackName,
        track_url: trackUrl
      })
    });

    const responseHeaders = downloadResponse.headers;
    const responseBlob = await downloadResponse.blob()
    const url = window.URL.createObjectURL(responseBlob);

    const linkElement = document.createElement('a');
    linkElement.style.display = 'none';
    linkElement.href = url;
    const encodedFileName = responseHeaders.get('content-disposition').split("=")[1];
    linkElement.download = decodeURIComponent(encodedFileName);
    document.body.appendChild(linkElement);

    linkElement.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(linkElement);
  });

  const resultSect = document.createElement('section');
  resultSect.classList.add('result');
  resultSect.append(imageElement, albumParagraph, artistParagraph, trackParagraph, durationParagraph, downloadBtn);

  searchResultsSect.appendChild(resultSect);
}

function msToReadableTime(msTime) {
  const totalSeconds = Math.floor(msTime / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalSeconds / 3600);

  let minutes = totalMinutes - (totalHours * 60);
  let seconds = totalSeconds - (totalHours * 3600) - (totalMinutes * 60);

  minutes = totalHours > 0 && minutes < 10 ? `0${minutes}` : minutes;
  seconds = seconds < 10 ? `0${seconds}` : seconds;

  return totalHours > 0 ? `${totalHours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}