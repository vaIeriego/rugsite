function layoutViewportWidthPx() {
  if (!document.documentElement.classList.contains("layout-no-shrink")) {
    return window.innerWidth;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--layout-lock-min")
    .trim();
  const minPx = parseFloat(raw);
  const floor = Number.isFinite(minPx) ? minPx : 1440;
  return Math.max(window.innerWidth, floor);
}

/** Matches css/styles.css spring-in sheet animation: topbarWhiteSheetShrinkIntoBar 0.495s cubic-bezier(0.37, 0, 0.21, 1). */
const SPRING_IN_SHEET_DURATION_MS = 495;

/** Solve Y at X for cubic-bezier (through P1=(x1,y1), P2=(x2,y2)); used as CSS animation-timing-function. */
function cubicBezierYAtX(x, x1, y1, x2, y2) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let uLo = 0;
  let uHi = 1;
  for (let i = 0; i < 16; i++) {
    const uMid = (uLo + uHi) * 0.5;
    const xMid =
      3 * (1 - uMid) * (1 - uMid) * uMid * x1 +
      3 * (1 - uMid) * uMid * uMid * x2 +
      uMid * uMid * uMid;
    if (xMid < x) uLo = uMid;
    else uHi = uMid;
  }
  const u = (uLo + uHi) * 0.5;
  return (
    3 * (1 - u) * (1 - u) * u * y1 +
    3 * (1 - u) * u * u * y2 +
    u * u * u
  );
}

/** Collapse progress 0→1 with 6% hold (keyframes 0%/6%), same easing as the white sheet. */
function springInSheetCollapseProgress(elapsedMs) {
  const Lin = Math.min(1, elapsedMs / SPRING_IN_SHEET_DURATION_MS);
  if (Lin <= 0.06) return 0;
  const seg = (Lin - 0.06) / (1 - 0.06);
  return cubicBezierYAtX(seg, 0.37, 0, 0.21, 1);
}

/** Matches topbarWhiteSheetExpandMirrorFadeOut: 0.236s cubic-bezier(0.4, 0, 0.22, 1). */
const SPRING_OUT_SHEET_DURATION_MS = 236;

function springOutSheetExpandProgress(elapsedMs) {
  const Lin = Math.min(1, elapsedMs / SPRING_OUT_SHEET_DURATION_MS);
  if (Lin <= 0.06) return 0;
  const seg = (Lin - 0.06) / (1 - 0.06);
  return cubicBezierYAtX(seg, 0.4, 0, 0.22, 1);
}

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/** Home hero: floating title layout runs before nav reads geometry (same scroll frame). */
let syncFloatingTitleImmediate = null;
/** While topbar-spring-in runs, vertical centering uses ::before sheet height (not just nav bar box). */
let springInSheetAnimStartMs = null;
/** Same for scroll-up spring-out (sheet grows away from the bar). */
let springOutSheetAnimStartMs = null;

const getSessionStorageSafe = () => {
  try {
    const store = window.sessionStorage;
    const probeKey = "__valerieweb_ss_probe__";
    store.setItem(probeKey, "1");
    store.removeItem(probeKey);
    return store;
  } catch (_err) {
    return null;
  }
};
const sessionStore = getSessionStorageSafe();
const sessionGet = (key) => {
  try {
    return sessionStore ? sessionStore.getItem(key) : null;
  } catch (_err) {
    return null;
  }
};
const sessionSet = (key, value) => {
  try {
    if (sessionStore) sessionStore.setItem(key, value);
  } catch (_err) {
    // no-op: sessionStorage can be blocked on file:// or strict privacy modes
  }
};
const sessionRemove = (key) => {
  try {
    if (sessionStore) sessionStore.removeItem(key);
  } catch (_err) {
    // no-op: sessionStorage can be blocked on file:// or strict privacy modes
  }
};

const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("navOverlay");
const navClose = document.getElementById("navClose");

if (hamburger && nav && navClose) {
  let navOpenScrollY = 0;

  hamburger.addEventListener("click", () => {
    navOpenScrollY = window.scrollY;
    nav.classList.add("is-open");
    nav.removeAttribute("aria-hidden");
    hamburger.setAttribute("aria-expanded", "true");
  });

  function closeNav({ preserveScroll = true } = {}) {
    nav.classList.remove("is-open");
    nav.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    if (preserveScroll) {
      window.scrollTo({ top: navOpenScrollY, behavior: "auto" });
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: navOpenScrollY, behavior: "auto" });
      });
    }
  }

  navClose.addEventListener("click", (e) => {
    e.preventDefault();
    closeNav({ preserveScroll: true });
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => closeNav({ preserveScroll: false }))
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav({ preserveScroll: true });
  });

  window.addEventListener(
    "resize",
    () => {
      if (window.matchMedia("(min-width: 769px)").matches && nav.classList.contains("is-open")) {
        closeNav({ preserveScroll: true });
      }
    },
    { passive: true }
  );
}

const recentExtraViewport = document.querySelector(".recent-extra-carousel__viewport");
const recentExtraPrev = document.querySelector(".recent-extra-carousel__arrow--left");
const recentExtraNext = document.querySelector(".recent-extra-carousel__arrow--right");

if (recentExtraViewport && recentExtraPrev && recentExtraNext) {
  let rafId = null;
  let currentX = recentExtraViewport.scrollLeft;
  let targetX = currentX;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const maxScroll = () =>
    Math.max(0, recentExtraViewport.scrollWidth - recentExtraViewport.clientWidth);

  const ensureTick = () => {
    if (!rafId) rafId = window.requestAnimationFrame(tick);
  };

  const tick = () => {
    const diff = targetX - currentX;
    currentX += diff * 0.16;
    recentExtraViewport.scrollLeft = currentX;

    if (Math.abs(diff) > 0.35) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      currentX = targetX;
      recentExtraViewport.scrollLeft = currentX;
      rafId = null;
    }
  };

  const pushDelta = (delta) => {
    targetX = clamp(targetX + delta, 0, maxScroll());
    ensureTick();
  };

  const getStep = () => {
    const firstItem = recentExtraViewport.querySelector(".recent-extra-carousel__item");
    const track = recentExtraViewport.querySelector(".recent-extra-carousel__track");
    if (!firstItem || !track) return 334;
    const gap = parseFloat(window.getComputedStyle(track).gap || "14");
    return firstItem.getBoundingClientRect().width + gap;
  };

  recentExtraPrev.addEventListener("click", () => {
    pushDelta(-getStep() * 2);
  });

  recentExtraNext.addEventListener("click", () => {
    pushDelta(getStep() * 2);
  });

  recentExtraViewport.addEventListener(
    "wheel",
    (e) => {
      const mostlyHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.1;
      if (!mostlyHorizontal || Math.abs(e.deltaX) < 2) return;
      e.preventDefault();
      pushDelta(e.deltaX * 0.68);
    },
    { passive: false }
  );

  recentExtraViewport.addEventListener("scroll", () => {
    if (rafId) return;
    currentX = recentExtraViewport.scrollLeft;
    targetX = currentX;
  });

  window.addEventListener("resize", () => {
    targetX = clamp(targetX, 0, maxScroll());
    currentX = clamp(currentX, 0, maxScroll());
    recentExtraViewport.scrollLeft = currentX;
  });
}

const heroSquareViewport = document.querySelector(".hero-square-carousel__viewport");
const heroSquarePrev = document.querySelector(".hero-square-carousel__arrow--left");
const heroSquareNext = document.querySelector(".hero-square-carousel__arrow--right");

