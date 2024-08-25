import { $createElement } from "./createElement";

export function downloadBlob(encodedFileName: string, blob: Blob): void {
  const url = window.URL.createObjectURL(blob);

  const $link = $createElement('a', [], { href: url, download: decodeURIComponent(encodedFileName), style: { display: 'none' } });
  document.body.appendChild($link);

  $link.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild($link);
}