/**
 * Central theme tokens. Mirrors the CSS custom properties defined in
 * app/globals.css so JS-side code (canvas drawing, Howler, dynamic styles)
 * can reference the exact same palette without duplicating hex values.
 */

export const COLORS = {
  royalGold: "#D4AF37",
  softPink: "#F3C6D6",
  ivory: "#FFF8E9",
  midnightBlue: "#0B1246",
  moonWhite: "#F7F7F4",
};

export const FONT_FAMILIES = {
  display: "var(--font-display)", // Playfair Display — headlines
  serif: "var(--font-serif)", // Cormorant Garamond — narrative copy
  sans: "var(--font-sans)", // Inter — UI chrome
};