if (heroSquareViewport && heroSquarePrev && heroSquareNext) {
  const heroSquareTrack = heroSquareViewport.querySelector(".hero-square-carousel__track");
  if (heroSquareTrack && !heroSquareTrack.dataset.loopReady) {
    const originals = Array.from(heroSquareTrack.children);
    originals.forEach((item) => heroSquareTrack.appendChild(item.cloneNode(true)));
    heroSquareTrack.dataset.loopReady = "true";
  }

  const getLoopWidth = () => {
    if (!heroSquareTrack) return 0;
    return Math.max(0, heroSquareTrack.scrollWidth / 2);
  };

  const normalizeLoopPositionValue = (value) => {
    const loopWidth = getLoopWidth();
    if (loopWidth <= 1) return value;
    let next = value;
    while (next >= loopWidth) next -= loopWidth;
    while (next < 0) next += loopWidth;
    return next;
  };

  let smoothRaf = null;
  /** True for the whole slide, including before the first rAF tick (smoothRaf is still null). */
  let heroSquareAnimating = false;
  let currentX = heroSquareViewport.scrollLeft;
  let targetX = currentX;
  let autoStepTimer = null;
  /** True while pointer is over the carousel image viewport — auto-advance stays off until pointer leaves. */
  let heroSquarePointerOverImages = false;
  const AUTO_SLIDE_DURATION_MS = 1000;
  /** Arrow clicks: slower than auto-start tweak; paired with ease-in-out-quart below. */
  const MANUAL_SLIDE_DURATION_MS = 1080;
  /* Idle after an animation finishes before the next auto-slide. */
  const AUTO_STEP_MS = AUTO_SLIDE_DURATION_MS + 2600;
  const isAnimatingHeroSquares = () => heroSquareAnimating;

  const syncArrowState = () => {
    const busy = isAnimatingHeroSquares();
    heroSquareViewport.setAttribute("aria-busy", busy ? "true" : "false");
    heroSquarePrev.disabled = busy;
    heroSquareNext.disabled = busy;
  };

  /* Auto-advance: cubic ease. */
  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

  /**
   * Arrow slides: ease-in-out quart — gentle start/end, slightly quicker mid-movement.
   */
  const easeInOutQuart = (t) =>
    t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;

  const animateBy = (delta, durationMs, easeFn = easeInOutCubic) => {
    if (!delta) return false;
    if (isAnimatingHeroSquares()) return false;

    const from = snapToNearestSlot(heroSquareViewport.scrollLeft);
    const to = from + delta;
    const start = performance.now();
    currentX = from;
    targetX = to;
    heroSquareViewport.scrollLeft = from;
    heroSquareAnimating = true;
    syncArrowState();

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeFn(t);
      const next = from + (to - from) * eased;
      currentX = next;
      heroSquareViewport.scrollLeft = normalizeLoopPositionValue(next);

      if (t < 1) {
        smoothRaf = window.requestAnimationFrame(tick);
      } else {
        const snappedTo = snapToNearestSlot(to);
        currentX = snappedTo;
        targetX = snappedTo;
        heroSquareViewport.scrollLeft = snappedTo;
        smoothRaf = null;
        heroSquareAnimating = false;
        syncArrowState();
        syncHeroSquareAutoPause();
      }
    };

    smoothRaf = window.requestAnimationFrame(tick);
    return true;
  };

  /** Pause auto-advance while hovered; if a slide is still easing, wait — do not cancel the RAF animation. */
  const syncHeroSquareAutoPause = () => {
    if (!heroSquarePointerOverImages) return;
    if (heroSquareAnimating) return;
    if (autoStepTimer) {
      window.clearInterval(autoStepTimer);
      autoStepTimer = null;
    }
  };

  const restartAutoStepTimer = () => {
    if (autoStepTimer) {
      window.clearInterval(autoStepTimer);
      autoStepTimer = null;
    }
    if (heroSquarePointerOverImages) return;
    autoStepTimer = window.setInterval(autoStepOnce, AUTO_STEP_MS);
  };

  const getStep = () => {
    const firstItem = heroSquareViewport.querySelector(".hero-square-carousel__item");
    const track = heroSquareViewport.querySelector(".hero-square-carousel__track");
    if (!firstItem || !track) return 260;
    // Move one full carousel slot: square width + inter-item gap.
    const gap = parseFloat(window.getComputedStyle(track).gap || "0");
    return firstItem.getBoundingClientRect().width + gap;
  };

  const HERO_SQUARE_WIDTH_BOOST_PX = 0;

  const applySixAcrossWithHalfCutEnds = () => {
    const track = heroSquareViewport.querySelector(".hero-square-carousel__track");
    if (!track) return;
    const gap = parseFloat(window.getComputedStyle(track).gap || "0");
    const viewportWidth = heroSquareViewport.clientWidth || window.innerWidth;
    // Show 6 visible squares total, with the outer 2 cropped to half-width.
    // Visible width: 5 full slots + 5 gaps.
    const slotWidth = Math.max(
      1,
      (viewportWidth - gap * 5) / 5 + HERO_SQUARE_WIDTH_BOOST_PX
    );
    heroSquareViewport.style.setProperty("--hero-square-width", `${slotWidth}px`);
  };

  const getEdgeHalfCutOffset = () => getStep() * 0.5;

  const snapToNearestSlot = (value) => {
    const normalized = normalizeLoopPositionValue(value);
    const step = getStep();
    if (step <= 1) return normalized;
    const offset = getEdgeHalfCutOffset();
    const slot = Math.round((normalized - offset) / step);
    return normalizeLoopPositionValue(offset + slot * step);
  };

  const nudgeOneSquare = (direction) => {
    const step = getStep();
    if (step <= 1) return;
    // One slot per click; duration + quart easing give an eased, readable glide.
    const started = animateBy(direction * step, MANUAL_SLIDE_DURATION_MS, easeInOutQuart);
    if (!started) return;
    restartAutoStepTimer();
  };

  heroSquarePrev.addEventListener("click", () => {
    // Left arrow: move squares right by one slot.
    nudgeOneSquare(-1);
  });

  heroSquareNext.addEventListener("click", () => {
    // Right arrow: move squares left by one slot.
    nudgeOneSquare(1);
  });

  /** Horizontal wheel / shift+vertical wheel → scroll loop (same factor as recent-extra). */
  heroSquareViewport.addEventListener(
    "wheel",
    (e) => {
      if (isAnimatingHeroSquares()) return;
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      const dy = e.shiftKey ? e.deltaX : e.deltaY;
      const mostlyHorizontal = Math.abs(dx) > Math.abs(dy) * 1.1;
      if (!mostlyHorizontal || Math.abs(dx) < 2) return;
      e.preventDefault();
      heroSquareViewport.scrollLeft = normalizeLoopPositionValue(
        heroSquareViewport.scrollLeft + dx * 0.68
      );
      restartAutoStepTimer();
    },
    { passive: false }
  );

  heroSquareViewport.addEventListener("pointerenter", () => {
    heroSquarePointerOverImages = true;
    syncHeroSquareAutoPause();
  });
  heroSquareViewport.addEventListener("pointerleave", () => {
    heroSquarePointerOverImages = false;
    restartAutoStepTimer();
  });

  heroSquareViewport.addEventListener("scroll", () => {
    if (smoothRaf || heroSquareAnimating) return;
    currentX = snapToNearestSlot(heroSquareViewport.scrollLeft);
    targetX = currentX;
    heroSquareViewport.scrollLeft = currentX;
  });

  window.addEventListener("resize", () => {
    applySixAcrossWithHalfCutEnds();
    void heroSquareViewport.offsetWidth;
    currentX = snapToNearestSlot(heroSquareViewport.scrollLeft);
    targetX = currentX;
    heroSquareViewport.scrollLeft = currentX;
    syncArrowState();
  });

  window.addEventListener("pagehide", () => {
    if (smoothRaf) {
      window.cancelAnimationFrame(smoothRaf);
      smoothRaf = null;
    }
    heroSquareAnimating = false;
    syncArrowState();
    if (autoStepTimer) {
      window.clearInterval(autoStepTimer);
      autoStepTimer = null;
    }
  });

  const autoStepOnce = () => {
    if (document.hidden) return;
    const step = getStep();
    if (step <= 1) return;
    // Auto-step: same easing family; duration set by AUTO_SLIDE_DURATION_MS.
    animateBy(step, AUTO_SLIDE_DURATION_MS);
  };

  applySixAcrossWithHalfCutEnds();

  const syncInitialFrameScroll = () => {
    applySixAcrossWithHalfCutEnds();
    void heroSquareViewport.offsetWidth;
    currentX = normalizeLoopPositionValue(getEdgeHalfCutOffset());
    targetX = currentX;
    heroSquareViewport.scrollLeft = currentX;
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(syncInitialFrameScroll);
  });

  autoStepTimer = window.setInterval(autoStepOnce, AUTO_STEP_MS);

  syncArrowState();
}

const topbarHomeLink = document.querySelector('#topbar a[href="index.html"]');
const topbarResumeLink = document.querySelector(".topbar__resume-link");
if (topbarHomeLink) {
  topbarHomeLink.addEventListener("click", () => {
    sessionRemove("valerieweb.collectionMode");
  });
}

const preRectHeader = document.querySelector(".contact__pre-rect-header");
const preRectClose = document.querySelector(".contact__pre-rect-close");
const preRectSectionToggle = document.querySelector(".contact__pre-rect");
const preRectResumeCta = document.querySelector(".contact__pre-rect-resume-cta");
let focalShiftTimer = null;
let toggleSpeedTimer = null;
let lastToggleAt = 0;
let resumeHideSyncTimer = null;

const isPreRectCollapsedOrClosing = () =>
  !!(
    preRectSectionToggle &&
    (
      preRectSectionToggle.classList.contains("is-collapsed") ||
      preRectSectionToggle.classList.contains("is-closing")
    )
  );

const getAdaptiveToggleDuration = () => {
  const now = performance.now();
  const gap = lastToggleAt ? now - lastToggleAt : Infinity;
  lastToggleAt = now;
  // Slower rollout while keeping fast repeated toggles smooth.
  if (gap < 170) return 0.62;
  if (gap < 270) return 0.74;
  if (gap < 420) return 0.88;
  if (gap < 620) return 0.98;
  return 1.08;
};

const applyAdaptiveToggleDuration = (container) => {
  if (!container) return;
  const dur = getAdaptiveToggleDuration();
  container.style.setProperty("--toggle-dur", `${dur}s`);
  if (toggleSpeedTimer) window.clearTimeout(toggleSpeedTimer);
  toggleSpeedTimer = window.setTimeout(() => {
    container.style.setProperty("--toggle-dur", "1.08s");
    toggleSpeedTimer = null;
  }, Math.max(420, Math.round(dur * 1000) + 180));
};

