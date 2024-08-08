
function $renderTrack($trackContainer, track) {
  const album_img_url = track['album']['images'][1]['url'];
  const album_name = track['album']['name'];
  const artist_names = track['artists'].map((artist) => artist['name']);
  const track_name = track['name'];
  const duration = track['duration_ms'];
  const track_url = track['external_urls']['spotify'];
  const is_playable = track['is_playable'];
  const downloaded = track['downloaded'];

  const $albumImg = $createElement('img', ['album-image'], { src: album_img_url });
  const $trackArtistSect = $createElement('section', ['ellip-overflow']);
  const $artistP = $createElement('p', ['artist-name', 'ellip-overflow'], { innerText: artist_names.join(', ') });
  const $trackP = $createElement('p', ['ellip-overflow', 'm-b-5'], { innerText: track_name });
  const $albumP = $createElement('p', ['ellip-overflow', 'album-name'], { innerText: album_name });
  const $durationP = $createElement('p', ['duration', 'ellip-overflow'], { innerText: `Duration: ${msTimeFormat(duration)}` });
  const $downloadImg = $createElement('img', ['download-image'], {
    src: downloaded === 'spotdl' ? '/images/Spotdl_Downloaded_Icon.png' :
      downloaded === 'zotify' ? '/images/Zotify_Downloaded_Icon.png' : '/images/Download_Icon.png'
  });
  const $downloadBtn = $createElement('button', ['btn', 'download-btn']);
  if (is_playable) {
    $downloadBtn.addEventListener('click', async () => {
      if ($downloadImg.src.includes('Downloading')) {
        $createModal('Song is already downloading.');
        return;
      }
      $downloadImg.src = localStorage.getItem('downloader') === 'spotdl' ?
        '/images/Spotdl_Downloading_Icon.gif' :
        '/images/Zotify_Downloading_Icon.gif';

      try {
        const _downloadResponse = await fetch('/spotify/download/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            artists: artist_names.join(', '),
            track_name: track_name,
            track_url: track_url,
            downloader: localStorage.getItem('downloader')
          })
        });

        const _responseHeaders = _downloadResponse.headers;
        const _responseBlob = await _downloadResponse.blob();
        const url = window.URL.createObjectURL(_responseBlob);

        const encodedFileName = _responseHeaders.get('content-disposition').split("=")[1];
        const $link = $createElement('a', [], { href: url, download: decodeURIComponent(encodedFileName), style: { display: 'none' } });
        document.body.appendChild($link);

        $link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild($link);

        $downloadImg.src = localStorage.getItem('downloader') === 'spotdl' ?
          '/images/Spotdl_Downloaded_Icon.png' :
          '/images/Zotify_Downloaded_Icon.png';
      } catch (err) {
        $createModal(`Failed to download: ${err}. Try again.`);
        $downloadImg.src = '/images/Download_Icon.png';
      }
    });
  } else {
    $downloadBtn.addEventListener('click', () => {
      $createModal('Song is unavailable for download.');
    });
  }

  $downloadBtn.append($downloadImg);
  $trackArtistSect.append($trackP, $artistP);

  const $track = $createElement('section', [is_playable ? 'track' : 'unavailable-track']);
  $track.append($albumImg, $trackArtistSect, $albumP, $durationP, $downloadBtn);

  $trackContainer.appendChild($track);
}