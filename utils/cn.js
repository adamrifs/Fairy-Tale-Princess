/** Joins conditional class names, filtering out falsy values. Keeps components free of template-literal className soup. */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
