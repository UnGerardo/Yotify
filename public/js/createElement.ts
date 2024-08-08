
export function $createElement(element: string, classes: string[] = [], attributes: Record<string, any> = {}) {
  const $elem = document.createElement(element);
  $elem.classList.add(...classes);

  Object.entries(attributes).forEach(([attribute, value]) => {
    if (attribute === 'style') {
      let chainedValues = '';
      Object.entries(attributes['style']).forEach(([styleAttribute, value]: [string, any]) => {
        chainedValues += `${styleAttribute}: ${value};`;
      });
      $elem.setAttribute(attribute, chainedValues);
    }
    $elem.setAttribute(attribute, value);
  });

  return $elem;
}
