
function $renderTrack($trackContainer, track) {
  const albumImgUrl = track['album']['images'][1]['url'];
  const albumName = track['album']['name'];
  const artistNames = track['artists'].map((artist) => artist['name']);
  const trackName = track['name'];
  const duration = track['duration_ms'];
  const trackUrl = track['external_urls']['spotify'];
  const downloaded = track['downloaded'];

  const $albumImg = document.createElement('img');
  $albumImg.classList.add('album-image');
  $albumImg.src = albumImgUrl;
  const $trackArtistSect = document.createElement('section');
  $trackArtistSect.classList.add('ellip-overflow');
  const $artistP = document.createElement('p');
  $artistP.classList.add('artist-name', 'ellip-overflow');
  $artistP.innerText = artistNames.join(', ');
  const $trackP = document.createElement('p');
  $trackP.classList.add('ellip-overflow', 'm-b-5');
  $trackP.innerText = trackName;
  const $albumP = document.createElement('p');
  $albumP.classList.add('ellip-overflow', 'album-name');
  $albumP.innerText = albumName;
  const $durationP = document.createElement('p');
  $durationP.classList.add('duration', 'ellip-overflow');
  $durationP.innerText = `Duration: ${msTimeFormat(duration)}`;
  const $downloadBtn = document.createElement('button');
  $downloadBtn.classList.add('btn', 'download-btn');
  const $downloadImg = document.createElement('img');
  $downloadImg.classList.add('download-image');
  $downloadImg.src = downloaded ? '/images/Downloaded_Icon.png' : '/images/Download_Icon.png';
  $downloadBtn.addEventListener('click', async () => {
    if ($downloadImg.src.includes('Downloading_Icon.gif')) {
      $createModal('Song is already downloading.');
      return;
    }
    $downloadImg.src = '/images/Downloading_Icon.gif';

    try {
      const _downloadResponse = await fetch('/spotify/download/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          artist_name: artistNames.join(', '),
          track_name: trackName,
          track_url: trackUrl
        })
      });

      const _responseHeaders = _downloadResponse.headers;
      const _responseBlob = await _downloadResponse.blob();
      const url = window.URL.createObjectURL(_responseBlob);

      const $link = document.createElement('a');
      $link.style.display = 'none';
      $link.href = url;
      const encodedFileName = _responseHeaders.get('content-disposition').split("=")[1];
      $link.download = decodeURIComponent(encodedFileName);
      document.body.appendChild($link);

      $link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild($link);

      $downloadImg.src = '/images/Downloaded_Icon.png';
    } catch (err) {
      $createModal(`Failed to download: ${err}. Try again.`);
      $downloadImg.src = '/images/Download_Icon.png';
    }
  });

  $downloadBtn.append($downloadImg);
  $trackArtistSect.append($trackP, $artistP);

  const $track = document.createElement('section');
  $track.classList.add('track');
  $track.append($albumImg, $trackArtistSect, $albumP, $durationP, $downloadBtn);

  $trackContainer.appendChild($track);
}