const applyQuickHideDuration = (container) => {
  if (!container) return;
  const dur = 0.42;
  container.style.setProperty("--toggle-dur", `${dur}s`);
  if (toggleSpeedTimer) window.clearTimeout(toggleSpeedTimer);
  toggleSpeedTimer = window.setTimeout(() => {
    container.style.setProperty("--toggle-dur", "1.08s");
    toggleSpeedTimer = null;
  }, Math.max(420, Math.round(dur * 1000) + 180));
};

const clearResumeHideSyncWindow = (container) => {
  if (!container) return;
  container.classList.remove("is-resume-hiding");
  if (resumeHideSyncTimer) {
    window.clearTimeout(resumeHideSyncTimer);
    resumeHideSyncTimer = null;
  }
};

const startResumeHideSyncWindow = (container) => {
  if (!container) return;
  clearResumeHideSyncWindow(container);
  container.classList.add("is-resume-hiding");
  const raw = parseFloat(
    window.getComputedStyle(container).getPropertyValue("--toggle-dur")
  );
  const ms = (Number.isFinite(raw) && raw > 0 ? raw * 1000 : 420) + 70;
  resumeHideSyncTimer = window.setTimeout(() => {
    container.classList.remove("is-resume-hiding");
    resumeHideSyncTimer = null;
  }, ms);
};

const triggerFocalShift = (container) => {
  if (!container) return;
  // Force restart so rapid toggles always retrigger the focal-shift state.
  container.classList.remove("is-focal-shifting");
  void container.offsetWidth;
  container.classList.add("is-focal-shifting");
  if (focalShiftTimer) window.clearTimeout(focalShiftTimer);
  focalShiftTimer = window.setTimeout(() => {
    container.classList.remove("is-focal-shifting");
    focalShiftTimer = null;
  }, 900);
};

if (preRectHeader && preRectClose && preRectSectionToggle) {
  preRectSectionToggle.dataset.oliveCycleStep = "0"; // 0=hide, 1=show, 2=close

  const syncResumeHiddenState = (
    hidden,
    {
      skipAdaptiveDuration = false,
      skipFocalShift = false,
      skipHorizontalSlide = false,
      forceQuickHide = false
    } = {}
  ) => {
    if (hidden && forceQuickHide) {
      applyQuickHideDuration(preRectSectionToggle);
    } else if (!skipAdaptiveDuration) {
      applyAdaptiveToggleDuration(preRectSectionToggle);
    }
    const wasHidden = preRectSectionToggle.classList.contains("resume-hidden");
    if (!skipFocalShift && wasHidden !== hidden) {
      triggerFocalShift(preRectSectionToggle);
    }
    if (skipHorizontalSlide && wasHidden !== hidden) {
      preRectSectionToggle.classList.add("is-resume-slide-suppressed");
    }
    if (hidden && wasHidden !== hidden) {
      startResumeHideSyncWindow(preRectSectionToggle);
    } else if (!hidden) {
      clearResumeHideSyncWindow(preRectSectionToggle);
    }
    preRectSectionToggle.classList.toggle("resume-hidden", hidden);
    if (skipHorizontalSlide && wasHidden !== hidden) {
      void preRectSectionToggle.offsetWidth;
      preRectSectionToggle.classList.remove("is-resume-slide-suppressed");
    }
    const localResumeToggle = document.querySelector(".contact__resume-toggle");
    if (localResumeToggle) {
      localResumeToggle.textContent = hidden ? "›" : "‹";
      localResumeToggle.setAttribute("aria-expanded", String(!hidden));
      localResumeToggle.setAttribute("aria-label", hidden ? "Show resume" : "Hide resume");
    }
  };

  let preRectToggleTimer = null;
  const clearPreRectTimers = () => {
    if (preRectToggleTimer) {
      window.clearTimeout(preRectToggleTimer);
      preRectToggleTimer = null;
    }
  };

  const getCurrentToggleMs = () => {
    const raw = parseFloat(
      window.getComputedStyle(preRectSectionToggle).getPropertyValue("--toggle-dur")
    );
    if (Number.isFinite(raw) && raw > 0) return raw * 1000;
    return 780;
  };

  const syncPreRectCollapseState = (collapsed, immediate = false) => {
    if (immediate) {
      clearPreRectTimers();
      clearResumeHideSyncWindow(preRectSectionToggle);
      preRectSectionToggle.classList.remove("is-closing", "is-opening");
      preRectSectionToggle.classList.toggle("is-collapsed", collapsed);
      if (collapsed) {
        preRectSectionToggle.classList.remove("is-focal-shifting");
        preRectSectionToggle.dataset.oliveCycleStep = "0";
      }
      preRectClose.textContent = collapsed ? "▴" : "▾";
      preRectClose.setAttribute(
        "aria-label",
        collapsed ? "Show resume and slideshow" : "Hide resume and slideshow"
      );
      preRectClose.setAttribute("aria-expanded", String(!collapsed));
      return;
    }

    applyAdaptiveToggleDuration(preRectSectionToggle);
    const toggleMs = getCurrentToggleMs();
    const cleanupMs = Math.round(toggleMs + 60);

    clearPreRectTimers();

    // Never carry focal-shift into section open/close cycles.
    preRectSectionToggle.classList.remove("is-focal-shifting");
    clearResumeHideSyncWindow(preRectSectionToggle);

    // Ensure left panel visibility is restored before opening animation starts,
    // so the right image doesn't visibly shift during roll-out.
    if (!collapsed) {
      syncResumeHiddenState(false, {
        skipAdaptiveDuration: true,
        skipFocalShift: true,
        skipHorizontalSlide: true
      });
      preRectSectionToggle.dataset.oliveCycleStep = "0";
    }

    // Close with an immediate roll-up to keep the motion smooth.
    if (collapsed) {
      preRectSectionToggle.classList.remove("is-collapsed");
      preRectSectionToggle.classList.add("is-closing");
      preRectSectionToggle.classList.remove("is-opening");
    } else {
      preRectSectionToggle.classList.remove("is-collapsed", "is-closing");
      preRectSectionToggle.classList.add("is-opening");
    }

    if (collapsed) preRectSectionToggle.dataset.oliveCycleStep = "0";
    preRectToggleTimer = window.setTimeout(() => {
      // Reset hidden/focal state after close completes so each reopen starts from baseline,
      // without flashing the left panel during the close motion.
      if (collapsed) {
        if (focalShiftTimer) {
          window.clearTimeout(focalShiftTimer);
          focalShiftTimer = null;
        }
        // Finalize close state in the same frame to avoid a style-gap jolt.
        preRectSectionToggle.classList.add("is-collapsed");
        preRectSectionToggle.classList.remove("is-focal-shifting");
      }
      preRectSectionToggle.classList.remove("is-closing");
      preRectSectionToggle.classList.remove("is-opening");
      preRectToggleTimer = null;
    }, cleanupMs);

    preRectClose.textContent = collapsed ? "▴" : "▾";
    preRectClose.setAttribute(
      "aria-label",
      collapsed ? "Show resume and slideshow" : "Hide resume and slideshow"
    );
    preRectClose.setAttribute("aria-expanded", String(!collapsed));

  };

  preRectClose.addEventListener("click", () => {
    const shouldCollapse = !isPreRectCollapsedOrClosing();
    syncPreRectCollapseState(shouldCollapse);
  });

  if (preRectResumeCta) {
    preRectResumeCta.addEventListener("click", () => {
      syncPreRectCollapseState(false);
    });
  }

  preRectHeader.addEventListener("click", (e) => {
    if (
      e.target.closest(".contact__pre-rect-link") ||
      e.target.closest(".contact__pre-rect-close") ||
      e.target.closest(".contact__pre-rect-resume-cta")
    ) {
      return;
    }
    const isCollapsed = isPreRectCollapsedOrClosing();
    if (isCollapsed) {
      // If bar is collapsed, clicking the bar opens it.
      syncPreRectCollapseState(false);
      return;
    }

    const isLeftHidden = preRectSectionToggle.classList.contains("resume-hidden");
    if (!isLeftHidden) {
      // 2nd click: hide left panel.
      syncResumeHiddenState(true, { skipFocalShift: true, forceQuickHide: true });
      preRectSectionToggle.dataset.oliveCycleStep = "1";
      return;
    }

    // 3rd click: close the whole section.
    syncPreRectCollapseState(true);
    preRectSectionToggle.dataset.oliveCycleStep = "0";
  });

  // Default behavior: always closed on page load, with no animation.
  syncPreRectCollapseState(true, true);
}

const topbar = document.getElementById("topbar");
const mainHeroSplit = document.querySelector(
  ".split:not(.split--secondary):not(.split--about):not(.split--about-full):not(.split--tertiary)"
);
const preRect = document.querySelector(".contact__pre-rect");
const heroTitle = document.getElementById("heroTitle");
let topbarSolidScrollY = null;
const HERO_TEXT_DARK_PROGRESS = 0.9;
const HERO_NAV_EXTRA_SCROLL_PX = 20;

