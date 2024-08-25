import { SpotifyTrack } from "../SpotifyClasses.js";
import { $createElement } from "./createElement.js";
import { msTimeFormat } from "./msTimeFormat.js";
import { $createModal } from "./modal.js";
import { DOWNLOAD_ICON, SPOTDL_DOWNLOADED_ICON, SPOTDL_DOWNLOADING_ICON, ZOTIFY_DOWNLOADED_ICON, ZOTIFY_DOWNLOADING_ICON } from "../constants.js";
import { downloadBlob } from "./downloadBlob.js";
import { SPOTDL } from "src/constants.js";

export function $renderTrack($trackContainer: HTMLElement, track: SpotifyTrack) {
  const $albumImg = $createElement('img', ['album-image'], { src: track.albumImgUrl }) as HTMLImageElement;
  const $trackArtistSect = $createElement('section', ['ellip-overflow']) as HTMLElement;
  const $artistP = $createElement('p', ['artist-name', 'ellip-overflow'], { innerText: track.artistNames.join(', ') }) as HTMLParagraphElement;
  const $trackP = $createElement('p', ['ellip-overflow', 'm-b-5'], { innerText: track.name }) as HTMLParagraphElement;
  const $albumP = $createElement('p', ['ellip-overflow', 'album-name'], { innerText: track.albumName }) as HTMLParagraphElement;
  const $durationP = $createElement('p', ['duration', 'ellip-overflow'], { innerText: `Duration: ${msTimeFormat(track.durationMs)}` }) as HTMLParagraphElement;
  const $downloadImg = $createElement('img', ['download-image'], {
    src: track.downloadStatus === 'Downloaded' ? (track.downloader === SPOTDL ? SPOTDL_DOWNLOADED_ICON : ZOTIFY_DOWNLOADED_ICON) :
      DOWNLOAD_ICON
  }) as HTMLImageElement;
  const $downloadBtn = $createElement('button', ['btn', 'download-btn']);

  $downloadBtn.addEventListener('click', async () => {
    if (!track.isPlayable) return $createModal('Song is unavailable for download.');

    if ($downloadImg.src.includes('Downloading')) return $createModal('Song is already downloading.');

    $downloadImg.src = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADING_ICON : ZOTIFY_DOWNLOADING_ICON;
    try {
      const _downloadRes = await fetch('/spotify/download/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artists: track.artistNames.join(', '),
          track_name: track.name,
          track_url: track.url,
          downloader: localStorage.getItem('downloader')
        })
      });

      if (!_downloadRes.ok) {
        throw new Error(`Download response failed for: ${track.url} ${track.name} ${track.artistNames}`);
      }

      const _responseHeaders = _downloadRes.headers;
      const _responseBlob = await _downloadRes.blob();
      const encodedFileName = _responseHeaders.get('content-disposition')!.split("=")[1];
      downloadBlob(encodedFileName, _responseBlob);

      $downloadImg.src = localStorage.getItem('downloader') === SPOTDL ? SPOTDL_DOWNLOADED_ICON : ZOTIFY_DOWNLOADED_ICON;
    } catch (err) {
      $downloadImg.src = DOWNLOAD_ICON;
      $createModal(`Failed to download: ${err}. Try again.`);
    }
  });

  $downloadBtn.append($downloadImg);
  $trackArtistSect.append($trackP, $artistP);

  const $track = $createElement('section', [track.isPlayable ? 'track' : 'unavailable-track']);
  $track.append($albumImg, $trackArtistSect, $albumP, $durationP, $downloadBtn);

  $trackContainer.appendChild($track);
}