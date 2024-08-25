import { $createElement } from "./createElement.js";

type ModalCallback = () => void;

export function $createModal(mainText: string, callback: ModalCallback | null = null) {
  const $modalOverlay = $createElement('section', ['modal-overlay']);
  const $modal = $createElement('section', ['modal']);
  const $mainTextP = $createElement('p', [], { innerText: mainText });
  const $dismissBtn = $createElement('button', ['btn'], { innerText: 'Ok' });
  $dismissBtn.addEventListener('click', () => {
    document.body.removeChild($modalOverlay);
    if (callback) {
      callback();
    }
  });

  $modal.append($mainTextP, $dismissBtn);
  $modalOverlay.appendChild($modal);
  document.body.appendChild($modalOverlay);
}

export function $createBinaryModal(
  mainText: string,
  firstText: string,
  secondText: string,
  firstCallback: ModalCallback | null = null,
  secondCallback: ModalCallback | null = null
) {
  const $modalOverlay = $createElement('section', ['modal-overlay']);
  const $modal = $createElement('section', ['modal']);
  const $mainTextP = $createElement('p', [], { innerText: mainText });
  const $firstBtn = $createElement('button', ['btn', 'm-lr-10'], { innerText: firstText });
  const $secondBtn = $createElement('button', ['btn', 'm-lr-10'], { innerText: secondText });

  $firstBtn.addEventListener('click', () => {
    document.body.removeChild($modalOverlay);
    if (firstCallback) {
      firstCallback();
    }
  });

  $secondBtn.addEventListener('click', () => {
    document.body.removeChild($modalOverlay);
    if (secondCallback) {
      secondCallback();
    }
  });

  const $btnContainer = $createElement('section');
  $btnContainer.append($firstBtn, $secondBtn);

  $modal.append($mainTextP, $btnContainer);
  $modalOverlay.appendChild($modal);
  document.body.appendChild($modalOverlay);
}