
const $searchBtn = document.getElementById('search-btn');
const $queryInput = document.getElementById('query-input');
const $tracks = document.getElementById('tracks');

$searchBtn.addEventListener('click', async () => {
  const query = $queryInput.value;

  const _searchResponse = await fetch(`/spotify/search/tracks/${encodeURIComponent(query)}`).then(res => res.json());

  while ($tracks.firstElementChild !== $tracks.lastElementChild) {
    $tracks.removeChild($tracks.lastElementChild);
  }

  _searchResponse.forEach(track => {
    $renderTrack($tracks, track);
  });
});