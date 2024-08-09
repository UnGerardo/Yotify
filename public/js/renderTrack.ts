import { SpotifyTrack } from "./SpotifyClasses.js";
import { $createElement } from "./createElement.js";
import { msTimeFormat } from "./msTimeFormat.js";
import { $createModal } from "./modal.js";
import { DOWNLOAD_ICON, SPOTDL_DOWNLOADED_ICON, SPOTDL_DOWNLOADING_ICON, ZOTIFY_DOWNLOADED_ICON, ZOTIFY_DOWNLOADING_ICON } from "./constants.js";

export function $renderTrack($trackContainer: HTMLElement, track: SpotifyTrack) {
  const $albumImg = $createElement('img', ['album-image'], { src: track.albumImgUrl }) as HTMLImageElement;
  const $trackArtistSect = $createElement('section', ['ellip-overflow']) as HTMLElement;
  const $artistP = $createElement('p', ['artist-name', 'ellip-overflow'], { innerText: track.artistNames.join(', ') }) as HTMLParagraphElement;
  const $trackP = $createElement('p', ['ellip-overflow', 'm-b-5'], { innerText: track.name }) as HTMLParagraphElement;
  const $albumP = $createElement('p', ['ellip-overflow', 'album-name'], { innerText: track.albumName }) as HTMLParagraphElement;
  const $durationP = $createElement('p', ['duration', 'ellip-overflow'], { innerText: `Duration: ${msTimeFormat(track.durationMs)}` }) as HTMLParagraphElement;
  const $downloadImg = $createElement('img', ['download-image'], {
    src: track.downloadStatus === 'Downloaded' ? (track.downloader === 'spotdl' ? '/images/Spotdl_Downloaded_Icon.png' : '/images/Zotify_Downloaded_Icon.png') :
      '/images/Download_Icon.png'
  }) as HTMLImageElement;
  const $downloadBtn = $createElement('button', ['btn', 'download-btn']);
  if (track.isPlayable) {
    $downloadBtn.addEventListener('click', async () => {
      if ($downloadImg.src.includes('Downloading')) {
        $createModal('Song is already downloading.');
        return;
      }
      $downloadImg.src = localStorage.getItem('downloader') === 'spotdl' ?
        SPOTDL_DOWNLOADING_ICON :
        ZOTIFY_DOWNLOADING_ICON;

      try {
        const _downloadResponse = await fetch('/spotify/download/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            artists: track.artistNames.join(', '),
            track_name: track.name,
            track_url: track.url,
            downloader: localStorage.getItem('downloader')
          })
        });

        if (!_downloadResponse.ok) {
          throw new Error(`Download response failed for: ${track.url} ${track.name} ${track.artistNames}`);
        }

        const _responseHeaders = _downloadResponse.headers;
        const _responseBlob = await _downloadResponse.blob();
        const encodedFileName = _responseHeaders.get('content-disposition')!.split("=")[1];
        downloadBlob(encodedFileName, _responseBlob);

        $downloadImg.src = localStorage.getItem('downloader') === 'spotdl' ?
          SPOTDL_DOWNLOADED_ICON :
          ZOTIFY_DOWNLOADED_ICON;
      } catch (err) {
        $createModal(`Failed to download: ${err}. Try again.`);
        $downloadImg.src = DOWNLOAD_ICON;
      }
    });
  } else {
    $downloadBtn.addEventListener('click', () => {
      $createModal('Song is unavailable for download.');
    });
  }

  $downloadBtn.append($downloadImg);
  $trackArtistSect.append($trackP, $artistP);

  const $track = $createElement('section', [track.isPlayable ? 'track' : 'unavailable-track']);
  $track.append($albumImg, $trackArtistSect, $albumP, $durationP, $downloadBtn);

  $trackContainer.appendChild($track);
}

function downloadBlob(encodedFileName: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob);

  const $link = $createElement('a', [], { href: url, download: decodeURIComponent(encodedFileName), style: { display: 'none' } });
  document.body.appendChild($link);

  $link.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild($link);
}