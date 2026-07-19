#!/usr/bin/env node

/**
 * Scans public/ and regenerates lib/assets/manifest.json — the single
 * source of truth AssetManager reads at runtime. Runs automatically via
 * the "predev"/"prebuild" npm lifecycle scripts (see package.json), so
 * dropping new files into public/sections, public/music, public/sounds,
 * public/fonts or public/assets requires no source changes: the next
 * `npm run dev` / `npm run build` picks them up on its own.
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const OUTPUT_PATH = path.join(ROOT_DIR, "lib", "assets", "manifest.json");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a"]);
const FONT_EXTENSIONS = new Set([".woff2", ".woff", ".ttf", ".otf"]);

function listDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true });
}

function toId(fileName) {
  return fileName.slice(0, -path.extname(fileName).length);
}

/** Natural sort so "2.png" sorts before "10.png". */
function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// Matches "0001.webp" as well as the real-world "frame_0001.webp" style
// (an alphabetic/underscore prefix in front of the zero-padded number).
const FRAME_NAME_PATTERN = /^([a-zA-Z_-]*)(\d+)\.([a-zA-Z0-9]+)$/;

/**
 * Reads one `*_frames` directory and describes it compactly as
 * { prefix, extension, padding, count } whenever every file matches the
 * same "<prefix><digits>.<ext>" contiguous sequence — that's enough for
 * FrameManager to compute every frame's URL without shipping a filename
 * list. Falls back to an explicit `files` array for anything irregular
 * (gaps, mixed naming) so lookup is still correct, just less compact.
 */
function scanFrameSequence(dirPath, publicRelativePath) {
  const entries = listDir(dirPath)
    .filter(
      (entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    )
    .map((entry) => entry.name)
    .sort(naturalCompare);

  if (entries.length === 0) {
    return { path: publicRelativePath, count: 0, prefix: "", extension: null, padding: 4, files: null };
  }

  const parsed = entries.map((name) => {
    const match = FRAME_NAME_PATTERN.exec(name);
    return match ? { prefix: match[1], digits: match[2], extension: match[3].toLowerCase() } : null;
  });

  const isUniform =
    parsed.every(Boolean) &&
    parsed.every(
      (frame) =>
        frame.prefix === parsed[0].prefix &&
        frame.extension === parsed[0].extension &&
        frame.digits.length === parsed[0].digits.length
    );

  if (isUniform) {
    const isContiguous = parsed.every((frame, index) => Number(frame.digits) === index + 1);

    if (isContiguous) {
      return {
        path: publicRelativePath,
        count: entries.length,
        prefix: parsed[0].prefix,
        extension: parsed[0].extension,
        padding: parsed[0].digits.length,
        files: null,
      };
    }
  }

  return { path: publicRelativePath, count: entries.length, prefix: "", extension: null, padding: 0, files: entries };
}

function scanSection(sectionDirName) {
  const sectionDirPath = path.join(PUBLIC_DIR, "sections", sectionDirName);
  const frames = {};
  const videos = {};

  // Check if the section directory itself contains image files directly (flat structure).
  // This handles the case where all frames live directly in public/sections/section-1/
  // instead of inside a named *_frames sub-directory.
  const directImages = listDir(sectionDirPath).filter(
    (entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
  );

  if (directImages.length > 0) {
    // Register the flat directory under a synthetic scene id "frames".
    frames["frames"] = scanFrameSequence(
      sectionDirPath,
      `/sections/${sectionDirName}/`
    );
  }

  for (const entry of listDir(sectionDirPath)) {
    if (entry.isDirectory() && entry.name.endsWith("_frames")) {
      const sceneId = entry.name.slice(0, -"_frames".length);
      frames[sceneId] = scanFrameSequence(
        path.join(sectionDirPath, entry.name),
        `/sections/${sectionDirName}/${entry.name}/`
      );
      continue;
    }

    if (entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      videos[toId(entry.name)] = {
        path: `/sections/${sectionDirName}/${entry.name}`,
        format: path.extname(entry.name).slice(1).toLowerCase(),
      };
    }
  }

  return { frames, videos };
}

/** Shared scanner for the flat public/music and public/sounds directories. */
function scanFlatAudioDir(dirName) {
  const registry = {};

  for (const entry of listDir(path.join(PUBLIC_DIR, dirName))) {
    if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      registry[toId(entry.name)] = {
        path: `/${dirName}/${entry.name}`,
        format: path.extname(entry.name).slice(1).toLowerCase(),
      };
    }
  }

  return registry;
}

function scanFonts() {
  const registry = {};

  for (const entry of listDir(path.join(PUBLIC_DIR, "fonts"))) {
    if (entry.isFile() && FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      registry[toId(entry.name)] = {
        path: `/fonts/${entry.name}`,
        format: path.extname(entry.name).slice(1).toLowerCase(),
      };
    }
  }

  return registry;
}

/** Recursive, generic catch-all for public/assets (icons/logos/etc. that aren't tied to a section). */
function scanGenericAssets(dirPath = path.join(PUBLIC_DIR, "assets"), relativePrefix = "", depth = 3) {
  const registry = {};
  if (depth < 0) return registry;

  for (const entry of listDir(dirPath)) {
    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      Object.assign(
        registry,
        scanGenericAssets(path.join(dirPath, entry.name), `${relativePrefix}${entry.name}/`, depth - 1)
      );
      continue;
    }

    registry[`${relativePrefix}${toId(entry.name)}`] = { path: `/assets/${relativePrefix}${entry.name}` };
  }

  return registry;
}

function buildManifest() {
  const sectionOrder = listDir(path.join(PUBLIC_DIR, "sections"))
    .filter((entry) => entry.isDirectory() && /^section-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));

  const sections = {};
  for (const sectionDirName of sectionOrder) {
    sections[sectionDirName] = scanSection(sectionDirName);
  }

  return {
    generatedAt: new Date().toISOString(),
    sectionOrder,
    sections,
    music: scanFlatAudioDir("music"),
    sounds: scanFlatAudioDir("sounds"),
    fonts: scanFonts(),
    assets: scanGenericAssets(),
  };
}

function main() {
  const manifest = buildManifest();
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  const frameSceneCount = Object.values(manifest.sections).reduce(
    (sum, section) => sum + Object.keys(section.frames).length,
    0
  );
  const videoCount = Object.values(manifest.sections).reduce(
    (sum, section) => sum + Object.keys(section.videos).length,
    0
  );

  console.log(
    `[asset-manifest] ${manifest.sectionOrder.length} sections, ${frameSceneCount} frame sequences, ` +
      `${videoCount} videos, ${Object.keys(manifest.music).length} music, ${Object.keys(manifest.sounds).length} sounds ` +
      `-> ${path.relative(ROOT_DIR, OUTPUT_PATH)}`
  );
}

main();
