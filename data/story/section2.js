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
    subtitle: "Every day began with royal traditions and graceful routines.",
  },
  {
    subtitle: "As her curls danced in the morning light, she quietly watched the world beyond her window.",
  },
  {
    subtitle: "She often wondered if somewhere... someone was thinking of her just as she was thinking of them.",
  },
];
