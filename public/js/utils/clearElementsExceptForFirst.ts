
export function $clearElementsExceptForFirst($element: HTMLElement): void {
  while ($element.firstElementChild !== $element.lastElementChild) {
    $element.removeChild($element.lastElementChild!);
  }
}