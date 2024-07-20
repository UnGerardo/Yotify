
function $createElement(element, classes = [], attributes = {}) {
  const $elem = document.createElement(element);
  $elem.classList.add(...classes);

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'style') {
      Object.entries(attributes['style']).forEach(([styleKey, value]) => {
        $elem[key][styleKey] = value;
      });
    }
    $elem[key] = value;
  });

  return $elem;
}
