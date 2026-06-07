export const params = new URLSearchParams(
  typeof window !== "undefined" ? window.location.search : "",
);

export const globalSavedVersion =
  typeof window !== "undefined"
    ? localStorage.getItem("riwi_active_exam_version")
    : null;

export const rawVersion = (
  params.get("version") ||
  globalSavedVersion ||
  "A"
).toUpperCase();
export const examVersion = ["A", "B", "C", "D"].includes(rawVersion)
  ? rawVersion
  : "A";

export const storagePrefix = `riwi_v_${examVersion.toLowerCase()}_`;

export const keys = {
  student: `${storagePrefix}student`,
  answers: `${storagePrefix}answers`,
  timer: `${storagePrefix}timer_v1`,
  grammarOrder: `${storagePrefix}grammar_order`,
  result: `${storagePrefix}result`,
  playCounts: `${storagePrefix}play_counts`,
};