/* Nav RAF runs after floating-title layout so thresholds use the live floating clone rect.
 * Scroll coalescing: cancel prior RAF and reschedule so rapid wheel/trackpad input always
 * applies one sync per paint with the latest scroll position (consistent at any speed). */
if (topbar && mainHeroSplit) {
  let heroNavRafId = null;
  let lastScrollY = window.scrollY || window.pageYOffset || 0;
  let prevHasPassedHero = topbar.classList.contains("is-solid");
  /* Once home nav turns white, keep it sticky/solid for the rest of the page scroll. */
  let keepHomeNavSolid = prevHasPassedHero;
  /** After fading out on scroll-down because title touched the nav bottom, block re-solid until title drops. */
  let solidExitByBottomTouch = false;
  let topbarSpringTimer = null;
  let heroFoucPendingCleared = false;
  /** Wider exit than enter so fast scroll does not oscillate `is-solid` / spring at the band edge. */
  const LINK_BAND_ENTER_SLACK_PX = 2;
  const LINK_BAND_EXIT_SLACK_PX = 22;
  const springInClass = "topbar-spring-in";
  const springOutClass = "topbar-spring-out";

  document.body.classList.remove(springInClass);
  document.body.classList.remove(springOutClass);

  const syncTopbarStyleFromHero = () => {
    if (typeof syncFloatingTitleImmediate === "function") {
      syncFloatingTitleImmediate();
    }
    const currentScrollY = window.scrollY || window.pageYOffset || 0;
    const scrollingUp = currentScrollY < lastScrollY - 0.5;
    const scrollingDown = currentScrollY > lastScrollY + 0.5;
    const navHeight = topbar.offsetHeight || 0;
    const heroRect = mainHeroSplit.getBoundingClientRect();
    const HERO_NAV_ENTER_SOLID_OFFSET_UP_PX = -52;
    const HERO_NAV_ENTER_SOLID_OFFSET_DOWN_PX = -14;
    const HERO_NAV_EXIT_SOLID_OFFSET_UP_PX = 16;
    const HERO_NAV_EXIT_SOLID_OFFSET_DOWN_PX = 22;
    let hasPassedHero = prevHasPassedHero;
    /** True when the name has cleared the nav link band again (hero overlap) — kills sticky solid + spring lock. */
    let titleBackInHero = false;
    /* Solid nav when the top of the name (floating clone if ready) reaches the bottom of the
     * right-hand link row — Schmitt band so scroll speed does not matter. */
    const floatTitleReady = document.querySelector(
      ".hero-title-float.is-layout-ready"
    );
    const titleForAlign = floatTitleReady || heroTitle;
    /* Full About | Contact | Resume row — same vertical band you align to when scrolling. */
    const navRightRow = topbar.querySelector(".topbar__nav-right");

    if (titleForAlign && navRightRow) {
      const titleRect = titleForAlign.getBoundingClientRect();
      const rowRect = navRightRow.getBoundingClientRect();
      const navRect = topbar.getBoundingClientRect();
      const titleTop = titleRect.top;
      const rowBottom = rowRect.bottom;
      const TOUCH_NAV_BOTTOM_SLACK_PX = 0;
      const CLEAR_TOUCH_BELOW_NAV_BOTTOM_PX = 10;
      if (prevHasPassedHero) {
        if (
          scrollingDown &&
          titleRect.bottom <= navRect.bottom + TOUCH_NAV_BOTTOM_SLACK_PX
        ) {
          hasPassedHero = false;
          solidExitByBottomTouch = true;
        } else if (titleTop > rowBottom + LINK_BAND_EXIT_SLACK_PX) {
          hasPassedHero = false;
          solidExitByBottomTouch = false;
        }
      } else if (
        !solidExitByBottomTouch &&
        titleTop <= rowBottom + LINK_BAND_ENTER_SLACK_PX
      ) {
        hasPassedHero = true;
      } else if (solidExitByBottomTouch) {
        if (titleTop > rowBottom + LINK_BAND_EXIT_SLACK_PX) {
          solidExitByBottomTouch = false;
        } else if (
          titleRect.bottom > navRect.bottom + CLEAR_TOUCH_BELOW_NAV_BOTTOM_PX
        ) {
          solidExitByBottomTouch = false;
          if (titleTop <= rowBottom + LINK_BAND_ENTER_SLACK_PX) hasPassedHero = true;
        }
      }
      titleBackInHero = titleTop > rowBottom + LINK_BAND_EXIT_SLACK_PX;
    } else if (Number.isFinite(topbarSolidScrollY)) {
      const ENTER_HYSTERESIS_PX = 0;
      const EXIT_HYSTERESIS_PX = 40;
      if (prevHasPassedHero) {
        if (currentScrollY < topbarSolidScrollY - EXIT_HYSTERESIS_PX) hasPassedHero = false;
      } else if (currentScrollY >= topbarSolidScrollY + ENTER_HYSTERESIS_PX) {
        hasPassedHero = true;
      }
    } else if (prevHasPassedHero) {
      const exitOffset = scrollingUp
        ? HERO_NAV_EXIT_SOLID_OFFSET_UP_PX
        : HERO_NAV_EXIT_SOLID_OFFSET_DOWN_PX;
      if (heroRect.bottom > navHeight + exitOffset) hasPassedHero = false;
    } else {
      const enterOffset = scrollingUp
        ? HERO_NAV_ENTER_SOLID_OFFSET_UP_PX
        : HERO_NAV_ENTER_SOLID_OFFSET_DOWN_PX;
      if (heroRect.bottom <= navHeight + enterOffset) hasPassedHero = true;
    }

    /* Fast scroll back into hero: drop sticky spring-in so the white bar does not linger.
     * Do NOT strip topbar-spring-out here — while titleBackInHero is true every subsequent frame
     * would remove it and kill the scroll-up expand/fade CSS before it can run (timer clears it). */
    if (titleBackInHero) {
      hasPassedHero = false;
      keepHomeNavSolid = false;
      if (document.body.classList.contains(springInClass)) {
        if (topbarSpringTimer) {
          window.clearTimeout(topbarSpringTimer);
          topbarSpringTimer = null;
        }
        document.body.classList.remove(springInClass);
      }
    } else {
      if (document.body.classList.contains(springInClass)) {
        hasPassedHero = true;
      } else if (document.body.classList.contains(springOutClass)) {
        hasPassedHero = false;
      }
    }

    if (hasPassedHero) keepHomeNavSolid = true;
    if (keepHomeNavSolid && scrollingUp) {
      const heroRugImg = mainHeroSplit.querySelector(".split__rugs img, .split__rug img");
      const heroImageBottomVp =
        heroRugImg && heroRugImg.getBoundingClientRect
          ? heroRugImg.getBoundingClientRect().bottom
          : heroRect.bottom;
      const RELEASE_SOLID_AT_HERO_BOTTOM_PX = 2;
      if (heroImageBottomVp > navHeight + RELEASE_SOLID_AT_HERO_BOTTOM_PX) {
        keepHomeNavSolid = false;
      }
    }
    if (keepHomeNavSolid && !titleBackInHero) {
      hasPassedHero = true;
    }

    if (hasPassedHero !== prevHasPassedHero) {
      if (topbarSpringTimer) {
        window.clearTimeout(topbarSpringTimer);
        topbarSpringTimer = null;
      }
      const navAlreadyHydrated = document.body.classList.contains("nav-scroll-hydrated");
      if (navAlreadyHydrated) {
        const navMeas = topbar.offsetHeight || 70;
        const HERO_SHEET_OFFSET_BELOW_IMAGE_TOP_PX = 6;
        const HERO_SPRING_FADE_LINE_OFFSET_ABOVE_IMAGE_BOTTOM_PX = 52;
        const SHEET_MIN_TRAVEL_ABOVE_NAV_PX = 36;
        const imageLinePx = Math.round(heroRect.top + HERO_SHEET_OFFSET_BELOW_IMAGE_TOP_PX);
        const sheetBottomPx = Math.max(
          imageLinePx,
          navMeas + SHEET_MIN_TRAVEL_ABOVE_NAV_PX
        );
        const heroRugImg = mainHeroSplit.querySelector(
          ".split__rugs img, .split__rug img"
        );
        const imageBottomVp =
          heroRugImg && heroRugImg.getBoundingClientRect
            ? heroRugImg.getBoundingClientRect().bottom
            : heroRect.bottom;
        const fadeLineFromImageBottomPx = Math.round(
          imageBottomVp - HERO_SPRING_FADE_LINE_OFFSET_ABOVE_IMAGE_BOTTOM_PX
        );
        if (hasPassedHero) {
          document.documentElement.style.removeProperty("--topbar-collapse-from-height");
          document.documentElement.style.setProperty(
            "--topbar-spring-start-height",
            `${sheetBottomPx}px`
          );
          document.body.classList.remove(springOutClass);
          document.body.classList.add(springInClass);
        } else {
          const collapseFromPx = Math.max(
            fadeLineFromImageBottomPx,
            navMeas + SHEET_MIN_TRAVEL_ABOVE_NAV_PX
          );
          document.documentElement.style.setProperty(
            "--topbar-collapse-from-height",
            `${collapseFromPx}px`
          );
          document.documentElement.style.removeProperty("--topbar-spring-start-height");
          topbar.classList.toggle("is-solid", hasPassedHero);
          document.body.classList.remove(springInClass);
          document.body.classList.add(springOutClass);
        }
        topbarSpringTimer = window.setTimeout(() => {
          document.body.classList.remove(springInClass);
          document.body.classList.remove(springOutClass);
          topbarSpringTimer = null;
        }, hasPassedHero ? 900 : 415);
      } else {
        document.documentElement.style.removeProperty("--topbar-spring-start-height");
        document.documentElement.style.removeProperty("--topbar-collapse-from-height");
      }
    }

    const collapseUsedEarlySolidToggle =
      hasPassedHero !== prevHasPassedHero &&
      document.body.classList.contains("nav-scroll-hydrated") &&
      !hasPassedHero;
    if (!collapseUsedEarlySolidToggle) {
      topbar.classList.toggle("is-solid", hasPassedHero);
    }

    if (!document.body.classList.contains("nav-scroll-hydrated")) {
      document.body.classList.add("nav-scroll-hydrated");
    }

    if (
      document.documentElement.classList.contains("hero-fouc-pending") &&
      !heroFoucPendingCleared
    ) {
      heroFoucPendingCleared = true;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.documentElement.classList.remove("hero-fouc-pending");
        });
      });
    }

    lastScrollY = currentScrollY;
    prevHasPassedHero = hasPassedHero;
  };

  const requestHeroNavSync = () => {
    if (heroNavRafId != null) {
      cancelAnimationFrame(heroNavRafId);
    }
    heroNavRafId = requestAnimationFrame(() => {
      heroNavRafId = null;
      syncTopbarStyleFromHero();
    });
  };

  window.addEventListener("scroll", requestHeroNavSync, { passive: true });
  window.addEventListener("resize", requestHeroNavSync);
  requestHeroNavSync();
}

