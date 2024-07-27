
let DOWNLOADER = 'zotify';

const $downloaderBtn = document.getElementById('downloader');
const $searchBtn = document.getElementById('search-btn');
const $queryInput = document.getElementById('query-input');
const $tracks = document.getElementById('tracks');

$downloaderBtn.addEventListener('click', () => {
  if (DOWNLOADER === 'zotify') {
    $downloaderBtn.innerText = 'Downloader: Spotdl';
    $downloaderBtn.style.color = '#f00';
    $downloaderBtn.style.border = '1px #f00 solid';
    DOWNLOADER = 'spotdl';
    $createModal('Spotdl searches for Spotify songs on YouTube Music. It is not 100% accurate, but can come with more track information and lyrics.');
  } else {
    $downloaderBtn.innerText = 'Downloader: Zotify';
    $downloaderBtn.style.color = '#0f0';
    $downloaderBtn.style.border = '1px #0f0 solid';
    DOWNLOADER = 'zotify';
    $createModal('Zotify gets songs directly from Spotify. 100% accurate, no lyrics.');
  }
});

$searchBtn.addEventListener('click', async () => {
  const query = $queryInput.value;

  const _params = new URLSearchParams({ query, downloader: DOWNLOADER });
  const _searchResponse = await fetch(`/spotify/search/tracks/?${_params}`).then(res => res.json());

  while ($tracks.firstElementChild !== $tracks.lastElementChild) {
    $tracks.removeChild($tracks.lastElementChild);
  }

  _searchResponse.forEach(track => {
    $renderTrack($tracks, track);
  });
});