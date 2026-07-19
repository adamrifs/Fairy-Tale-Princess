/** Restricts a value to the [min, max] range. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between a and b by t (0-1). */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Remaps a value from one range to another. */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

/** Rounds a value to a given number of decimal places. */
export function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Normalizes a value within [min, max] to a 0-1 progress ratio. */
export function normalize(value, min, max) {
  if (max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}
