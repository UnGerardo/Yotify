
export function msTimeFormat(msTime: number) {
  const totalSeconds = Math.floor(msTime / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalSeconds / 3600);

  let minutes: number | string = totalMinutes - (totalHours * 60);
  let seconds: number | string = totalSeconds - (totalHours * 3600) - (totalMinutes * 60);

  minutes = totalHours > 0 && minutes < 10 ? `0${minutes}` : `${minutes}`;
  seconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  return totalHours > 0 ? `${totalHours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}