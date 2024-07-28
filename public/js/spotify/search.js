
let currentTrackList = [];

const $downloaderBtn = document.getElementById('downloader');
const $searchBtn = document.getElementById('search-btn');
const $queryInput = document.getElementById('query-input');
const $tracks = document.getElementById('tracks');

if (!localStorage.getItem('downloader')) {
  localStorage.setItem('downloader', 'zotify');
} else {
  if (localStorage.getItem('downloader') === 'spotdl') {
    $downloaderBtn.innerText = 'Downloader: Spotdl';
    $downloaderBtn.style.color = '#f00';
    $downloaderBtn.style.border = '1px #f00 solid';
  } else {
    $downloaderBtn.innerText = 'Downloader: Zotify';
    $downloaderBtn.style.color = '#0f0';
    $downloaderBtn.style.border = '1px #0f0 solid';
  }
}

$downloaderBtn.addEventListener('click', async () => {
  if (localStorage.getItem('downloader') === 'zotify') {
    $downloaderBtn.innerText = 'Downloader: Spotdl';
    $downloaderBtn.style.color = '#f00';
    $downloaderBtn.style.border = '1px #f00 solid';
    localStorage.setItem('downloader', 'spotdl');
    $createModal('Spotdl searches for Spotify songs on YouTube Music. It is not 100% accurate, but can come with more track information and lyrics.');
  } else {
    $downloaderBtn.innerText = 'Downloader: Zotify';
    $downloaderBtn.style.color = '#0f0';
    $downloaderBtn.style.border = '1px #0f0 solid';
    localStorage.setItem('downloader', 'zotify');
    $createModal('Zotify gets songs directly from Spotify. 100% accurate, no lyrics.');
  }

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