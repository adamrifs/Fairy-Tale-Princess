/**
 * Section 2 story content and asset registry.
 *
 * The frames live in a flat directory: public/sections/section-2/
 * The manifest scanner registers them under the synthetic scene id "frames"
 * (SECTION2_SCENE_ID). Frame counts are read from assetManager at runtime —
 * never hardcoded here.
 */

export const SECTION2_ID = "section-2";

/** Scene id used by the manifest scanner for the flat frame directory. */
export const SECTION2_SCENE_ID = "frames";

export const SECTION2_TITLE = "Reflections of a Longing Heart";

export const SECTION2_TEXTS = [
  {
    heading: "A Life Behind Golden Doors",
    subtitle: "Each morning she was dressed in silk and adorned with jewels, her every wish attended before she could speak it. Yet as the mirror caught her reflection, she wondered if anyone would ever see past the crown to the girl who dreamed of a world beyond these walls.",
  },
];
