
export function $updateElement($elem: HTMLElement, text: string | null, attributes: Record<string, any> = {}) {
  if (text) {
    $elem.innerText = text;
  }

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