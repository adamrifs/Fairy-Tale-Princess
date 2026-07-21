/**
 * Section 1 story content and asset registry.
 *
 * The frames now live in a flat directory: public/sections/section-1/
 * The manifest scanner registers them under the synthetic scene id "frames"
 * (SECTION1_SCENE_ID). Frame counts are read from assetManager at runtime —
 * never hardcoded here.
 */

export const SECTION1_ID = "section-1";

/** Scene id used by the manifest scanner for the flat frame directory. */
export const SECTION1_SCENE_ID = "frames";

export const SECTION1_TITLE = "A Fairy Tale Begins";

export const SECTION1_TEXTS = [
  {
    subtitle: "Every morning began beneath crystal chandeliers and golden halls.",
  },
  {
    subtitle: "Her kingdom admired her beauty, her kindness, and her gentle heart.",
  },
  {
    subtitle: "Yet no amount of admiration could replace the feeling of being truly loved.",
  },
  {
    subtitle: "Even surrounded by a magnificent palace... her heart still waited for someone who would choose her, not because she was a princess... but simply because she was herself.",
  },
];
