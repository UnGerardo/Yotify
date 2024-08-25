
export function msTimeFormat(msTime: number) {
  const totalSeconds = Math.floor(msTime / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const minStr = hours ? `${String(minutes).padStart(2, '0')}:` : `${minutes}:`;
  const secStr = String(seconds).padStart(2, '0');

  return `${hours ? `${hours}:` : ''}${minStr}${secStr}`;
}