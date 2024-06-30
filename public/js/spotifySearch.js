
const $searchBtn = document.getElementById('search-btn');
const $searchQueryInput = document.getElementById('search-input');
const $tracks = document.getElementById('tracks');

$searchBtn.addEventListener('click', async () => {
  const searchQuery = $searchQueryInput.value;
  const searchParams = new URLSearchParams({ search_query: searchQuery });

  const _searchResponse = await fetch(`/searchTrack?${searchParams}`).then(res => res.json());

  while ($tracks.hasChildNodes()) {
    if ($tracks.firstElementChild === $tracks.lastElementChild) {
      break;
    }
    $tracks.removeChild($tracks.lastElementChild);
  }

  _searchResponse['items'].forEach(track => {
    const albumImgUrl = track['album']['images'][1]['url'];
    const albumName = track['album']['name'];
    const artistNames = track['artists'].map((artist) => artist['name']);
    const trackName = track['name'];
    const duration = track['duration_ms'];
    const trackUrl = track['external_urls']['spotify'];

    $renderTrack($tracks, albumImgUrl, albumName, artistNames, trackName, duration, trackUrl);
  });
});