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
    // Which section is currently transitioning OUT, scoped by id. A plain
    // global `isTransitioning` boolean leaks across sections: at a boundary
    // the next section can become `currentSection` before the outgoing
    // section's onLeave sets the flag, so the incoming section would read a
    // transition that isn't its own and dim/hide itself. Keying it to the
    // section that actually set it makes that cross-section leak impossible.
    this.transitioningSection = null;
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

  /**
   * The entry point a section's animation-phase ScrollTrigger calls on
   * enter — resets all per-section state for a clean run.
   *
   * During a programmatic transition (isTransitioning === true), the
   * auto-scroll causes the *next* section's ScrollTrigger to fire this
   * before the outgoing section's fade has completed. That would reset
   * isTransitioning/transitioningSection mid-animation — killing the
   * outgoing fade, mis-triggering the incoming fade, and leaving a black
   * flash on manual scroll. Skip during transitions; the transition
   * timer calls `forceActivateSection` when it's actually ready.
   */
  setActiveSection(id) {
    if (!this.sections.has(id) || this.currentSection === id) return;
    // Block activation while another section is mid-transition.
    if (this.isTransitioning) return;

    this._activateSection(id);
  }

  /** Unconditional activation — used by the transition timer when the fade
   *  sequence is truly complete and the next section is ready to take over. */
  forceActivateSection(id) {
    if (!this.sections.has(id) || this.currentSection === id) return;
    this._activateSection(id);
  }

  _activateSection(id) {
    this.currentSection = id;
    this.phase = STORY_PHASE.ANIMATING;
    this.animationProgress = 0;
    this.currentFrame = 0;
    this.currentStoryIndex = 0;
    this.isPinned = false;
    this.isTransitioning = false;
    this.transitioningSection = null;
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

  /**
   * `sectionId` scopes the transition to the section that's actually
   * leaving (defaults to whatever is current). useScene reads
   * `transitioningSection === id` so only that section's crossfade fires —
   * a sibling that has just become current never inherits it.
   */
  setTransitioning(isTransitioning, sectionId) {
    const target = isTransitioning ? sectionId ?? this.currentSection : null;
    if (this.isTransitioning === isTransitioning && this.transitioningSection === target) return;
    this.isTransitioning = isTransitioning;
    this.transitioningSection = target;
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
      transitioningSection: this.transitioningSection,
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
    this.transitioningSection = null;
    this.scrollProgress = 0;
    this.notify();
  }
}

// Singleton — one shared story state across the app, same rationale as sceneManager's siblings in lib/assets.
export const sceneManager = new SceneManager();
export default sceneManager;
