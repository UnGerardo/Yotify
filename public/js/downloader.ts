import { SPOTDL, ZOTIFY } from "./constants.js";
import { $createModal } from "./utils/modal.js";

type Callback = () => void;

const $downloaderBtn = document.getElementById('downloader') as HTMLButtonElement;

if (!localStorage.getItem('downloader')) {
  localStorage.setItem('downloader', ZOTIFY);
} else {
  if (localStorage.getItem('downloader') === SPOTDL) {
    $downloaderBtn.innerText = 'Downloader: Spotdl';
    $downloaderBtn.style.color = '#f00';
    $downloaderBtn.style.border = '1px #f00 solid';
  } else {
    $downloaderBtn.innerText = 'Downloader: Zotify';
    $downloaderBtn.style.color = '#0f0';
    $downloaderBtn.style.border = '1px #0f0 solid';
  }
}

export function $setDownloaderBtnListener(callback: Callback) {
  $downloaderBtn.addEventListener('click', async () => {
    if (localStorage.getItem('downloader') === ZOTIFY) {
      $downloaderBtn.innerText = 'Downloader: Spotdl';
      $downloaderBtn.style.color = '#f00';
      $downloaderBtn.style.border = '1px #f00 solid';
      localStorage.setItem('downloader', SPOTDL);
      $createModal('Spotdl searches for Spotify songs on YouTube Music. It is not 100% accurate, but can come with more track information and lyrics.');
    } else {
      $downloaderBtn.innerText = 'Downloader: Zotify';
      $downloaderBtn.style.color = '#0f0';
      $downloaderBtn.style.border = '1px #0f0 solid';
      localStorage.setItem('downloader', ZOTIFY);
      $createModal('Zotify gets songs directly from Spotify. 100% accurate, no lyrics.');
    }

    callback();
  });
}