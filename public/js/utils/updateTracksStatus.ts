import { SpotifyTrack } from "../SpotifyClasses";
import { $createModal } from "./modal";

export async function _updateTracksStatus(tracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
  const _tracksStatusRes = await fetch('/spotify/tracks/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracks, downloader: localStorage.getItem('downloader') })
  });

  if (!_tracksStatusRes.ok) {
    $createModal(await _tracksStatusRes.text());
    return [];
  }

  return await _tracksStatusRes.json() as SpotifyTrack[];
}