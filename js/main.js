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

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/** Home hero: floating title layout runs before nav reads geometry (same scroll frame). */
let syncFloatingTitleImmediate = null;

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
  /* Consistent cadence: advance one slot every 4 seconds. */
  const AUTO_STEP_MS = 4000;
  /** Keep perceived speed consistent across viewport sizes (slot width changes with layout). */
  const BASELINE_SLOT_STEP_PX = 300;
  const getDurationForStep = (baseDurationMs, stepPx) => {
    const safeStep = Math.max(1, stepPx || BASELINE_SLOT_STEP_PX);
    const scaled = baseDurationMs * (safeStep / BASELINE_SLOT_STEP_PX);
    return clamp(Math.round(scaled), 760, 1550);
  };
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
      window.clearTimeout(autoStepTimer);
      autoStepTimer = null;
    }
    if (heroSquarePointerOverImages) return;
    autoStepTimer = window.setTimeout(function tickAutoStep() {
      autoStepTimer = null;
      autoStepOnce();
      if (!heroSquarePointerOverImages) {
        autoStepTimer = window.setTimeout(tickAutoStep, AUTO_STEP_MS);
      }
    }, AUTO_STEP_MS);
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
    const durationMs = getDurationForStep(MANUAL_SLIDE_DURATION_MS, step);
    const started = animateBy(direction * step, durationMs, easeInOutQuart);
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
    if (smoothRaf) {
      window.cancelAnimationFrame(smoothRaf);
      smoothRaf = null;
      heroSquareAnimating = false;
    }
    applySixAcrossWithHalfCutEnds();
    void heroSquareViewport.offsetWidth;
    currentX = snapToNearestSlot(heroSquareViewport.scrollLeft);
    targetX = currentX;
    heroSquareViewport.scrollLeft = currentX;
    syncArrowState();
    restartAutoStepTimer();
  });

  window.addEventListener("pagehide", () => {
    if (smoothRaf) {
      window.cancelAnimationFrame(smoothRaf);
      smoothRaf = null;
    }
    heroSquareAnimating = false;
    syncArrowState();
    if (autoStepTimer) {
      window.clearTimeout(autoStepTimer);
      autoStepTimer = null;
    }
  });

  const autoStepOnce = () => {
    if (document.hidden) return;
    const step = getStep();
    if (step <= 1) return;
    // Auto-step: same easing family; duration set by AUTO_SLIDE_DURATION_MS.
    const durationMs = getDurationForStep(AUTO_SLIDE_DURATION_MS, step);
    animateBy(step, durationMs);
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

  restartAutoStepTimer();

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
const ENABLE_HERO_TITLE_SCROLL_ANIMATION = true;
const HERO_TEXT_DARK_PROGRESS = 0.9;
const HERO_NAV_EXTRA_SCROLL_PX = 20;

/* Nav RAF runs after floating-title layout so thresholds use the live floating clone rect.
 * Scroll coalescing: cancel prior RAF and reschedule so rapid wheel/trackpad input always
 * applies one sync per paint with the latest scroll position (consistent at any speed). */
if (topbar && mainHeroSplit) {
  let heroNavRafId = null;
  let lastScrollY = window.scrollY || window.pageYOffset || 0;
  let prevHasPassedHero = topbar.classList.contains("is-solid");
  let topbarSpringTimer = null;
  let heroFoucPendingCleared = false;
  /** Center-band hysteresis: wider exit band reduces slow-scroll flicker near threshold. */
  const LINK_BAND_ENTER_SLACK_PX = -1;
  const LINK_BAND_EXIT_SLACK_PX = 34;
  /** Prevent rapid oscillation at the threshold during very slow wheel/trackpad movement. */
  const NAV_STATE_FLIP_COOLDOWN_MS = 180;
  /** Flip only after the requested state stays stable for a short hold window. */
  const NAV_FLIP_CONFIRM_MS = 110;
  let navStateLastFlipTs = 0;
  let pendingFlipState = prevHasPassedHero;
  let pendingFlipSince = 0;
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
    const navHeight = topbar.offsetHeight || 0;
    const heroRect = mainHeroSplit.getBoundingClientRect();
    const HERO_NAV_ENTER_SOLID_OFFSET_UP_PX = -52;
    const HERO_NAV_ENTER_SOLID_OFFSET_DOWN_PX = -14;
    const HERO_NAV_EXIT_SOLID_OFFSET_UP_PX = 16;
    const HERO_NAV_EXIT_SOLID_OFFSET_DOWN_PX = 22;
    let hasPassedHero = prevHasPassedHero;
    /** True when the name has cleared the nav link band again (hero overlap) — kills sticky solid + spring lock. */
    let titleBackInHero = false;
    /* Solid nav when the midpoint of the name reaches the midpoint of the nav-link row. */
    const titleForAlign = heroTitle;
    /* Full About | Contact | Resume row — same vertical band you align to when scrolling. */
    const navRightRow = topbar.querySelector(".topbar__nav-right");

    if (titleForAlign && navRightRow) {
      const titleRect = titleForAlign.getBoundingClientRect();
      const rowRect = navRightRow.getBoundingClientRect();
      const titleCenterY = titleRect.top + titleRect.height * 0.5;
      const rowCenterY = rowRect.top + rowRect.height * 0.5;
      if (prevHasPassedHero) {
        hasPassedHero = titleCenterY <= rowCenterY + LINK_BAND_EXIT_SLACK_PX;
      } else {
        hasPassedHero = titleCenterY <= rowCenterY + LINK_BAND_ENTER_SLACK_PX;
      }
      titleBackInHero = titleCenterY > rowCenterY + LINK_BAND_EXIT_SLACK_PX;
    }

    // If title is back in hero band, always unsolid.
    if (titleBackInHero) {
      hasPassedHero = false;
    }

    const requestedFlip = hasPassedHero !== prevHasPassedHero;
    if (requestedFlip) {
      const nowTs = performance.now();
      if (hasPassedHero !== pendingFlipState) {
        pendingFlipState = hasPassedHero;
        pendingFlipSince = nowTs;
        hasPassedHero = prevHasPassedHero;
      } else if (nowTs - pendingFlipSince < NAV_FLIP_CONFIRM_MS) {
        hasPassedHero = prevHasPassedHero;
      } else if (nowTs - navStateLastFlipTs < NAV_STATE_FLIP_COOLDOWN_MS) {
        hasPassedHero = prevHasPassedHero;
      } else {
        navStateLastFlipTs = nowTs;
      }
    } else {
      pendingFlipState = prevHasPassedHero;
      pendingFlipSince = 0;
    }

    if (hasPassedHero !== prevHasPassedHero) {
      if (topbarSpringTimer) {
        window.clearTimeout(topbarSpringTimer);
        topbarSpringTimer = null;
      }
      const navMeas = topbar.offsetHeight || 70;
      const SHEET_MIN_TRAVEL_ABOVE_NAV_PX = 30;
      if (hasPassedHero) {
        const sheetStartPx = Math.max(
          Math.round(heroRect.top + 6),
          navMeas + SHEET_MIN_TRAVEL_ABOVE_NAV_PX
        );
        document.documentElement.style.setProperty(
          "--topbar-spring-start-height",
          `${sheetStartPx}px`
        );
        document.documentElement.style.removeProperty("--topbar-collapse-from-height");
        document.body.classList.remove(springOutClass);
        document.body.classList.add(springInClass);
        topbarSpringTimer = window.setTimeout(() => {
          document.body.classList.remove(springInClass);
          topbarSpringTimer = null;
        }, 500);
      } else {
        const collapseFromPx = Math.max(
          Math.round(heroRect.bottom - 52),
          navMeas + SHEET_MIN_TRAVEL_ABOVE_NAV_PX
        );
        document.documentElement.style.setProperty(
          "--topbar-collapse-from-height",
          `${collapseFromPx}px`
        );
        document.documentElement.style.removeProperty("--topbar-spring-start-height");
        document.body.classList.remove(springInClass);
        document.body.classList.add(springOutClass);
        topbarSpringTimer = window.setTimeout(() => {
          document.body.classList.remove(springOutClass);
          topbarSpringTimer = null;
        }, 240);
      }
    }

    topbar.classList.toggle("is-solid", hasPassedHero);

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

if (topbar && mainHeroSplit && heroTitle && ENABLE_HERO_TITLE_SCROLL_ANIMATION) {
  const heroTitleLink = heroTitle.querySelector(".text-block__title-home");

  if (heroTitleLink) {
    // Ensure only one floating clone ever drives nav/title motion.
    document.querySelectorAll(".hero-title-float").forEach((node) => node.remove());
    const floatingTitle = document.createElement("a");
    floatingTitle.className = "hero-title-float";
    /* Nav-bar clone: main homepage (matches index hero home link). */
    const mainHome = new URL("index.html", window.location.href);
    mainHome.hash = "#home";
    floatingTitle.href = mainHome.href;
    floatingTitle.innerHTML = heroTitleLink.innerHTML;
    floatingTitle.setAttribute("aria-label", "Go to main page");
    floatingTitle.style.opacity = "1";
    floatingTitle.style.visibility = "visible";
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
    /** Target docked font size for Valerie text (pt). */
    const HERO_DOCK_TARGET_FONT_PT = 25;
    /** Start from the current hero placement and keep that gap while scaling toward nav dock. */
    const HERO_TITLE_BOTTOM_GAP_START_PX = 20;
    const HERO_TITLE_BOTTOM_GAP_END_PX = 20;
    /** Lower value keeps title larger for longer, closer to reference motion. */
    const HERO_TITLE_SCALE_SCROLL_STEEPNESS = 0.65;
    /** Home nav collapse/lift should be quick and scroll-driven (not timer-driven). */
    const HERO_NAV_SCROLL_COLLAPSE_START = 0.68;
    const HERO_NAV_SCROLL_COLLAPSE_WINDOW = 0.26;
    /** Fine tune docked title vertical position in navbar (positive moves down). */
    const HERO_DOCK_Y_OFFSET_PX = 0;
    /** Maximum allowed lift above periwinkle section bottom before docking. */
    const HERO_MAX_EDGE_LIFT_PX = 20;
    const CSS_PT_TO_PX = 96 / 72;
    /** Delayed scale response for Valerie (no bounce/overshoot). */
    const TITLE_SCALE_LAG = 0.24;
    /** Subtle per-frame scale smoothing while keeping Y fully scroll-driven. */
    const TITLE_SCALE_BLEND = 0.4;
    /** Reduce baseline compensation strength so scale ease does less vertical travel. */
    const TITLE_Y_SCALE_COMPENSATION_FACTOR = 0.35;
    const TITLE_SPRING_SETTLE_Y = 0.08;
    const TITLE_SPRING_SETTLE_SCALE = 0.0008;
    /** Start docking earlier to avoid a visible pause before nav entry. */
    const HERO_DOCK_BLEND_START = 0.52;
    /** Blend band around dock stop to eliminate any remaining handoff jolt. */
    const HERO_DOCK_TRANSITION_BAND_PX = 26;
    let springRaf = 0;
    let springLastTs = 0;
    let springInit = false;
    let springTargetY = 0;
    let springTargetScaleX = 1;
    let springTargetScaleY = 1;
    let springY = 0;
    let springScaleX = 1;
    let springScaleY = 1;
    let springYVel = 0;
    let springScaleXVel = 0;
    let springScaleYVel = 0;
    let sourceRectHeight = 0;
    let whiteNavActiveForColor = false;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const applyFloatingTransform = (y, sx, sy) => {
      floatingTitle.style.transform = `translate3d(-50%, ${y.toFixed(2)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    };
    const clampTopToPeriwinkleEdge = (y, renderedScaleY) => {
      const heroRectLive = mainHeroSplit.getBoundingClientRect();
      const baseHeight =
        sourceRectHeight > 0 ? sourceRectHeight : heroTitle.getBoundingClientRect().height || 0;
      const boundaryTop =
        heroRectLive.bottom - HERO_MAX_EDGE_LIFT_PX - baseHeight * renderedScaleY;
      // Hard boundary: keep the title bottom at or above 20px from the hero bottom edge.
      return Math.min(y, boundaryTop);
    };
    const updateFloatingTitleColor = () => {
      const navRect = topbar.getBoundingClientRect();
      const titleRect = floatingTitle.getBoundingClientRect();
      const overlapsNav =
        titleRect.bottom > navRect.top &&
        titleRect.top < navRect.bottom &&
        titleRect.right > navRect.left &&
        titleRect.left < navRect.right;
      const forceDark = whiteNavActiveForColor && overlapsNav;
      floatingTitle.classList.toggle("is-dark", forceDark);
      // Strict color override rule: black only when in front of visible white nav, white otherwise.
      floatingTitle.style.setProperty(
        "color",
        forceDark ? "#1c1b18" : "#ffffff",
        "important"
      );
      floatingTitle.classList.remove("is-hidden");
    };
    const runSpringFrame = (ts) => {
      if (!springInit) {
        springInit = true;
        springY = springTargetY;
        springScaleX = springTargetScaleX;
        springScaleY = springTargetScaleY;
        springYVel = 0;
        springScaleXVel = 0;
        springScaleYVel = 0;
      }
      const dtScale = clamp((ts - (springLastTs || ts)) / 16.67, 0.5, 2.5);
      springLastTs = ts;
      const lag = 1 - Math.pow(1 - TITLE_SCALE_LAG, dtScale);
      // No bounce: ease scale only, while keeping vertical baseline fixed.
      springScaleX += (springTargetScaleX - springScaleX) * lag;
      springScaleY += (springTargetScaleY - springScaleY) * lag;
      const baseHeight =
        sourceRectHeight > 0 ? sourceRectHeight : heroTitle.getBoundingClientRect().height || 0;
      const yScaleCompensation =
        baseHeight *
        (springTargetScaleY - springScaleY) *
        TITLE_Y_SCALE_COMPENSATION_FACTOR;
      springY = springTargetY + yScaleCompensation;
      springY = clampTopToPeriwinkleEdge(springY, springScaleY);
      springYVel = 0;
      springScaleXVel = 0;
      springScaleYVel = 0;

      applyFloatingTransform(springY, springScaleX, springScaleY);
      updateFloatingTitleColor();

      const settled =
        Math.abs(springTargetY - springY) <= TITLE_SPRING_SETTLE_Y &&
        Math.abs(springTargetScaleX - springScaleX) <= TITLE_SPRING_SETTLE_SCALE &&
        Math.abs(springTargetScaleY - springScaleY) <= TITLE_SPRING_SETTLE_SCALE;
      if (settled) {
        springY = clampTopToPeriwinkleEdge(springTargetY, springTargetScaleY);
        springScaleX = springTargetScaleX;
        springScaleY = springTargetScaleY;
        springYVel = 0;
        springScaleXVel = 0;
        springScaleYVel = 0;
        applyFloatingTransform(springY, springScaleX, springScaleY);
        updateFloatingTitleColor();
        springRaf = 0;
        springLastTs = 0;
        return;
      }
      springRaf = window.requestAnimationFrame(runSpringFrame);
    };

    const measure = () => {
      floatingTitle.style.visibility = "visible";
      floatingTitle.style.transform = "translate3d(-50%, 0px, 0) scale(1)";

      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const sourceRect = heroTitle.getBoundingClientRect();
      const navRect = topbar.getBoundingClientRect();
      const targetDockFontPx = HERO_DOCK_TARGET_FONT_PT * CSS_PT_TO_PX;
      const sourceFontPx = parseFloat(getComputedStyle(heroTitleLink).fontSize) || targetDockFontPx;
      endScale = clamp(targetDockFontPx / sourceFontPx, 0.08, 0.4);
      startTop = sourceRect.top;
      sourceAbsTop = sourceRect.top + currentScrollY;
      sourceRectHeight = sourceRect.height;
      {
        // Dock to the fixed nav-bar center to keep hero text independent from link collapse.
        const navCenterY = navRect.top + navRect.height * 0.5;
        const heroBottomAbs = mainHeroSplit.getBoundingClientRect().bottom + currentScrollY;
        const endScaleY = endScale * verticalStretch;
        // Solve endpoint scroll so shrink completes when title center aligns with nav-link-row center.
        const endpointScrollY =
          heroBottomAbs -
          HERO_TITLE_BOTTOM_GAP_END_PX -
          sourceRect.height * endScaleY * 0.5 +
          HERO_DOCK_Y_OFFSET_PX -
          navCenterY;
        dockTop =
          navCenterY -
          sourceRect.height * endScaleY * 0.5;
        dockScrollY = Math.max(1, endpointScrollY);
      }
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
      const scalePLinear = clamp(currentScrollY / dockScrollY, 0, 1);
      const scaleP =
        1 -
        Math.pow(
          1 - scalePLinear,
          HERO_TITLE_SCALE_SCROLL_STEEPNESS
        );
      const navLiftLinear = clamp(
        (scaleP - HERO_NAV_SCROLL_COLLAPSE_START) / HERO_NAV_SCROLL_COLLAPSE_WINDOW,
        0,
        1
      );
      const navLiftProgress = 1 - Math.pow(1 - navLiftLinear, 1.9);
      // Separate easing just for size interpolation so scaling feels smoother.
      const scaleEase = scaleP * scaleP * (3 - 2 * scaleP);
      const gapEase = scaleP;
      const targetHeroBottomGap =
        HERO_TITLE_BOTTOM_GAP_START_PX +
        (HERO_TITLE_BOTTOM_GAP_END_PX - HERO_TITLE_BOTTOM_GAP_START_PX) * gapEase;
      heroTitle.style.setProperty(
        "--hero-title-bottom-lift",
        `${(targetHeroBottomGap - HERO_TITLE_BOTTOM_GAP_START_PX).toFixed(2)}px`
      );
      const isSolidNow = topbar.classList.contains("is-solid");
      // Keep collapse progress fully scroll-driven for smooth, continuous transitions.
      const effectiveNavCollapseProgress = navLiftProgress;
      const effectiveNavLiftProgress = effectiveNavCollapseProgress;
      const whiteNavVisibleNow = isSolidNow || effectiveNavCollapseProgress > 0.001;
      whiteNavActiveForColor = whiteNavVisibleNow;
      const scale = 1 + (endScale - 1) * scaleEase;
      const scaleX = scale * horizontalSquish;
      const scaleY = scale * verticalStretch;
      const heroRect = mainHeroSplit.getBoundingClientRect();

      const heroAnchoredTop =
        heroRect.bottom - targetHeroBottomGap - sourceRect.height * scaleY;
      /* Dock to fixed nav-bar center so title is independent from nav-link collapse motion. */
      const navDockCenterY = navRect.top + navRect.height * 0.5;
      const dockTopLive =
        navDockCenterY -
        (sourceRect.height * scaleY) * 0.5;
      // Never let enlarged Valerie leave the periwinkle section.
      const boundaryTop =
        heroRect.bottom - HERO_MAX_EDGE_LIFT_PX - sourceRect.height * scaleY;
      const constrainedHeroTop = Math.min(heroAnchoredTop, boundaryTop);
      const dockBlendLinear = clamp(
        (scaleP - HERO_DOCK_BLEND_START) / (1 - HERO_DOCK_BLEND_START),
        0,
        1
      );
      const dockBlend = dockBlendLinear * dockBlendLinear * (3 - 2 * dockBlendLinear);
      const blendedTop =
        constrainedHeroTop + (dockTopLive - constrainedHeroTop) * dockBlend;
      const y = blendedTop + HERO_DOCK_Y_OFFSET_PX;
      const clampedToHeroBoundary = clampTopToPeriwinkleEdge(y, scaleY);
      // Release the hero-edge clamp as we approach nav to prevent a "hold" before docking.
      const boundaryReleaseLinear = clamp((scaleP - 0.56) / 0.34, 0, 1);
      const boundaryRelease =
        boundaryReleaseLinear * boundaryReleaseLinear * (3 - 2 * boundaryReleaseLinear);
      const heroBoundaryY =
        clampedToHeroBoundary + (y - clampedToHeroBoundary) * boundaryRelease;
      const dockStopY = dockTopLive + HERO_DOCK_Y_OFFSET_PX;
      // Continuous transition around dock stop (no branch snap) for seamless motion.
      const d = dockStopY - heroBoundaryY;
      const band = HERO_DOCK_TRANSITION_BAND_PX;
      const t = clamp((d + band) / (2 * band), 0, 1);
      const smooth = t * t * (3 - 2 * t);
      const clampedY = heroBoundaryY + (dockStopY - heroBoundaryY) * smooth;

      springTargetY = clampedY;
      springTargetScaleX = scaleX;
      springTargetScaleY = scaleY;
      // Single-path motion: apply directly from scroll-driven targets to avoid choppy dual-layer lag.
      if (springRaf) {
        window.cancelAnimationFrame(springRaf);
        springRaf = 0;
        springLastTs = 0;
      }
      springInit = true;
      springY = clampedY;
      if (!Number.isFinite(springScaleX) || !Number.isFinite(springScaleY)) {
        springScaleX = springTargetScaleX;
        springScaleY = springTargetScaleY;
      } else {
        springScaleX += (springTargetScaleX - springScaleX) * TITLE_SCALE_BLEND;
        springScaleY += (springTargetScaleY - springScaleY) * TITLE_SCALE_BLEND;
        if (Math.abs(springTargetScaleX - springScaleX) < TITLE_SPRING_SETTLE_SCALE) {
          springScaleX = springTargetScaleX;
        }
        if (Math.abs(springTargetScaleY - springScaleY) < TITLE_SPRING_SETTLE_SCALE) {
          springScaleY = springTargetScaleY;
        }
      }
      applyFloatingTransform(springY, springScaleX, springScaleY);
      floatingTitle.style.visibility = "visible";
      floatingTitle.style.opacity = "1";
      floatingTitle.classList.add("is-layout-ready");
      document.body.classList.add("hero-float-ready");
      floatingTitle.style.removeProperty("opacity");
      floatingTitle.style.removeProperty("visibility");

      topbar.style.setProperty(
        "--hero-nav-collapse-progress",
        effectiveNavCollapseProgress.toFixed(4)
      );
      topbar.style.setProperty(
        "--hero-nav-lift-progress",
        effectiveNavLiftProgress.toFixed(4)
      );
      updateFloatingTitleColor();
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

const collectionRectGroups = Array.from(
  document.querySelectorAll(
    ".hero-traditional-layout .hero-square-carousel__kees-rects, .hero-square-carousel-collections .hero-square-carousel__kees-rects"
  )
);

if (collectionRectGroups.length) {
  let ticking = false;
  let offsets = collectionRectGroups.map(() => 0);
  const maxTravelPx = 54;

  const groupFactor = (i) => {
    const base = 0.67 + (i % 4) * 0.06;
    return Math.min(0.9, base);
  };

  const update = () => {
    const viewportCenter = window.innerHeight * 0.5;
    let stillMoving = false;

    offsets = offsets.map((current, i) => {
      const groupRect = collectionRectGroups[i].getBoundingClientRect();
      const groupCenter = groupRect.top + groupRect.height * 0.5;
      const delta = viewportCenter - groupCenter;
      const target = Math.max(
        -maxTravelPx,
        Math.min(maxTravelPx, delta * (1 - groupFactor(i)))
      );
      const next = current + (target - current) * 0.11;
      if (Math.abs(target - next) > 0.08) stillMoving = true;
      return next;
    });

    collectionRectGroups.forEach((group, i) => {
      group.style.transform = `translate3d(0, ${offsets[i].toFixed(2)}px, 0)`;
    });

    if (stillMoving) {
      window.requestAnimationFrame(update);
    } else {
      ticking = false;
    }
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  requestUpdate();
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
