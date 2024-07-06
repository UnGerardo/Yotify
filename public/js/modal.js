
function $createModal(text) {
  const $modalOverlay = document.createElement('section');
  $modalOverlay.classList.add('modal-overlay');
  const $modal = document.createElement('section');
  $modal.classList.add('modal')
  const $textP = document.createElement('p');
  $textP.innerText = text;
  const $dismissBtn = document.createElement('button');
  $dismissBtn.innerText = 'Dismiss';
  $dismissBtn.classList.add('btn');
  $dismissBtn.addEventListener('click', () => {
    document.body.removeChild($modalOverlay);
  });

  $modal.append($textP, $dismissBtn);
  $modalOverlay.appendChild($modal);
  document.body.appendChild($modalOverlay);
}