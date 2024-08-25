import { SpotifyTrack } from "../SpotifyClasses.js";
import { $renderTrack } from "../utils/renderTrack.js";
import { $setDownloaderBtnListener } from "../downloader.js";
import { $clearElementsExceptForFirst } from "../utils/clearElementsExceptForFirst.js";
import { $createModal } from "../utils/modal.js";
import { _updateTracksStatus } from "../utils/updateTracksStatus.js";

let currentTrackList: SpotifyTrack[] = [];

const $searchBtn = document.getElementById('search-btn')! as HTMLButtonElement;
const $queryInput = document.getElementById('query-input')! as HTMLInputElement;
const $tracks = document.getElementById('tracks')! as HTMLElement;

$setDownloaderBtnListener(async () => {
  if (currentTrackList.length) {
    currentTrackList = await _updateTracksStatus(currentTrackList);
    $clearElementsExceptForFirst($tracks);
    currentTrackList.forEach((track) => $renderTrack($tracks, track));
  }
});

$searchBtn.addEventListener('click', async () => {
  const query = $queryInput.value;

  currentTrackList = await _getSearchResults(query);
  $clearElementsExceptForFirst($tracks)
  currentTrackList.forEach(track => $renderTrack($tracks, track));
});

async function _getSearchResults(query: string): Promise<SpotifyTrack[]> {
  const _searchParams = new URLSearchParams({ query, downloader: localStorage.getItem('downloader')! });
  const _searchRes = await fetch(`/spotify/search/tracks/?${_searchParams}`);

  if (!_searchRes.ok) {
    $createModal(await _searchRes.text());
    return [];
  }

  return await _searchRes.json() as SpotifyTrack[];
}