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
    heading: "A Kingdom's Beloved Princess",
    subtitle: "Every morning began beneath crystal chandeliers and golden halls. Admired for her beauty, kindness, and gentle heart, she had everything a princess could wish for—except someone who would love her simply for who she truly was.",
  },
];
