
function $createModal(text, callback = null) {
  const $modalOverlay = $createElement('section', ['modal-overlay']);
  const $modal = $createElement('section', ['modal']);
  const $textP = $createElement('p', [], { innerText: text });
  const $dismissBtn = $createElement('button', ['btn'], { innerText: 'Ok' });
  $dismissBtn.addEventListener('click', () => {
    document.body.removeChild($modalOverlay);
    if (typeof callback === 'function') {
      callback();
    }
  });

  $modal.append($textP, $dismissBtn);
  $modalOverlay.appendChild($modal);
  document.body.appendChild($modalOverlay);
}

function $createBinaryModal(text, yesText, noText, yesCallback = null, noCallback = null) {
  const $modalOverlay = $createElement('section', ['modal-overlay']);
  const $modal = $createElement('section', ['modal']);
  const $textP = $createElement('p', [], { innerText: text });
  const $yesBtn = $createElement('button', ['btn'], { innerText: yesText });
  const $noBtn = $createElement('button', ['btn'], { innerText: noText });

  $yesBtn.addEventListener('click', () => {
    document.body.removeChild($modalOverlay);
    if (typeof yesCallback === 'function') {
      yesCallback();
    }
  });

  $noBtn.addEventListener('click', () => {
    document.body.removeChild($modalOverlay);
    if (typeof noCallback === 'function') {
      noCallback();
    }
  });

  const $btnContainer = $createElement('section');
  $btnContainer.append($yesBtn, $noBtn);

  $modal.append($textP, $btnContainer);
  $modalOverlay.appendChild($modal);
  document.body.appendChild($modalOverlay);
}