
let currentTrackList = [];

const $searchBtn = document.getElementById('search-btn');
const $queryInput = document.getElementById('query-input');
const $tracks = document.getElementById('tracks');

$setDownloaderBtnListener(async () => {
  if (currentTrackList.length) {
    const _tracksStatusRes = await fetch('/spotify/tracks/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks: currentTrackList, downloader: localStorage.getItem('downloader') })
    });
    currentTrackList = await _tracksStatusRes.json();

    while ($tracks.firstElementChild !== $tracks.lastElementChild) {
      $tracks.removeChild($tracks.lastElementChild);
    }

    currentTrackList.forEach((track) => {
      $renderTrack($tracks, track);
    });
  }
});

$searchBtn.addEventListener('click', async () => {
  const query = $queryInput.value;

  const _params = new URLSearchParams({ query, downloader: localStorage.getItem('downloader') });
  const _searchResponse = await fetch(`/spotify/search/tracks/?${_params}`);
  currentTrackList = await _searchResponse.json();

  while ($tracks.firstElementChild !== $tracks.lastElementChild) {
    $tracks.removeChild($tracks.lastElementChild);
  }

  currentTrackList.forEach(track => {
    $renderTrack($tracks, track);
  });
});