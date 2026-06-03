export default function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secondsLeft = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secondsLeft.toString().padStart(2, "0")}`;
}
