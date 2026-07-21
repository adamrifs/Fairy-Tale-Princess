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
    heading: "Every Sweetness the Kingdom Could Offer",
    subtitle: "Golden delicacies were laid before her from dawn until dusk, each one crafted to delight a princess's heart. Yet with every fleeting taste of sweetness, she felt the same quiet ache—that all the treasures in the world could never fill the place where true love was meant to be.",
  },
];
