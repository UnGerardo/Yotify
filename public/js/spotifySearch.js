
const $searchBtn = document.getElementById('search-btn');
const $searchQueryInput = document.getElementById('search-input');
const $tracks = document.getElementById('tracks');

$searchBtn.addEventListener('click', async () => {
  const searchQuery = $searchQueryInput.value;
  const searchParams = new URLSearchParams({ search_query: searchQuery });

  const _searchResponse = await fetch(`/searchTrack?${searchParams}`).then(res => res.json());

  while ($tracks.firstElementChild !== $tracks.lastElementChild) {
    $tracks.removeChild($tracks.lastElementChild);
  }

  _searchResponse['items'].forEach(track => {
    $renderTrack($tracks, track);
  });
});