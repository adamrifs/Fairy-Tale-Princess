/**
 * Section 3 story content and asset registry.
 *
 * The frames live in a flat directory: public/sections/section-3/
 * The manifest scanner registers them under the synthetic scene id "frames"
 * (SECTION3_SCENE_ID). Frame counts are read from assetManager at runtime —
 * never hardcoded here.
 */

export const SECTION3_ID = "section-3";

/** Scene id used by the manifest scanner for the flat frame directory. */
export const SECTION3_SCENE_ID = "frames";

export const SECTION3_TITLE = "A Taste of Fleeting Joy";

export const SECTION3_TEXTS = [
  {
    subtitle: "Ferrero Rocher... her favorite royal delight.",
  },
  {
    subtitle: "There was one little joy that never failed to make her smile.",
  },
  {
    subtitle:
      "Even the sweetest moments faded too quickly when there was no one special to share them with.",
  },
  {
    subtitle:
      "Some happiness is complete only when it is shared with the right person.",
  },
];
