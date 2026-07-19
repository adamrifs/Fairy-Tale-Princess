/**
 * Single stacking-order source of truth. Values are spaced by 10 so future
 * layers can be inserted between existing ones without renumbering.
 */

export const Z_INDEX = {
  base: 0,
  background: 10,
  content: 20,
  story: 30,
  navigation: 40,
  audioControls: 50,
  overlay: 80,
  modal: 90,
  loader: 100,
  cursor: 999,
};
