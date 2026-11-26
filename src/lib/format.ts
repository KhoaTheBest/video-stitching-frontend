/** 2.5 -> "0:02.5", 75 -> "1:15.0" */
export function formatTime(sec: number): string {
  const safe = Math.max(0, sec);
  const minutes = Math.floor(safe / 60);
  const seconds = (safe - minutes * 60).toFixed(1).padStart(4, '0');
  return `${minutes}:${seconds}`;
}
