
export function $clearElementExceptForFirst($element: HTMLElement): void {
  while ($element.firstElementChild !== $element.lastElementChild) {
    $element.removeChild($element.lastElementChild!);
  }
}