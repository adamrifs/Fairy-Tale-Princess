import { Howl, Howler } from "howler";
import { assetManager } from "@/lib/assets/AssetManager";

/**
 * Thin, imperative wrapper around Howler that future story chapters can
 * call into without touching Howler's API directly. Kept as a singleton
 * class instance (not a hook) so playback state survives component
 * remounts — background music shouldn't restart when a scene unmounts.
 *
 * Client-only: must never be imported by a Server Component tree. It is
 * only ever touched through AudioProvider ('use client') and useAudio().
 */
class AudioManager {
  constructor() {
    this.music = new Map(); // id -> Howl
    this.sfx = new Map(); // id -> Howl
    this.ambient = new Map(); // id -> Howl, layered independently from music (e.g. wind + score together)
    this.activeMusicId = null;
    this.activeAmbientId = null;
    this.musicVolume = 0.6;
    this.sfxVolume = 0.8;
    this.ambientVolume = 0.4;
    this.muted = false;
  }

  /** Registers a background music track without playing it. */
  loadMusic(id, src, { loop = true, volume = this.musicVolume } = {}) {
    if (this.music.has(id)) return this.music.get(id);

    const howl = new Howl({
      src: Array.isArray(src) ? src : [src],
      loop,
      volume,
      html5: true, // streams rather than fully decoding — better for long ambient tracks
      preload: false,
    });

    this.music.set(id, howl);
    return howl;
  }

  /** Registers a one-shot sound effect without playing it. */
  loadSFX(id, src, { volume = this.sfxVolume } = {}) {
    if (this.sfx.has(id)) return this.sfx.get(id);

    const howl = new Howl({
      src: Array.isArray(src) ? src : [src],
      volume,
      html5: false, // decoded in memory for low-latency triggering
      preload: false,
    });

    this.sfx.set(id, howl);
    return howl;
  }

  playMusic(id, { fadeInMs = 0 } = {}) {
    const track = this.music.get(id);
    if (!track) return;

    this.activeMusicId = id;
    track.play();

    if (fadeInMs > 0) {
      track.fade(0, this.musicVolume, fadeInMs);
    }
  }

  stopMusic(id, { fadeOutMs = 0 } = {}) {
    const track = this.music.get(id);
    if (!track) return;

    if (fadeOutMs > 0) {
      track.fade(track.volume(), 0, fadeOutMs);
      track.once("fade", () => track.stop());
    } else {
      track.stop();
    }

    if (this.activeMusicId === id) this.activeMusicId = null;
  }

  /** Crossfades from whatever music is currently active to `toId`. */
  crossfadeMusic(toId, { durationMs = 1500 } = {}) {
    const fromId = this.activeMusicId;
    const toTrack = this.music.get(toId);
    if (!toTrack || fromId === toId) return;

    if (fromId) this.stopMusic(fromId, { fadeOutMs: durationMs });

    toTrack.play();
    toTrack.fade(0, this.musicVolume, durationMs);
    this.activeMusicId = toId;
  }

  playSFX(id) {
    const sound = this.sfx.get(id);
    if (!sound || this.muted) return;
    sound.play();
  }

  /** Registers an ambient loop (wind, crowd, rain) without playing it — layers independently of loadMusic's single active track. */
  loadAmbient(id, src, { volume = this.ambientVolume } = {}) {
    if (this.ambient.has(id)) return this.ambient.get(id);

    const howl = new Howl({
      src: Array.isArray(src) ? src : [src],
      loop: true,
      volume,
      html5: true,
      preload: false,
    });

    this.ambient.set(id, howl);
    return howl;
  }

  playAmbient(id, { fadeInMs = 0 } = {}) {
    const track = this.ambient.get(id);
    if (!track) return;

    this.activeAmbientId = id;
    track.play();

    if (fadeInMs > 0) {
      track.fade(0, this.ambientVolume, fadeInMs);
    }
  }

  stopAmbient(id, { fadeOutMs = 0 } = {}) {
    const track = this.ambient.get(id);
    if (!track) return;

    if (fadeOutMs > 0) {
      track.fade(track.volume(), 0, fadeOutMs);
      track.once("fade", () => track.stop());
    } else {
      track.stop();
    }

    if (this.activeAmbientId === id) this.activeAmbientId = null;
  }

  /** Crossfades from whatever ambient loop is currently active to `toId`. */
  crossfadeAmbient(toId, { durationMs = 1500 } = {}) {
    const fromId = this.activeAmbientId;
    const toTrack = this.ambient.get(toId);
    if (!toTrack || fromId === toId) return;

    if (fromId) this.stopAmbient(fromId, { fadeOutMs: durationMs });

    toTrack.play();
    toTrack.fade(0, this.ambientVolume, durationMs);
    this.activeAmbientId = toId;
  }

  /**
   * Asset-id convenience loaders — resolve a path via assetManager
   * (public/music, public/sounds) instead of the caller hardcoding one.
   * The raw loadMusic/loadSFX/loadAmbient above still take an explicit
   * src for anything outside the registry (e.g. a CDN URL).
   */
  loadMusicFromAsset(id, options) {
    const asset = assetManager.getMusic(id);
    return asset ? this.loadMusic(id, asset.path, options) : null;
  }

  loadSFXFromAsset(id, options) {
    const asset = assetManager.getSound(id);
    return asset ? this.loadSFX(id, asset.path, options) : null;
  }

  loadAmbientFromAsset(id, options) {
    const asset = assetManager.getSound(id) ?? assetManager.getMusic(id);
    return asset ? this.loadAmbient(id, asset.path, options) : null;
  }

  pauseAll() {
    this.music.forEach((track) => track.playing() && track.pause());
    this.sfx.forEach((track) => track.playing() && track.pause());
    this.ambient.forEach((track) => track.playing() && track.pause());
  }

  resumeMusic() {
    if (this.activeMusicId) this.music.get(this.activeMusicId)?.play();
    if (this.activeAmbientId) this.ambient.get(this.activeAmbientId)?.play();
  }

  setMusicVolume(volume) {
    this.musicVolume = volume;
    if (this.activeMusicId) this.music.get(this.activeMusicId)?.volume(volume);
  }

  setSFXVolume(volume) {
    this.sfxVolume = volume;
  }

  setAmbientVolume(volume) {
    this.ambientVolume = volume;
    if (this.activeAmbientId) this.ambient.get(this.activeAmbientId)?.volume(volume);
  }

  mute() {
    this.muted = true;
    Howler.mute(true);
  }

  unmute() {
    this.muted = false;
    Howler.mute(false);
  }

  toggleMute() {
    this.muted ? this.unmute() : this.mute();
    return this.muted;
  }

  /** Unloads every registered track — call on full app teardown only. */
  destroy() {
    this.music.forEach((track) => track.unload());
    this.sfx.forEach((track) => track.unload());
    this.ambient.forEach((track) => track.unload());
    this.music.clear();
    this.sfx.clear();
    this.ambient.clear();
    this.activeMusicId = null;
    this.activeAmbientId = null;
  }
}

// Singleton — the whole point is one shared playback state across the app.
export const audioManager = new AudioManager();
export default audioManager;
