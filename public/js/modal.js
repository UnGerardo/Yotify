
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