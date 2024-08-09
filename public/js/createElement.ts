
export function $createElement(element: string, classes: string[] = [], attributes: Record<string, any> = {}) {
  const $elem = document.createElement(element);
  $elem.classList.add(...classes);

  Object.entries(attributes).forEach(([attribute, value]: [string, any]) => {
    if (attribute === 'style') {
      Object.entries(attributes['style']).forEach(([nestedAttribute, value]: [string, any]) => {
        $elem[attribute][nestedAttribute] = value;
      });
    }
    $elem[attribute] = value;
  });

  return $elem as HTMLElement;
}
