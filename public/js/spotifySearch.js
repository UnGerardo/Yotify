
const $searchBtn = document.getElementById('search-btn');
const $searchQueryInput = document.getElementById('search-input');
const $searchResults = document.getElementById('search-results');

$searchBtn.addEventListener('click', async () => {
  const searchQuery = $searchQueryInput.value;
  const searchParams = new URLSearchParams({ search_query: searchQuery });

  const _searchResponse = await fetch(`/searchTrack?${searchParams}`).then(res => res.json());

  $searchResults.style.display = 'grid';
  while ($searchResults.hasChildNodes()) {
    $searchResults.removeChild($searchResults.firstChild);
  }

  _searchResponse['items'].forEach(track => {
    const albumImgUrl = track['album']['images'][1]['url'];
    const albumName = track['album']['name'];
    const artistNames = track['artists'].map((artist) => artist['name']);
    const trackName = track['name'];
    const duration = track['duration_ms'];
    const trackUrl = track['external_urls']['spotify'];

    $renderSearchResult(albumImgUrl, albumName, artistNames, trackName, duration, trackUrl);
  });
});

function $renderSearchResult(albumImgUrl, albumName, artistNames, trackName, duration, trackUrl) {
  const $albumImg = document.createElement('img');
  $albumImg.classList.add('album-image');
  $albumImg.src = albumImgUrl;
  const $trackArtistSect = document.createElement('section');
  $trackArtistSect.classList.add('ellip-overflow');
  const $artistP = document.createElement('p');
  $artistP.classList.add('artist-name', 'ellip-overflow');
  $artistP.innerText = artistNames.join(', ');
  const $trackP = document.createElement('p');
  $trackP.classList.add('ellip-overflow', 'm-b-5');
  $trackP.innerText = trackName;
  const $albumP = document.createElement('p');
  $albumP.classList.add('ellip-overflow', 'album-name');
  $albumP.innerText = albumName;
  const $durationP = document.createElement('p');
  $durationP.classList.add('duration', 'ellip-overflow');
  $durationP.innerText = `Duration: ${msToReadableTime(duration)}`;
  const $downloadBtn = document.createElement('button');
  $downloadBtn.classList.add('download-btn');
  const $downloadImg = document.createElement('img');
  $downloadImg.classList.add('download-image');
  $downloadImg.src = '/images/Download_Icon.png';
  $downloadBtn.addEventListener('click', async () => {
    const _downloadResponse = await fetch('/downloadTrack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        artist_name: artistNames[0],
        track_name: trackName,
        track_url: trackUrl
      })
    });

    const _responseHeaders = _downloadResponse.headers;
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
  });

  $downloadBtn.append($downloadImg);
  $trackArtistSect.append($trackP, $artistP);

  const $resultSect = document.createElement('section');
  $resultSect.classList.add('result');
  $resultSect.append($albumImg, $trackArtistSect, $albumP, $durationP, $downloadBtn);

  $searchResults.appendChild($resultSect);
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