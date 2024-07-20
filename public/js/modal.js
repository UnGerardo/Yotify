
function $createModal(text) {
  const $modalOverlay = $createElement('section', ['modal-overlay']);
  const $modal = $createElement('section', ['modal']);
  const $textP = $createElement('p', [], { innerText: text });
  const $dismissBtn = $createElement('button', ['btn'], { innerText: 'Ok' });
  $dismissBtn.addEventListener('click', () => {
    document.body.removeChild($modalOverlay);
  });

  $modal.append($textP, $dismissBtn);
  $modalOverlay.appendChild($modal);
  document.body.appendChild($modalOverlay);
}