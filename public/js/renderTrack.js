
function $renderTrack($trackContainer, track) {
  const albumImgUrl = track['album']['images'][1]['url'];
  const albumName = track['album']['name'];
  const artistNames = track['artists'].map((artist) => artist['name']);
  const trackName = track['name'];
  const duration = track['duration_ms'];
  const trackUrl = track['external_urls']['spotify'];
  const downloaded = track['downloaded'];

  const $albumImg = $createElement('img', ['album-image'], { src: albumImgUrl });
  const $trackArtistSect = $createElement('section', ['ellip-overflow']);
  const $artistP = $createElement('p', ['artist-name', 'ellip-overflow'], { innerText: artistNames.join(', ') });
  const $trackP = $createElement('p', ['ellip-overflow', 'm-b-5'], { innerText: trackName });
  const $albumP = $createElement('p', ['ellip-overflow', 'album-name'], { innerText: albumName });
  const $durationP = $createElement('p', ['duration', 'ellip-overflow'], { innerText: `Duration: ${msTimeFormat(duration)}` });
  const $downloadImg = $createElement('img', ['download-image'], {
    src: downloaded === 'spotdl' ? '/images/Spotdl_Downloaded_Icon.png' :
      downloaded === 'zotify' ? '/images/Zotify_Downloaded_Icon.png' : '/images/Download_Icon.png'
  });
  const $downloadBtn = $createElement('button', ['btn', 'download-btn']);
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
          artists: artistNames.join(', '),
          track_name: trackName,
          track_url: trackUrl,
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

  $downloadBtn.append($downloadImg);
  $trackArtistSect.append($trackP, $artistP);

  const $track = $createElement('section', ['track']);
  $track.append($albumImg, $trackArtistSect, $albumP, $durationP, $downloadBtn);

  $trackContainer.appendChild($track);
}