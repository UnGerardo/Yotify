import { SPOTDL, ZOTIFY } from "./constants.js";
import { $createModal } from "./utils/modal.js";
import { $updateElement } from "./utils/updateElement.js";

type Callback = () => void;

const $downloaderBtn = document.getElementById('downloader') as HTMLButtonElement;

if (!localStorage.getItem('downloader')) localStorage.setItem('downloader', ZOTIFY);

if (localStorage.getItem('downloader') === SPOTDL) {
  $updateElement($downloaderBtn, 'Downloader: Spotdl', { style: { color: '#f00', border: '1px #f00 solid' } });
} else {
  $updateElement($downloaderBtn, 'Downloader: Zotify', { style: { color: '#0f0', border: '1px #0f0 solid' } });
}

export function $setDownloaderBtnListener(callback: Callback) {
  $downloaderBtn.addEventListener('click', async () => {
    if (localStorage.getItem('downloader') === ZOTIFY) {
      $updateElement($downloaderBtn, 'Downloader: Spotdl', { style: { color: '#f00', border: '1px #f00 solid' } });
      localStorage.setItem('downloader', SPOTDL);
      $createModal('Spotdl searches for Spotify songs on YouTube Music. It is not 100% accurate, but can come with more track information and lyrics.');
    } else {
      $updateElement($downloaderBtn, 'Downloader: Zotify', { style: { color: '#0f0', border: '1px #0f0 solid' } });
      localStorage.setItem('downloader', ZOTIFY);
      $createModal('Zotify gets songs directly from Spotify. 100% accurate, no lyrics.');
    }

    callback();
  });
}