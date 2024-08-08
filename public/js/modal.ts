import { $createElement } from "./createElement";

type ModalCallback = () => void;

export function $createModal(text: string, callback: ModalCallback | null = null) {
  const $modalOverlay = $createElement('section', ['modal-overlay']);
  const $modal = $createElement('section', ['modal']);
  const $textP = $createElement('p', [], { innerText: text });
  const $dismissBtn = $createElement('button', ['btn'], { innerText: 'Ok' });
  $dismissBtn.addEventListener('click', () => {
    document.body.removeChild($modalOverlay);
    if (callback) {
      callback();
    }
  });

  $modal.append($textP, $dismissBtn);
  $modalOverlay.appendChild($modal);
  document.body.appendChild($modalOverlay);
}

export function $createBinaryModal(
  text: string,
  firstText: string,
  secondText: string,
  firstCallback: ModalCallback | null = null,
  secondCallback: ModalCallback | null = null
) {
  const $modalOverlay = $createElement('section', ['modal-overlay']);
  const $modal = $createElement('section', ['modal']);
  const $textP = $createElement('p', [], { innerText: text });
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

  $modal.append($textP, $btnContainer);
  $modalOverlay.appendChild($modal);
  document.body.appendChild($modalOverlay);
}