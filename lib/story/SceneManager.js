export const STORY_PHASE = {
  IDLE: "idle",
  ANIMATING: "animating",
  FROZEN: "frozen",
  TEXT: "text",
  TRANSITIONING: "transitioning",
};

/**
 * Global scroll-story state machine — the single source of truth for
 * "what is the story doing right now." Only one section is ever active
 * (matches the "only one section active" performance rule), so this is a
 * plain pub/sub singleton, not a hook: any GSAP ScrollTrigger callback can
 * write into it directly without going through React. StoryProvider
 * (providers/StoryProvider.jsx) bridges it into context, the same pattern
 * Preloader/AssetProvider use for the asset system.
 *
 * StorySection instances register themselves on mount and unregister on
 * unmount — "future sections register automatically," nothing to wire by
 * hand. Order is assignment order unless an explicit `order` is passed.
 */
class SceneManager {
  constructor() {
    this.sections = new Map(); // id -> { id, order }
    this.currentSection = null;
    this.previousSection = null;
    this.nextSection = null;
    this.phase = STORY_PHASE.IDLE;
    this.animationProgress = 0; // 0-1, animation-phase scrub progress of the current section
    this.currentFrame = 0;
    this.currentStoryIndex = 0;
    this.isPinned = false;
    this.isTransitioning = false;
    this.scrollProgress = 0; // 0-1 across the whole story
    this.listeners = new Set();
  }

  get isAnimating() {
    return this.phase === STORY_PHASE.ANIMATING;
  }

  registerSection(id, order) {
    const resolvedOrder = order ?? this.sections.size;
    this.sections.set(id, { id, order: resolvedOrder });

    if (this.currentSection === null) {
      this.currentSection = id;
      this.phase = STORY_PHASE.ANIMATING;
    }

    this._syncNeighbors();
    this.notify();
  }

  unregisterSection(id) {
    this.sections.delete(id);

    if (this.currentSection === id) {
      const [fallback] = this.listSections();
      this.currentSection = fallback ?? null;
      this.phase = this.currentSection ? STORY_PHASE.ANIMATING : STORY_PHASE.IDLE;
    }

    this._syncNeighbors();
    this.notify();
  }

  /** Ordered section ids — the source of truth for StoryProgress and prev/next lookups. */
  listSections() {
    return Array.from(this.sections.values())
      .sort((a, b) => a.order - b.order)
      .map((section) => section.id);
  }

  _syncNeighbors() {
    const order = this.listSections();
    const index = this.currentSection ? order.indexOf(this.currentSection) : -1;
    this.previousSection = index > 0 ? order[index - 1] : null;
    this.nextSection = index >= 0 && index < order.length - 1 ? order[index + 1] : null;
  }

  /** The entry point a section's animation-phase ScrollTrigger calls on enter — resets all per-section state for a clean run. */
  setActiveSection(id) {
    if (!this.sections.has(id) || this.currentSection === id) return;

    this.currentSection = id;
    this.phase = STORY_PHASE.ANIMATING;
    this.animationProgress = 0;
    this.currentFrame = 0;
    this.currentStoryIndex = 0;
    this.isPinned = false;
    this.isTransitioning = false;
    this._syncNeighbors();
    this.notify();
  }

  setPhase(phase) {
    if (this.phase === phase) return;
    this.phase = phase;
    this.notify();
  }

  setAnimationProgress(progress) {
    this.animationProgress = progress;
    this.notify();
  }

  setFrame(frame) {
    if (this.currentFrame === frame) return;
    this.currentFrame = frame;
    this.notify();
  }

  setStoryIndex(index) {
    if (this.currentStoryIndex === index) return;
    this.currentStoryIndex = index;
    this.notify();
  }

  setPinned(isPinned) {
    if (this.isPinned === isPinned) return;
    this.isPinned = isPinned;
    this.notify();
  }

  setTransitioning(isTransitioning) {
    if (this.isTransitioning === isTransitioning) return;
    this.isTransitioning = isTransitioning;
    this.notify();
  }

  /** `localProgress` is 0-1 through the reporting section alone; normalized into the whole story's scrollProgress using registration order. */
  setSectionProgress(id, localProgress) {
    const section = this.sections.get(id);
    if (!section) return;

    const total = this.sections.size || 1;
    const clamped = Math.min(Math.max(localProgress, 0), 1);
    this.scrollProgress = Math.min(1, (section.order + clamped) / total);
    this.notify();
  }

  getSnapshot() {
    return {
      sections: Array.from(this.sections.values()).sort((a, b) => a.order - b.order),
      currentSection: this.currentSection,
      previousSection: this.previousSection,
      nextSection: this.nextSection,
      phase: this.phase,
      isAnimating: this.isAnimating,
      animationProgress: this.animationProgress,
      currentFrame: this.currentFrame,
      currentStoryIndex: this.currentStoryIndex,
      isPinned: this.isPinned,
      isTransitioning: this.isTransitioning,
      scrollProgress: this.scrollProgress,
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.getSnapshot()));
  }

  /** Full reset — only for app teardown/tests, mirrors the asset managers' destroy(). */
  destroy() {
    this.sections.clear();
    this.currentSection = null;
    this.previousSection = null;
    this.nextSection = null;
    this.phase = STORY_PHASE.IDLE;
    this.animationProgress = 0;
    this.currentFrame = 0;
    this.currentStoryIndex = 0;
    this.isPinned = false;
    this.isTransitioning = false;
    this.scrollProgress = 0;
    this.notify();
  }
}

// Singleton — one shared story state across the app, same rationale as sceneManager's siblings in lib/assets.
export const sceneManager = new SceneManager();
export default sceneManager;