if (topbar && mainHeroSplit && heroTitle) {
  const heroTitleLink = heroTitle.querySelector(".text-block__title-home");

  if (heroTitleLink) {
    const floatingTitle = document.createElement("a");
    floatingTitle.className = "hero-title-float";
    /* Nav-bar clone: main homepage (matches index hero home link). */
    const mainHome = new URL("index.html", window.location.href);
    mainHome.hash = "#home";
    floatingTitle.href = mainHome.href;
    floatingTitle.innerHTML = heroTitleLink.innerHTML;
    floatingTitle.setAttribute("aria-label", "Go to main page");
    floatingTitle.style.opacity = "0";
    floatingTitle.style.visibility = "hidden";
    document.body.appendChild(floatingTitle);
    heroTitle.classList.add("is-scroll-proxy-source");

    let startTop = 0;
    let sourceAbsTop = 0;
    let dockTop = 0;
    let endScale = 0.2;
    let dockScrollY = 1;
    let ticking = false;
    let resizeRaf = 0;
    const horizontalSquish = 0.97;
    const verticalStretch = 1.09;
    /** < 1 tightens the final docked size (more intense shrink). */
    const HERO_ENDSCALE_INTENSITY = 0.92;
    /** Max extra space (px) between title baseline area and bottom of hero image as shrink completes. */
    const HERO_TITLE_BOTTOM_LIFT_MAX_PX = 48;
    /** >1 makes scroll-driven shrink steeper (more size change per px early). 1.25 ≈ +25% steepness. */
    const HERO_TITLE_SCALE_SCROLL_STEEPNESS = 1.25;
    /** Widen dock target so fully shrunk text reads ~this many pt larger (CSS pt → px at 96dpi). */
    const HERO_DOCK_FINAL_SIZE_BOOST_PT = 5;
    /** Fine tune docked title vertical position in navbar (positive moves down). */
    const HERO_DOCK_Y_OFFSET_PX = 0;
    const CSS_PT_TO_PX = 96 / 72;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const measure = () => {
      floatingTitle.style.visibility = "hidden";
      floatingTitle.style.transform = "translate3d(-50%, 0px, 0) scale(1)";

      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const sourceRect = heroTitle.getBoundingClientRect();
      const navRect = topbar.getBoundingClientRect();
      const navLinkRow = topbar.querySelector(".topbar__nav-right");
      const navLinkRect = navLinkRow ? navLinkRow.getBoundingClientRect() : navRect;
      const sourceWidth = Math.max(sourceRect.width, 1);
      const desiredDockWidth =
        Math.min(layoutViewportWidthPx() * 0.28, 290) +
        HERO_DOCK_FINAL_SIZE_BOOST_PT * CSS_PT_TO_PX;

      endScale = clamp(desiredDockWidth / sourceWidth, 0.12, 0.4);
      endScale = clamp(endScale * HERO_ENDSCALE_INTENSITY, 0.1, 0.38);
      startTop = sourceRect.top;
      sourceAbsTop = sourceRect.top + currentScrollY;
      {
        const endScaleY = endScale * verticalStretch;
        // Center-to-center docking target: middle of name aligns to middle of nav links.
        dockTop =
          navLinkRect.top +
          navLinkRect.height * 0.5 -
          (sourceRect.height * endScaleY) * 0.5;
      }
      dockScrollY = Math.max(1, sourceAbsTop - dockTop);
      topbarSolidScrollY =
        dockScrollY * HERO_TEXT_DARK_PROGRESS + HERO_NAV_EXTRA_SCROLL_PX;

      /* Stay hidden until syncFloatingTitle applies transform (avoid flash at top:0). */
    };

    const remeasureAndSyncFloatingTitle = () => {
      measure();
      requestSyncFloatingTitle();
    };

    const syncFloatingTitleCore = () => {
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const sourceRect = heroTitle.getBoundingClientRect();
      const navRect = topbar.getBoundingClientRect();
      const navLinkRow = topbar.querySelector(".topbar__nav-right");
      const navLinkRect = navLinkRow ? navLinkRow.getBoundingClientRect() : navRect;
      const scalePLinear = clamp(currentScrollY / dockScrollY, 0, 1);
      const scaleP =
        1 -
        Math.pow(
          1 - scalePLinear,
          HERO_TITLE_SCALE_SCROLL_STEEPNESS
        );
      topbar.style.setProperty("--hero-nav-collapse-progress", scaleP.toFixed(4));
      heroTitle.style.setProperty(
        "--hero-title-bottom-lift",
        `${(scaleP * HERO_TITLE_BOTTOM_LIFT_MAX_PX).toFixed(2)}px`
      );
      const scale = 1 + (endScale - 1) * scaleP;
      const scaleX = scale * horizontalSquish;
      const scaleY = scale * verticalStretch;

      const springInActive =
        document.body.classList.contains("topbar-spring-in") &&
        topbar.classList.contains("is-solid");
      const springOutActive =
        document.body.classList.contains("topbar-spring-out") &&
        !topbar.classList.contains("is-solid");

      if (springInActive) {
        springOutSheetAnimStartMs = null;
        if (springInSheetAnimStartMs == null) {
          springInSheetAnimStartMs = performance.now();
        }
      } else if (springOutActive) {
        springInSheetAnimStartMs = null;
        if (springOutSheetAnimStartMs == null) {
          springOutSheetAnimStartMs = performance.now();
        }
      } else {
        springInSheetAnimStartMs = null;
        springOutSheetAnimStartMs = null;
      }

      let layoutHeight = navRect.height;
      if (springInActive && springInSheetAnimStartMs != null) {
        const raw =
          document.documentElement.style.getPropertyValue(
            "--topbar-spring-start-height"
          ) ||
          getComputedStyle(document.documentElement).getPropertyValue(
            "--topbar-spring-start-height"
          );
        const startH = parseFloat(String(raw).trim());
        const navH = navRect.height;
        if (Number.isFinite(startH) && startH > 0 && navH > 0) {
          const elapsed = performance.now() - springInSheetAnimStartMs;
          const prog = springInSheetCollapseProgress(elapsed);
          layoutHeight = startH + (navH - startH) * prog;
        }
      } else if (springOutActive && springOutSheetAnimStartMs != null) {
        const raw =
          document.documentElement.style.getPropertyValue(
            "--topbar-collapse-from-height"
          ) ||
          getComputedStyle(document.documentElement).getPropertyValue(
            "--topbar-collapse-from-height"
          );
        const endH = parseFloat(String(raw).trim());
        const navH = navRect.height;
        if (Number.isFinite(endH) && endH > 0 && navH > 0) {
          const elapsed = performance.now() - springOutSheetAnimStartMs;
          const prog = springOutSheetExpandProgress(elapsed);
          layoutHeight = navH + (endH - navH) * prog;
        }
      }

      /* Center-to-center docking: title midpoint tracks nav-link-row midpoint. */
      const dockTopLive =
        navLinkRect.top +
        navLinkRect.height * 0.5 -
        (sourceRect.height * scaleY) * 0.5;
      const sourceY = sourceRect.top;
      const y = Math.max(navRect.top + 2, Math.max(dockTopLive, sourceY)) + HERO_DOCK_Y_OFFSET_PX;

      floatingTitle.style.transform = `translate3d(-50%, ${y.toFixed(2)}px, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
      floatingTitle.style.visibility = "visible";
      floatingTitle.style.opacity = "1";
      floatingTitle.classList.add("is-layout-ready");
      document.body.classList.add("hero-float-ready");
      floatingTitle.style.removeProperty("opacity");
      floatingTitle.style.removeProperty("visibility");

      const titleRect = floatingTitle.getBoundingClientRect();
      const sheetBottom = navRect.top + layoutHeight;
      const overlapsNav =
        titleRect.bottom > navRect.top &&
        titleRect.top < sheetBottom &&
        titleRect.right > navRect.left &&
        titleRect.left < navRect.right;
      const wantsDarkText =
        topbar.classList.contains("is-solid") || overlapsNav;
      floatingTitle.classList.toggle("is-dark", wantsDarkText);
      floatingTitle.classList.toggle("is-hidden", !!(nav && nav.classList.contains("is-open")));
    };

    const syncFloatingTitle = () => {
      syncFloatingTitleCore();
      ticking = false;
    };

    syncFloatingTitleImmediate = syncFloatingTitleCore;

    const requestSyncFloatingTitle = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(syncFloatingTitle);
    };

    remeasureAndSyncFloatingTitle();

    if (document.fonts && typeof document.fonts.ready?.then === "function") {
      document.fonts.ready.then(() => {
        remeasureAndSyncFloatingTitle();
      });
    }

    window.addEventListener("load", () => {
      window.requestAnimationFrame(remeasureAndSyncFloatingTitle);
    });
    window.addEventListener("pageshow", () => {
      window.requestAnimationFrame(remeasureAndSyncFloatingTitle);
    });
    window.addEventListener("resize", () => {
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        remeasureAndSyncFloatingTitle();
      });
    });
  }
}

if (topbar && preRect) {
  let ticking = false;
  let isLocked = false;

  const syncTopbarAndOliveBar = () => {
    const navHeight = topbar.offsetHeight || 0;
    const rect = preRect.getBoundingClientRect();
    const headerHeight = preRectHeader ? preRectHeader.offsetHeight : navHeight;
    const headerClosed = !!(preRectHeader && preRectHeader.classList.contains("is-closed"));

    const shouldLockTopbar = rect.top <= navHeight;
    if (shouldLockTopbar && !isLocked) {
      document.body.style.setProperty("--topbar-lock-y", `${window.scrollY}px`);
      document.body.classList.add("topbar-static-lock");
      isLocked = true;
    } else if (!shouldLockTopbar && isLocked) {
      document.body.classList.remove("topbar-static-lock");
      isLocked = false;
    }

    const shouldFollow = !headerClosed && rect.top <= 0 && rect.bottom > headerHeight;
    document.body.classList.toggle("olive-follow-active", shouldFollow);

    ticking = false;
  };

  const requestSync = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(syncTopbarAndOliveBar);
  };

  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync);
  requestSync();
}

const collectionSection = document.getElementById("collection");
const recentProjectsToggle = document.querySelector(".section__title-back");
const viewPortfolioToggle = document.querySelector(".section__title-link");
const portfolioCards = collectionSection
  ? collectionSection.querySelector(".cards")
  : null;
const portfolioViewport = collectionSection
  ? collectionSection.querySelector(".portfolio-viewport")
  : null;
const portfolioPrev = collectionSection
  ? collectionSection.querySelector(".portfolio-arrow--left")
  : null;
const portfolioNext = collectionSection
  ? collectionSection.querySelector(".portfolio-arrow--right")
  : null;
const portfolioCloneClass = "card--loop-clone";

if (collectionSection) {
  const COLLECTION_MODE_KEY = "valerieweb.collectionMode";
  let busyClearTimer = null;
  let arrowAnimRaf = null;
  let cardsFadeTimer = null;

  const setCarouselBusy = (busy) => {
    collectionSection.classList.toggle("carousel-busy", !!busy);
  };

  const replayCardsFade = () => {
    if (!portfolioCards) return;
    portfolioCards.classList.remove("cards--fadein");
    // Force reflow so the animation can replay each time.
    void portfolioCards.offsetWidth;
    portfolioCards.classList.add("cards--fadein");
    if (cardsFadeTimer) window.clearTimeout(cardsFadeTimer);
    cardsFadeTimer = window.setTimeout(() => {
      portfolioCards.classList.remove("cards--fadein");
    }, 3400);
  };

  const getBasePortfolioCards = () => {
    if (!portfolioCards) return [];
    return Array.from(
      portfolioCards.querySelectorAll(`.card:not(.${portfolioCloneClass})`)
    );
  };

  const getPortfolioStep = () => {
    if (!portfolioCards) return 0;
    const firstCard = portfolioCards.querySelector(`.card:not(.${portfolioCloneClass})`);
    if (!firstCard) return 0;
    const cardWidth = firstCard.offsetWidth;
    const gap = parseFloat(window.getComputedStyle(portfolioCards).gap || "0");
    return cardWidth + gap;
  };

  const getPortfolioSetWidth = () => {
    const baseCards = getBasePortfolioCards();
    return getPortfolioStep() * baseCards.length;
  };

  const setupPortfolioLoop = () => {
    if (!portfolioCards || !portfolioViewport) return;
    if (portfolioCards.dataset.loopReady === "true") return;

    const baseCards = getBasePortfolioCards();
    if (!baseCards.length) return;

    const beforeFrag = document.createDocumentFragment();
    const afterFrag = document.createDocumentFragment();

    baseCards.forEach((card) => {
      const beforeClone = card.cloneNode(true);
      beforeClone.classList.add(portfolioCloneClass);
      beforeFrag.appendChild(beforeClone);

      const afterClone = card.cloneNode(true);
      afterClone.classList.add(portfolioCloneClass);
      afterFrag.appendChild(afterClone);
    });

    portfolioCards.prepend(beforeFrag);
    portfolioCards.append(afterFrag);
    portfolioCards.dataset.loopReady = "true";

    const setWidth = getPortfolioSetWidth();
    if (setWidth > 0) {
      portfolioViewport.scrollLeft = setWidth;
    }
  };

  const teardownPortfolioLoop = () => {
    if (!portfolioCards || !portfolioViewport) return;
    portfolioCards
      .querySelectorAll(`.${portfolioCloneClass}`)
      .forEach((node) => node.remove());
    delete portfolioCards.dataset.loopReady;
    portfolioViewport.scrollLeft = 0;
  };

  const normalizePortfolioLoopScroll = () => {
    if (!portfolioViewport || !portfolioCards) return;
    if (portfolioCards.dataset.loopReady !== "true") return;
    const setWidth = getPortfolioSetWidth();
    if (!setWidth) return;

    // Keep a wider middle safety band to avoid visible boundary jitter.
    const min = setWidth * 0.25;
    const max = setWidth * 1.75;
    let left = portfolioViewport.scrollLeft;

    if (left < min) left += setWidth;
    else if (left > max) left -= setWidth;
    if (left !== portfolioViewport.scrollLeft) portfolioViewport.scrollLeft = left;
  };

  const updatePortfolioArrows = () => {
    if (!portfolioViewport || !portfolioPrev || !portfolioNext) return;
    if (!collectionSection.classList.contains("mode-recent")) {
      portfolioPrev.disabled = true;
      portfolioNext.disabled = true;
      return;
    }
    portfolioPrev.disabled = false;
    portfolioNext.disabled = false;
  };

  const stopArrowAnimation = () => {
    if (arrowAnimRaf) {
      window.cancelAnimationFrame(arrowAnimRaf);
      arrowAnimRaf = null;
    }
  };

  const updateCollectionTitleSelection = (mode) => {
    if (recentProjectsToggle) {
      recentProjectsToggle.classList.toggle("is-active", mode === "mode-recent");
    }
    if (viewPortfolioToggle) {
      viewPortfolioToggle.classList.toggle("is-active", mode === "mode-portfolio");
    }
  };

  const updateHeroPortfolioState = (mode) => {
    // Keep hero split visuals unchanged; portfolio mode should only affect collection area.
    document.body.classList.remove("is-portfolio-view");
  };

  const animatePortfolioBy = (delta, duration = 320) => {
    if (!portfolioViewport) return;
    stopArrowAnimation();
    setCarouselBusy(true);

    const start = performance.now();
    const from = portfolioViewport.scrollLeft;
    const to = from + delta;
    const direction = Math.sign(delta) || 1;

    // smoother main motion before tail handoff
    const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeInOutSine(t);
      portfolioViewport.scrollLeft = from + (to - from) * eased;
      normalizePortfolioLoopScroll();

      if (t < 1) {
        arrowAnimRaf = window.requestAnimationFrame(step);
      } else {
        arrowAnimRaf = null;
        setCarouselBusy(false);
      }
    };

    arrowAnimRaf = window.requestAnimationFrame(step);
  };

  const setCollectionMode = (mode, source = "user") => {
    collectionSection.classList.remove("mode-recent", "mode-portfolio");
    if (mode) collectionSection.classList.add(mode);
    if (mode === "mode-recent") {
      setupPortfolioLoop();
    } else {
      teardownPortfolioLoop();
    }
    if (mode) {
      sessionSet(COLLECTION_MODE_KEY, mode);
    } else {
      sessionRemove(COLLECTION_MODE_KEY);
    }
    updateCollectionTitleSelection(mode);
    updateHeroPortfolioState(mode);
    const shouldReplayFade =
      source === "init" || mode === "mode-recent" || mode === "mode-portfolio";
    if (shouldReplayFade) replayCardsFade();
    updatePortfolioArrows();
  };

  if (recentProjectsToggle) {
    recentProjectsToggle.addEventListener("click", (e) => {
      e.preventDefault();
      setCollectionMode("mode-recent", "user");
    });
  }

  if (viewPortfolioToggle) {
    viewPortfolioToggle.addEventListener("click", (e) => {
      e.preventDefault();
      setCollectionMode("mode-portfolio", "user");
    });
  }

  if (portfolioPrev && portfolioNext) {
    portfolioPrev.addEventListener("click", () => {
      if (!portfolioViewport || !collectionSection.classList.contains("mode-recent")) return;
      const step = getPortfolioStep();
      if (!step) return;
      animatePortfolioBy(-step * 4);
    });

    portfolioNext.addEventListener("click", () => {
      if (!portfolioViewport || !collectionSection.classList.contains("mode-recent")) return;
      const step = getPortfolioStep();
      if (!step) return;
      animatePortfolioBy(step * 4);
    });
  }

  if (portfolioViewport) {
    let scrollTicking = false;
    let momentumVelocity = 0;
    let momentumRaf = null;
    let momentumStartTimer = null;

    const stopMomentum = () => {
      if (momentumRaf) {
        window.cancelAnimationFrame(momentumRaf);
        momentumRaf = null;
      }
    };

    const runMomentum = () => {
      if (!collectionSection.classList.contains("mode-recent")) return;
      stopMomentum();
      setCarouselBusy(true);

      const step = () => {
        if (!portfolioViewport) return;
        if (Math.abs(momentumVelocity) < 0.08) {
          momentumVelocity = 0;
          momentumRaf = null;
          setCarouselBusy(false);
          return;
        }

        portfolioViewport.scrollLeft = portfolioViewport.scrollLeft + momentumVelocity;
        normalizePortfolioLoopScroll();
        momentumVelocity *= 0.92;
        momentumRaf = window.requestAnimationFrame(step);
      };

      momentumRaf = window.requestAnimationFrame(step);
    };

    portfolioViewport.addEventListener(
      "scroll",
      () => {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(() => {
          normalizePortfolioLoopScroll();
          updatePortfolioArrows();
          scrollTicking = false;
        });
      },
      { passive: true }
    );

    // Continuous horizontal scroll with delayed momentum after release.
    portfolioViewport.addEventListener(
      "wheel",
      (e) => {
        if (!collectionSection.classList.contains("mode-recent")) return;

        const mostlyHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.15;
        if (!mostlyHorizontal || Math.abs(e.deltaX) < 2) return;
        const delta = e.deltaX;

        e.preventDefault();
        stopArrowAnimation();
        stopMomentum();
        setCarouselBusy(true);
        if (busyClearTimer) window.clearTimeout(busyClearTimer);

        portfolioViewport.scrollLeft = portfolioViewport.scrollLeft + delta * 0.55;
        normalizePortfolioLoopScroll();
        momentumVelocity = delta * 0.24;
        if (momentumStartTimer) window.clearTimeout(momentumStartTimer);
        momentumStartTimer = window.setTimeout(() => {
          runMomentum();
        }, 45);

        busyClearTimer = window.setTimeout(() => {
          if (!momentumRaf) setCarouselBusy(false);
        }, 220);
      },
      { passive: false }
    );
  }

  const savedMode = sessionGet(COLLECTION_MODE_KEY);
  if (savedMode === "mode-recent" || savedMode === "mode-portfolio") {
    setCollectionMode(savedMode, "init");
  } else {
    updateCollectionTitleSelection(null);
    updateHeroPortfolioState(null);
    replayCardsFade();
    updatePortfolioArrows();
  }

  window.addEventListener("resize", updatePortfolioArrows);
}

const contactWrap = document.querySelector(".contact__img-wrap");
const contactImg = contactWrap ? contactWrap.querySelector("img") : null;
const aboutBarWrap = document.querySelector(".about-olive-bar--secondary");
const aboutBarImg = document.querySelector(".about-olive-bar__img");
const contactSection = document.getElementById("contact");
const contactEmailPanel = document.querySelector(".contact__email-panel");
const contactEmailPanelScroll = document.querySelector(".contact__email-panel-scroll");
const contactEmailToggle = document.querySelector(".contact__email-toggle");
const contactParallaxFactor = 0.72; // image scrolls slower than surrounding content
const aboutBarParallaxFactor = 0.72;

if (contactWrap && contactImg) {
  let rafId = null;
  let targetY = 0;
  let currentY = 0;
  const maxParallaxTravel = 110;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const computeTargetParallaxY = () => {
    const rect = contactWrap.getBoundingClientRect();
    const viewportCenter = window.innerHeight * 0.5;
    const imageCenter = rect.top + rect.height * 0.5;
    const delta = viewportCenter - imageCenter;
    const next = delta * (1 - contactParallaxFactor);
    return clamp(next, -maxParallaxTravel, maxParallaxTravel);
  };

  const animateParallax = () => {
    const diff = targetY - currentY;
    currentY += diff * 0.12; // smoothing

    contactImg.style.transform = `translateY(${currentY.toFixed(2)}px) scale(1.12)`;

    if (Math.abs(diff) > 0.08) {
      rafId = window.requestAnimationFrame(animateParallax);
    } else {
      currentY = targetY;
      contactImg.style.transform = `translateY(${currentY.toFixed(2)}px) scale(1.12)`;
      rafId = null;
    }
  };

  const requestParallaxUpdate = () => {
    targetY = computeTargetParallaxY();
    if (!rafId) rafId = window.requestAnimationFrame(animateParallax);
  };

  window.addEventListener("scroll", requestParallaxUpdate, { passive: true });
  window.addEventListener("resize", requestParallaxUpdate);
  requestParallaxUpdate();
}

if (aboutBarWrap && aboutBarImg) {
  let rafId = null;
  let targetY = 0;
  let currentY = 0;

  const computeTargetParallaxY = () => {
    const rect = aboutBarWrap.getBoundingClientRect();
    const viewportCenter = window.innerHeight * 0.5;
    const imageCenter = rect.top + rect.height * 0.5;
    const delta = viewportCenter - imageCenter;
    return delta * (1 - aboutBarParallaxFactor);
  };

  const animateParallax = () => {
    const diff = targetY - currentY;
    currentY += diff * 0.12;

    aboutBarImg.style.transform = `translateY(${currentY.toFixed(2)}px) scale(1.13)`;

    if (Math.abs(diff) > 0.08) {
      rafId = window.requestAnimationFrame(animateParallax);
    } else {
      currentY = targetY;
      aboutBarImg.style.transform = `translateY(${currentY.toFixed(2)}px) scale(1.13)`;
      rafId = null;
    }
  };

  const requestParallaxUpdate = () => {
    targetY = computeTargetParallaxY();
    if (!rafId) rafId = window.requestAnimationFrame(animateParallax);
  };

  window.addEventListener("scroll", requestParallaxUpdate, { passive: true });
  window.addEventListener("resize", requestParallaxUpdate);
  requestParallaxUpdate();
}

if (contactSection && contactEmailPanel) {
  let panelTicking = false;

  const updateEmailPanelScroll = () => {
    const rect = contactSection.getBoundingClientRect();
    const startY = window.innerHeight * 0.9;
    const progress = Math.min(1, Math.max(0, (startY - rect.top) / Math.max(rect.height, 1)));
    const travel = 220; // how far the email panel glides upward over the image
    const offsetY = -travel * progress;

    contactEmailPanel.style.transform = `translateY(${offsetY.toFixed(2)}px)`;
    panelTicking = false;
  };

  const requestEmailPanelUpdate = () => {
    if (!panelTicking) {
      panelTicking = true;
      window.requestAnimationFrame(updateEmailPanelScroll);
    }
  };

  window.addEventListener("scroll", requestEmailPanelUpdate, { passive: true });
  window.addEventListener("resize", requestEmailPanelUpdate);
  requestEmailPanelUpdate();
}

if (contactEmailPanelScroll && contactEmailToggle) {
  contactEmailToggle.addEventListener("click", () => {
    const nextOpen = !contactEmailPanelScroll.classList.contains("is-open");
    contactEmailPanelScroll.classList.toggle("is-open", nextOpen);
    contactEmailToggle.setAttribute("aria-expanded", String(nextOpen));
  });
}

const resumeSheet = document.querySelector(".contact__resume-sheet");
const resumeCanvas = document.querySelector(".contact__resume-canvas");
const resumeDownload = document.querySelector(".contact__resume-download");
if (resumeSheet && resumeCanvas) {
  const panResumeCanvasWithWheel = (e) => {
    const canScrollX = resumeCanvas.scrollWidth > resumeCanvas.clientWidth + 1;
    const canScrollY = resumeCanvas.scrollHeight > resumeCanvas.clientHeight + 1;
    if (!canScrollX && !canScrollY) return;
    const maxX = Math.max(0, resumeCanvas.scrollWidth - resumeCanvas.clientWidth);
    const prevX = resumeCanvas.scrollLeft;
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    const verticalOrMixedIntent = absY > absX * 0.7;

    // Let browser handle vertical (and mixed) scrolling natively for smoother
    // chaining from resume panel into full-page scroll near top/bottom.
    if (verticalOrMixedIntent) return;

    let consumed = false;
    const horizontalIntent = absX > absY * 1.1;

    if (canScrollX && absX > 0.01 && horizontalIntent) {
      const nextX = Math.min(maxX, Math.max(0, prevX + e.deltaX * 1.15));
      if (nextX !== prevX) {
        resumeCanvas.scrollLeft = nextX;
        consumed = true;
      }
    }

    // Only trap scrolling when resume panel actually consumed movement.
    // At top/bottom bounds, let the page continue scrolling naturally.
    if (consumed) e.preventDefault();
  };

  resumeCanvas.addEventListener(
    "wheel",
    panResumeCanvasWithWheel,
    { passive: false }
  );

  resumeSheet.addEventListener(
    "wheel",
    panResumeCanvasWithWheel,
    { passive: false }
  );

  if (resumeDownload) {
    const syncResumeDownloadVisibility = () => {
      const canScrollY = resumeCanvas.scrollHeight > resumeCanvas.clientHeight + 4;
      const maxY = Math.max(0, resumeCanvas.scrollHeight - resumeCanvas.clientHeight);
      const atBottom = maxY > 0 && resumeCanvas.scrollTop >= maxY - 2;
      const shouldShow = canScrollY && atBottom;
      resumeDownload.classList.toggle("is-visible", shouldShow);
    };

    resumeCanvas.addEventListener("scroll", syncResumeDownloadVisibility, { passive: true });
    window.addEventListener("resize", syncResumeDownloadVisibility);
    syncResumeDownloadVisibility();
  }
}

const resumeToggle = document.querySelector(".contact__resume-toggle");
const preRectContainer = document.querySelector(".contact__pre-rect");
const splitRightPortfolioLink = document.querySelector(".contact__split-right-title-link");

if (resumeToggle && preRectContainer) {
  resumeToggle.addEventListener("click", () => {
    const wasHidden = preRectContainer.classList.contains("resume-hidden");
    const hidden = !wasHidden;
    if (hidden) {
      applyQuickHideDuration(preRectContainer);
      startResumeHideSyncWindow(preRectContainer);
    } else {
      applyAdaptiveToggleDuration(preRectContainer);
      clearResumeHideSyncWindow(preRectContainer);
    }
    triggerFocalShift(preRectContainer);
    preRectContainer.classList.toggle("resume-hidden", hidden);
    preRectContainer.dataset.oliveCycleStep = hidden ? "1" : "0";
    resumeToggle.textContent = hidden ? "›" : "‹";
    resumeToggle.setAttribute("aria-expanded", String(!hidden));
    resumeToggle.setAttribute("aria-label", hidden ? "Show resume" : "Hide resume");
  });
}

const ensureResumeIsOpen = () => {
  // Always open via the same olive-bar control path so transition rules remain consistent.
  if (isPreRectCollapsedOrClosing()) {
    if (preRectClose) preRectClose.click();
    return;
  }

  // If already open, ensure left resume panel is visible.
  if (preRectContainer && preRectContainer.classList.contains("resume-hidden")) {
    preRectContainer.classList.remove("resume-hidden");
  }
  if (resumeToggle) {
    resumeToggle.textContent = "‹";
    resumeToggle.setAttribute("aria-expanded", "true");
    resumeToggle.setAttribute("aria-label", "Hide resume");
  }
};

const scrollContactToTopThen = (onDone) => {
  if (!contactSection) {
    onDone();
    return;
  }

  const navHeight = topbar ? topbar.offsetHeight || 0 : 0;
  const targetY = Math.max(
    0,
    window.scrollY + contactSection.getBoundingClientRect().top - navHeight
  );
  const distance = Math.abs(window.scrollY - targetY);

  if (distance < 2) {
    onDone();
    return;
  }

  let finished = false;
  let fallbackTimer = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    window.removeEventListener("scroll", syncOnScroll);
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    onDone();
  };

  const syncOnScroll = () => {
    if (Math.abs(window.scrollY - targetY) <= 2) finish();
  };

  window.addEventListener("scroll", syncOnScroll, { passive: true });

  const estimateMs = Math.min(1300, Math.max(420, Math.round(distance * 0.65)));
  fallbackTimer = window.setTimeout(finish, estimateMs + 180);

  window.scrollTo({ top: targetY, behavior: "smooth" });
};

if (topbarResumeLink) {
  topbarResumeLink.addEventListener("click", (e) => {
    e.preventDefault();
    scrollContactToTopThen(() => {
      if (window.location.hash !== "#contact") {
        window.history.replaceState(null, "", "#contact");
      }
      ensureResumeIsOpen();
    });
  });
}

if (splitRightPortfolioLink) {
  splitRightPortfolioLink.addEventListener("click", (e) => {
    const canUseLocalCollectionToggle = !!(viewPortfolioToggle && collectionSection);
    if (!canUseLocalCollectionToggle) return;
    e.preventDefault();
    if (viewPortfolioToggle) {
      viewPortfolioToggle.click();
    }
    sessionSet("valerieweb.collectionMode", "mode-portfolio");
    if (window.location.hash !== "#collection") {
      window.location.hash = "collection";
    } else if (collectionSection) {
      collectionSection.scrollIntoView({ behavior: "auto", block: "start" });
    }
  });
}

const heroFollowImage = document.querySelector(".hero-follow-image");
if (heroFollowImage) {
  const POST_HERO_REVEAL_STAGGER_MS = 155;
  let postHeroRevealStarted = false;

  const gatherPostHeroRevealTargets = () => {
    const out = [];
    if (!document.body.classList.contains("page-home")) return out;
    const heroSplit = document.querySelector("body.page-home > section.split:first-of-type");
    if (!heroSplit) return out;
    for (let el = heroSplit.nextElementSibling; el; el = el.nextElementSibling) {
      if (el.matches("nav#navOverlay, nav.nav-overlay")) continue;
      if (el.matches("section.hero-follow-image")) {
        Array.prototype.forEach.call(el.children, (node) => out.push(node));
        continue;
      }
      if (el.matches("section, footer")) out.push(el);
    }
    return out;
  };

  const startPostHeroRevealSequence = () => {
    if (postHeroRevealStarted) return;
    postHeroRevealStarted = true;
    const targets = gatherPostHeroRevealTargets();
    if (!targets.length) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      targets.forEach((node) => {
        node.classList.add("post-hero-reveal", "is-post-hero-visible");
      });
      return;
    }
    targets.forEach((node) => {
      node.classList.add("post-hero-reveal");
    });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        targets.forEach((node, i) => {
          window.setTimeout(() => {
            node.classList.add("is-post-hero-visible");
          }, i * POST_HERO_REVEAL_STAGGER_MS);
        });
      });
    });
  };

  const revealHeroFollowImage = () => {
    heroFollowImage.classList.add("is-visible");
    startPostHeroRevealSequence();
  };

  if ("IntersectionObserver" in window) {
    const heroFollowObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealHeroFollowImage();
          heroFollowObserver.disconnect();
        });
      },
      {
        threshold: 0.22,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    heroFollowObserver.observe(heroFollowImage);
  } else {
    revealHeroFollowImage();
  }
}

/** Rug contact form: opens default mail app (e.g. Outlook) with a prefilled message via mailto: */
const contactRugForm = document.getElementById("contact-rug-form");
const CONTACT_RUG_MAILTO = "gonzalez@alumni.cooper.edu";
if (contactRugForm) {
  contactRugForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(contactRugForm);
    const first = String(fd.get("first_name") || "").trim();
    const last = String(fd.get("last_name") || "").trim();
    const company = String(fd.get("company") || "").trim();
    const visitorEmail = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const message = String(fd.get("message") || "").trim();

    if (!visitorEmail) {
      window.alert("Please enter your email address.");
      contactRugForm.querySelector('input[name="email"]')?.focus();
      return;
    }

    const nameBit = [first, last].filter(Boolean).join(" ");
    const subject = nameBit
      ? `Website inquiry — ${nameBit}`
      : "Website inquiry";
    const parts = [];
    if (first) parts.push(`First name: ${first}`);
    if (last) parts.push(`Last name: ${last}`);
    if (company) parts.push(`Company: ${company}`);
    parts.push(`Email: ${visitorEmail}`);
    if (phone) parts.push(`Phone: ${phone}`);
    parts.push("", "Message:", message || "(none)");
    const body = parts.join("\n");

    const MAX_MAILTO = 1900;
    let safeBody = body;
    if (safeBody.length > MAX_MAILTO) {
      safeBody = `${safeBody.slice(0, MAX_MAILTO)}\n…`;
      window.alert(
        "Your message was shortened to fit email apps; send another mail if you need to include more."
      );
    }

    const mailto = `mailto:${CONTACT_RUG_MAILTO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(safeBody)}`;
    window.location.href = mailto;
  });
}
