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

const navEntry =
  (typeof performance !== "undefined" &&
    typeof performance.getEntriesByType === "function" &&
    performance.getEntriesByType("navigation") &&
    performance.getEntriesByType("navigation")[0]) ||
  null;
const isRefreshLikeLoad = !!(
  navEntry &&
  (navEntry.type === "reload" || navEntry.type === "back_forward")
);
try {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
} catch (_err) {
  // Some embedded/privacy contexts can block history access.
}

const scrollToTopWithoutMotion = () => {
  const root = document.documentElement;
  const body = document.body;
  const previousRootScrollBehavior = root.style.scrollBehavior;
  const previousBodyScrollBehavior = body ? body.style.scrollBehavior : "";

  root.style.scrollBehavior = "auto";
  if (body) body.style.scrollBehavior = "auto";
  root.scrollTop = 0;
  if (body) body.scrollTop = 0;
  window.scrollTo({ left: 0, top: 0, behavior: "auto" });

  root.style.scrollBehavior = previousRootScrollBehavior;
  if (body) body.style.scrollBehavior = previousBodyScrollBehavior;
};

if (isRefreshLikeLoad) {
  scrollToTopWithoutMotion();
  window.addEventListener("pageshow", scrollToTopWithoutMotion);
  window.addEventListener("load", scrollToTopWithoutMotion, { once: true });
  window.setTimeout(scrollToTopWithoutMotion, 0);
  window.setTimeout(scrollToTopWithoutMotion, 120);
  window.setTimeout(scrollToTopWithoutMotion, 500);
}

if (isRefreshLikeLoad) {
  document.body.classList.add("refresh-no-anim");
  if (document.body.classList.contains("page-home")) {
    document.body.classList.add("refresh-black-fade");
    window.setTimeout(() => {
      document.body.classList.remove("refresh-black-fade");
    }, 1600);
  }
}
const clearHeroFoucPending = () => {
  document.documentElement.classList.remove("hero-fouc-pending");
};
const dispatchHomeRefreshSync = () => {
  window.dispatchEvent(new Event("home-refresh-sync"));
};
let refreshSyncRafA = 0;
let refreshSyncRafB = 0;
let refreshSyncTimer = 0;
let refreshSyncLateTimer = 0;
const runHomeRefreshSync = () => {
  // Debounced refresh sync: one clean pass sequence, even if multiple lifecycle events fire.
  if (refreshSyncRafA) window.cancelAnimationFrame(refreshSyncRafA);
  if (refreshSyncRafB) window.cancelAnimationFrame(refreshSyncRafB);
  if (refreshSyncTimer) {
    window.clearTimeout(refreshSyncTimer);
    refreshSyncTimer = 0;
  }
  if (refreshSyncLateTimer) {
    window.clearTimeout(refreshSyncLateTimer);
    refreshSyncLateTimer = 0;
  }
  refreshSyncRafA = window.requestAnimationFrame(() => {
    refreshSyncRafA = 0;
    refreshSyncRafB = window.requestAnimationFrame(() => {
      refreshSyncRafB = 0;
      dispatchHomeRefreshSync();
    });
  });
  refreshSyncTimer = window.setTimeout(() => {
    refreshSyncTimer = 0;
    dispatchHomeRefreshSync();
  }, 180);
  // Late pass catches browsers that restore scroll position after load/pageshow callbacks.
  refreshSyncLateTimer = window.setTimeout(() => {
    refreshSyncLateTimer = 0;
    dispatchHomeRefreshSync();
  }, 700);
};
// Do NOT clear hero-fouc-pending here; it must stay until first measured sync
// to avoid flashing an oversized/undocked Valerie title on refresh.
window.addEventListener(
  "load",
  () => {
    runHomeRefreshSync();
  },
  { once: true }
);
window.addEventListener("pageshow", () => {
  runHomeRefreshSync();
});
// One post-bootstrap sync after all listeners are attached.
window.setTimeout(runHomeRefreshSync, 0);

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

const TRADITIONAL_ROUTE_FADE_KEY = "valerieweb.routeFadeTraditional";
const ROUTE_FADE_MS = 1000;

const isPrimaryUnmodifiedClick = (event) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

const startTraditionalEntryFade = () => {
  if (!document.body.classList.contains("page-traditional")) return;
  if (sessionGet(TRADITIONAL_ROUTE_FADE_KEY) !== "1") return;
  sessionRemove(TRADITIONAL_ROUTE_FADE_KEY);
  document.body.classList.add("route-fade-enter");
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.body.classList.add("route-fade-enter-active");
    });
  });
  window.setTimeout(() => {
    document.body.classList.remove("route-fade-enter", "route-fade-enter-active");
  }, ROUTE_FADE_MS + 120);
};

const startTraditionalBodyCopyWaterfall = () => {
  if (!document.body.classList.contains("page-traditional")) return;
  const bodyCopy = document.querySelector(
    ".traditional-copy-block .hero-square-carousel__kees-copy"
  );
  if (!bodyCopy) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) {
    bodyCopy.classList.add("is-revealed");
    return;
  }

  bodyCopy.classList.add("traditional-body-waterfall");
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      bodyCopy.classList.add("is-revealed");
    });
  });
};

const initTraditionalCopyBlockWaterfallReveal = () => {
  if (!document.body.classList.contains("page-traditional")) return;
  const textBlock = document.querySelector(
    ".traditional-copy-block .hero-square-carousel__kees"
  );
  if (!textBlock) return;

  const title = textBlock.querySelector(".hero-square-carousel__kees-title");
  const bodyCopy = textBlock.querySelector(".hero-square-carousel__kees-copy");
  const subLine = textBlock.querySelector(".hero-follow-image__sub");
  const collectionsLine = textBlock.querySelector(".traditional-copy-block__subtag");
  const mainTargets = [title, bodyCopy].filter(Boolean);
  const lineTargets = [subLine, collectionsLine].filter(Boolean);

  textBlock.classList.remove("fixed-rise-reveal", "scroll-reveal", "is-revealed");
  textBlock.style.removeProperty("--reveal-delay");

  mainTargets.forEach((node, index) => {
    node.classList.remove(
      "traditional-body-waterfall",
      "traditional-copy-main-rise",
      "is-revealed"
    );
    node.classList.add("traditional-copy-main-rise");
    node.style.setProperty("--traditional-main-delay", `${index * 120}ms`);
  });

  lineTargets.forEach((node, index) => {
    node.classList.remove(
      "traditional-copy-line-reveal",
      "traditional-copy-line-slow-rise",
      "is-revealed"
    );
    node.classList.add("traditional-copy-line-slow-rise");
    node.style.setProperty("--traditional-line-delay", `${index * 120}ms`);
  });

  const revealMainText = () => {
    mainTargets.forEach((node) => node.classList.add("is-revealed"));
  };

  const revealCollectionLines = () => {
    lineTargets.forEach((node) => node.classList.add("is-revealed"));
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) {
    revealMainText();
    revealCollectionLines();
    return;
  }

  window.setTimeout(() => {
    window.requestAnimationFrame(revealMainText);
  }, 80);

  if (!lineTargets.length) return;

  let observer = null;
  let isListening = false;
  const lineTrigger = subLine || collectionsLine;

  const stopWatching = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (isListening) {
      window.removeEventListener("scroll", revealLinesWhenVisible);
      window.removeEventListener("resize", revealLinesWhenVisible);
      window.removeEventListener("load", revealLinesWhenVisible);
      isListening = false;
    }
  };

  const revealLinesWhenVisible = () => {
    if (lineTargets.every((node) => node.classList.contains("is-revealed"))) {
      stopWatching();
      return;
    }
    const rect = lineTrigger.getBoundingClientRect();
    const isEnteringView =
      rect.top <= window.innerHeight * 0.9 &&
      rect.bottom >= window.innerHeight * 0.05;
    if (!isEnteringView) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        revealCollectionLines();
        stopWatching();
      });
    });
  };

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealLinesWhenVisible();
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -10% 0px",
      }
    );
    observer.observe(lineTrigger);
  }

  window.addEventListener("scroll", revealLinesWhenVisible, { passive: true });
  window.addEventListener("resize", revealLinesWhenVisible, { passive: true });
  window.addEventListener("load", revealLinesWhenVisible, { once: true });
  isListening = true;
  window.requestAnimationFrame(revealLinesWhenVisible);
};

const lockTraditionalScrollRevealTargets = () => {
  if (!document.body.classList.contains("page-traditional")) return;
  const targets = document.querySelectorAll(
    ".traditional-copy-block, .traditional-copy-block .hero-square-carousel__kees, .traditional-copy-block .hero-square-carousel__kees > *, .traditional-sequence, .traditional-sequence__controls, .traditional-sequence__controls .hero-square-carousel__arrow"
  );
  targets.forEach((node) => {
    node.classList.remove(
      "scroll-reveal",
      "is-revealed",
      "traditional-post-hero-reveal",
      "traditional-copy-load-rise",
      "is-risen"
    );
    node.style.removeProperty("--reveal-delay");
    node.style.removeProperty("--traditional-post-reveal-delay");
  });
};

const initFixedOneShotReveals = () => {
  const targets = [];
  if (document.body.classList.contains("page-traditional")) {
    const traditionalArrows = document.querySelector(".traditional-sequence__controls");
    if (traditionalArrows) targets.push(traditionalArrows);
  }

  if (!targets.length) return;
  targets.forEach((node) => node.classList.add("fixed-rise-reveal"));

  const revealNode = (node) => {
    if (!node || node.classList.contains("is-revealed")) return;
    node.classList.add("is-revealed");
  };

  const revealVisibleNow = () => {
    targets.forEach((node) => {
      if (!node || node.classList.contains("is-revealed")) return;
      const rect = node.getBoundingClientRect();
      const isInView = rect.top <= window.innerHeight * 0.92 && rect.bottom >= window.innerHeight * 0.04;
      if (isInView) revealNode(node);
    });
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((node) => revealNode(node));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, io) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealNode(entry.target);
        io.unobserve(entry.target);
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  targets.forEach((node) => observer.observe(node));
  revealVisibleNow();
  window.addEventListener("scroll", revealVisibleNow, { passive: true });
  window.addEventListener("resize", revealVisibleNow, { passive: true });
  window.addEventListener("load", revealVisibleNow, { once: true });
};

const bindTraditionalRouteExitFade = () => {
  if (document.body.classList.contains("page-traditional")) return;
  const traditionalCta = document.querySelector(
    '.hero-square-carousel__kees-cta[href="traditional.html"]'
  );
  if (!traditionalCta) return;
  let isLeaving = false;
  traditionalCta.addEventListener("click", (event) => {
    if (event.defaultPrevented || isLeaving) return;
    if (!isPrimaryUnmodifiedClick(event)) return;
    const href = traditionalCta.getAttribute("href");
    if (!href) return;
    const url = new URL(href, window.location.href);
    if (!/\/traditional\.html$/i.test(url.pathname)) return;
    event.preventDefault();
    isLeaving = true;
    sessionSet(TRADITIONAL_ROUTE_FADE_KEY, "1");
    document.body.classList.add("route-fade-leave");
    window.setTimeout(() => {
      window.location.href = url.href;
    }, ROUTE_FADE_MS);
  });
};

startTraditionalEntryFade();
lockTraditionalScrollRevealTargets();
initTraditionalCopyBlockWaterfallReveal();
bindTraditionalRouteExitFade();

const initTraditionalPinnedRowShift = () => {
  if (!document.body.classList.contains("page-traditional")) return;
  // No docking/pin. Scroll above/through the squares section drives horizontal shift.
  const sequenceSection = document.querySelector(".traditional-sequence");
  const scrollViewport = document.querySelector(".traditional-sequence__viewport");
  const scrollRow = document.querySelector(".traditional-sequence__row--top");
  const sequencePrev = document.querySelector(".traditional-sequence__arrow--left");
  const sequenceNext = document.querySelector(".traditional-sequence__arrow--right");
  const subtagItems = Array.from(
    document.querySelectorAll(".traditional-copy-block__subtag-item")
  );
  if (!sequenceSection || !scrollViewport || !scrollRow) return;

  const prefersReducedMotionSimple = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Keep section fixed in place; do not apply lift animation to the arrows row.
  let sectionRevealDone = false;

  const ensureSectionReveal = () => {
    if (sectionRevealDone) return;
    const rect = sequenceSection.getBoundingClientRect();
    const triggerLinePx = window.innerHeight * 0.88;
    const isWithinTrigger =
      rect.top <= triggerLinePx && rect.bottom >= window.innerHeight * 0.1;
    if (!isWithinTrigger) return;
    sectionRevealDone = true;
    sequenceSection.classList.add("is-revealed");
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const LOGICAL_SECTION_COUNT = 3;
  const LOOP_SET_COUNT = LOGICAL_SECTION_COUNT + 1;
  const SQUARES_PER_SECTION = 6;
  const SECTION_BREAK_EXTRA_GAP_PX = 60;
  const AUTO_SHIFT_HOLD_MS = 8000;
  let maxShiftPx = 0;
  let currentShiftPx = 0;
  let targetShiftPx = 0;
  let sectionStepPx = 0;
  let physicalAnchorsPx = [0, 0, 0, 0];
  let currentPhysicalIndex = 0;
  let pendingWrapToFirst = false;
  let pendingWrapToLast = false;
  let activeCards = [];
  let rafId = 0;
  let revealRafId = 0;
  let autoShiftTimer = 0;
  let animationFromShiftPx = 0;
  let animationStartTimeMs = 0;
  let initialCardIntroDone = false;
  const SECTION_SHIFT_DURATION_MS = 3200;
  const SECTION_SHIFT_START_DELAY_MS = 220;
  const SHIFT_SETTLE_EPSILON = 0.08;
  const SECTION_KEYS_IN_ORDER = ["horizon", "heritage", "legacy"];
  const CARD_REVEAL_STAGGER_MS = 132;
  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;

  const clearAutoShiftTimer = () => {
    if (!autoShiftTimer) return;
    window.clearTimeout(autoShiftTimer);
    autoShiftTimer = 0;
  };

  const scheduleAutoShift = () => {
    clearAutoShiftTimer();
    autoShiftTimer = window.setTimeout(() => {
      autoShiftTimer = 0;
      if (document.hidden) {
        scheduleAutoShift();
        return;
      }
      if (rafId) {
        scheduleAutoShift();
        return;
      }
      moveNextLooping();
    }, AUTO_SHIFT_HOLD_MS);
  };

  const revealVisibleCards = () => {
    if (!activeCards.length) return;
    if (prefersReducedMotionSimple) {
      activeCards.forEach((card) => {
        card.classList.add("is-visible");
        card.dataset.dominoRevealed = "true";
      });
      return;
    }
    if (!sectionRevealDone) return;
    const sectionRect = sequenceSection.getBoundingClientRect();
    const sectionIsInViewport =
      sectionRect.bottom > 0 && sectionRect.top < window.innerHeight;
    if (!sectionIsInViewport) return;
    if (initialCardIntroDone) {
      activeCards.forEach((card) => {
        card.classList.add("is-visible");
        card.dataset.dominoRevealed = "true";
      });
      return;
    }

    const viewportRect = scrollViewport.getBoundingClientRect();
    const enteringCards = [];

    activeCards.forEach((card) => {
      if (card.dataset.dominoRevealed === "true") return;
      const rect = card.getBoundingClientRect();
      const inViewHorizontally =
        rect.right > viewportRect.left + 6 &&
        rect.left < viewportRect.right - 6;
      const inViewVertically =
        rect.bottom > viewportRect.top &&
        rect.top < viewportRect.bottom;
      if (!inViewHorizontally || !inViewVertically) return;
      enteringCards.push({ card, left: rect.left });
    });

    enteringCards.sort((a, b) => a.left - b.left);
    if (!enteringCards.length) return;
    const introCards = new Set(enteringCards.map(({ card }) => card));
    enteringCards.forEach(({ card }, index) => {
      card.style.setProperty(
        "--traditional-domino-delay",
        `${index * CARD_REVEAL_STAGGER_MS}ms`
      );
      card.classList.add("is-visible");
      card.dataset.dominoRevealed = "true";
    });
    activeCards.forEach((card) => {
      if (introCards.has(card)) return;
      card.style.setProperty("--traditional-domino-delay", "0ms");
      card.classList.add("is-visible");
      card.dataset.dominoRevealed = "true";
    });
    initialCardIntroDone = true;
  };

  const requestReveal = () => {
    if (revealRafId) return;
    revealRafId = window.requestAnimationFrame(() => {
      revealRafId = 0;
      ensureSectionReveal();
      revealVisibleCards();
    });
  };

  const getNearestPhysicalIndex = (shiftPx) => {
    if (!physicalAnchorsPx.length) return 0;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    physicalAnchorsPx.forEach((anchorPx, index) => {
      const dist = Math.abs(shiftPx - anchorPx);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  };

  const updateCollectionSubtagState = () => {
    if (!subtagItems.length) return;
    const physicalIndex = getNearestPhysicalIndex(currentShiftPx);
    const logicalIndex =
      ((physicalIndex % LOGICAL_SECTION_COUNT) + LOGICAL_SECTION_COUNT) %
      LOGICAL_SECTION_COUNT;
    const activeKey = SECTION_KEYS_IN_ORDER[logicalIndex] || SECTION_KEYS_IN_ORDER[0];
    subtagItems.forEach((item) => {
      const key = (item.dataset.collectionKey || "").trim();
      const isActive = key === activeKey;
      item.classList.toggle("is-active", isActive);
      item.classList.toggle("is-muted", !isActive);
    });
  };

  const ensureLoopContent = () => {
    if (scrollRow.dataset.simpleLoopReady === "true") return;
    const originals = Array.from(
      scrollRow.querySelectorAll(".traditional-sequence__card")
    );
    if (!originals.length) return;
    originals.slice(0, SQUARES_PER_SECTION).forEach((card) => {
      card.dataset.loopSet = "0";
    });
    for (let setIndex = 1; setIndex < LOOP_SET_COUNT; setIndex += 1) {
      originals.slice(0, SQUARES_PER_SECTION).forEach((card) => {
        const clone = card.cloneNode(true);
        clone.dataset.loopSet = String(setIndex);
        scrollRow.appendChild(clone);
      });
    }
    scrollRow.dataset.simpleLoopReady = "true";
  };

  const setupTrack = () => {
    ensureLoopContent();
    const allCards = Array.from(
      scrollRow.querySelectorAll(".traditional-sequence__card")
    );
    const cards = allCards.slice(0, SQUARES_PER_SECTION * LOOP_SET_COUNT);
    if (allCards.length > cards.length) {
      allCards.slice(cards.length).forEach((card) => card.remove());
    }
    if (!cards.length) return;
    activeCards = cards;

    const rowStyle = window.getComputedStyle(scrollRow);
    const gapPx = parseFloat(rowStyle.columnGap || rowStyle.gap || "0") || 0;
    const viewportWidth = Math.max(1, scrollViewport.clientWidth || window.innerWidth);
    const visibleCount = window.matchMedia("(max-width: 1220px)").matches ? 3 : 6;
    const cardWidth = Math.max(
      1,
      (viewportWidth - gapPx * Math.max(0, visibleCount - 1)) / visibleCount
    );

    cards.forEach((card, index) => {
      card.style.width = `${cardWidth}px`;
      card.style.flex = `0 0 ${cardWidth}px`;
      card.style.setProperty("--square-size", `${cardWidth}px`);
      card.classList.add("traditional-card-reveal");
      if (card.dataset.dominoRevealed === "true") {
        card.classList.add("is-visible");
      } else {
        card.classList.remove("is-visible");
      }
      const isSectionStart = index > 0 && index % SQUARES_PER_SECTION === 0;
      card.classList.toggle("traditional-sequence__card--section-start", isSectionStart);
      card.style.marginLeft = isSectionStart
        ? `${SECTION_BREAK_EXTRA_GAP_PX}px`
        : "0px";
    });

    scrollRow.style.display = "flex";
    scrollRow.style.flexWrap = "nowrap";
    scrollRow.style.alignItems = "flex-start";
    scrollRow.style.width = "max-content";
    scrollViewport.style.overflow = "hidden";

    maxShiftPx = Math.max(0, scrollRow.scrollWidth - viewportWidth);

    physicalAnchorsPx = Array.from({ length: LOOP_SET_COUNT }, (_, sectionIndex) => {
      const startIndex = sectionIndex * SQUARES_PER_SECTION;
      const endIndex = startIndex + SQUARES_PER_SECTION - 1;
      const firstCard = cards[startIndex];
      const lastCard = cards[endIndex];
      if (!firstCard || !lastCard) return 0;
      const groupLeft = firstCard.offsetLeft;
      const groupRight = lastCard.offsetLeft + lastCard.offsetWidth;
      return clamp(((groupLeft + groupRight) * 0.5) - (viewportWidth * 0.5), 0, maxShiftPx);
    });
    sectionStepPx = Math.max(
      1,
      physicalAnchorsPx.length > 1
        ? Math.abs(physicalAnchorsPx[1] - physicalAnchorsPx[0])
        : viewportWidth * 0.82
    );

    currentPhysicalIndex = clamp(currentPhysicalIndex, 0, physicalAnchorsPx.length - 1);
    const baseAnchor = physicalAnchorsPx[currentPhysicalIndex] ?? 0;
    currentShiftPx = clamp(baseAnchor, 0, maxShiftPx);
    targetShiftPx = clamp(baseAnchor, 0, maxShiftPx);
    animationFromShiftPx = currentShiftPx;
    animationStartTimeMs = performance.now();
    scrollRow.style.transform = `translate3d(${-currentShiftPx}px, 0, 0)`;
    updateCollectionSubtagState();
    requestReveal();
    scheduleAutoShift();
  };

  const tick = (nowMs) => {
    const totalDelta = targetShiftPx - animationFromShiftPx;
    if (Math.abs(totalDelta) < SHIFT_SETTLE_EPSILON) {
      currentShiftPx = targetShiftPx;
    } else {
      const progressRaw = (nowMs - animationStartTimeMs) / SECTION_SHIFT_DURATION_MS;
      const progress = clamp(progressRaw, 0, 1);
      const easedProgress = easeInOutCubic(progress);
      currentShiftPx = animationFromShiftPx + totalDelta * easedProgress;
    }
    scrollRow.style.transform = `translate3d(${-currentShiftPx}px, 0, 0)`;
    updateCollectionSubtagState();
    requestReveal();
    if (Math.abs(targetShiftPx - currentShiftPx) >= SHIFT_SETTLE_EPSILON) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      rafId = 0;
      currentPhysicalIndex = getNearestPhysicalIndex(currentShiftPx);
      if (pendingWrapToFirst) {
        pendingWrapToFirst = false;
        currentPhysicalIndex = 0;
        const firstAnchor = clamp(physicalAnchorsPx[0] ?? 0, 0, maxShiftPx);
        currentShiftPx = firstAnchor;
        targetShiftPx = firstAnchor;
        animationFromShiftPx = firstAnchor;
        animationStartTimeMs = performance.now();
        scrollRow.style.transform = `translate3d(${-currentShiftPx}px, 0, 0)`;
        updateCollectionSubtagState();
        requestReveal();
      }
      if (pendingWrapToLast) {
        pendingWrapToLast = false;
        currentPhysicalIndex = LOGICAL_SECTION_COUNT - 1;
        const lastAnchor = clamp(
          physicalAnchorsPx[LOGICAL_SECTION_COUNT - 1] ?? 0,
          0,
          maxShiftPx
        );
        currentShiftPx = lastAnchor;
        targetShiftPx = lastAnchor;
        animationFromShiftPx = lastAnchor;
        animationStartTimeMs = performance.now();
        scrollRow.style.transform = `translate3d(${-currentShiftPx}px, 0, 0)`;
        updateCollectionSubtagState();
        requestReveal();
      }

      scheduleAutoShift();
    }
  };

  const requestTick = () => {
    if (!rafId) {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  setupTrack();

  const moveToPhysicalIndex = (nextIndex) => {
    if (!physicalAnchorsPx.length) return;
    clearAutoShiftTimer();
    const safeIndex = clamp(nextIndex, 0, physicalAnchorsPx.length - 1);
    currentPhysicalIndex = safeIndex;
    const nowMs = performance.now();
    if (rafId) {
      const totalDelta = targetShiftPx - animationFromShiftPx;
      const progressRaw = (nowMs - animationStartTimeMs) / SECTION_SHIFT_DURATION_MS;
      const progress = clamp(progressRaw, 0, 1);
      const easedProgress = easeInOutCubic(progress);
      currentShiftPx = animationFromShiftPx + totalDelta * easedProgress;
    }
    animationFromShiftPx = currentShiftPx;
    animationStartTimeMs = nowMs + SECTION_SHIFT_START_DELAY_MS;
    targetShiftPx = clamp(physicalAnchorsPx[safeIndex] ?? 0, 0, maxShiftPx);
    requestTick();
  };

  const moveNextLooping = () => {
    const nearestIndex = getNearestPhysicalIndex(targetShiftPx);
    const baseLogicalIndex =
      ((nearestIndex % LOGICAL_SECTION_COUNT) + LOGICAL_SECTION_COUNT) %
      LOGICAL_SECTION_COUNT;
    if (baseLogicalIndex === LOGICAL_SECTION_COUNT - 1) {
      pendingWrapToFirst = true;
      pendingWrapToLast = false;
      moveToPhysicalIndex(LOGICAL_SECTION_COUNT);
      return;
    }
    pendingWrapToFirst = false;
    pendingWrapToLast = false;
    moveToPhysicalIndex(nearestIndex + 1);
  };

  const jumpToPhysicalIndex = (index) => {
    const safeIndex = clamp(index, 0, physicalAnchorsPx.length - 1);
    currentPhysicalIndex = safeIndex;
    const anchor = clamp(physicalAnchorsPx[safeIndex] ?? 0, 0, maxShiftPx);
    currentShiftPx = anchor;
    targetShiftPx = anchor;
    animationFromShiftPx = anchor;
    animationStartTimeMs = performance.now();
    scrollRow.style.transform = `translate3d(${-currentShiftPx}px, 0, 0)`;
    updateCollectionSubtagState();
    requestReveal();
  };

  const movePrevLooping = () => {
    const nearestIndex = getNearestPhysicalIndex(targetShiftPx);
    const baseLogicalIndex =
      ((nearestIndex % LOGICAL_SECTION_COUNT) + LOGICAL_SECTION_COUNT) %
      LOGICAL_SECTION_COUNT;
    pendingWrapToFirst = false;

    if (baseLogicalIndex === 0 && physicalAnchorsPx.length > LOGICAL_SECTION_COUNT) {
      // Keep left-arrow movement direction: Legacy enters from the left.
      jumpToPhysicalIndex(LOGICAL_SECTION_COUNT);
      pendingWrapToLast = true;
      moveToPhysicalIndex(LOGICAL_SECTION_COUNT - 1);
      return;
    }

    pendingWrapToLast = false;
    moveToPhysicalIndex(nearestIndex - 1);
  };

  if (sequencePrev) {
    sequencePrev.addEventListener("click", () => {
      // Left arrow: move squares visually to the right.
      movePrevLooping();
    });
  }

  if (sequenceNext) {
    sequenceNext.addEventListener("click", () => {
      // Right arrow: move squares visually to the left.
      moveNextLooping();
    });
  }

  window.addEventListener(
    "resize",
    () => {
      setupTrack();
      requestReveal();
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      requestReveal();
    },
    { passive: true }
  );
};

initTraditionalPinnedRowShift();

const initTraditionalCopyLinesReveal = () => {
  if (!document.body.classList.contains("page-traditional")) return;

  const subLine = document.querySelector(
    ".traditional-copy-block .hero-follow-image__sub"
  );
  const collectionsLine = document.querySelector(
    ".traditional-copy-block .traditional-copy-block__subtag"
  );
  if (!subLine || !collectionsLine) return;

  // Keep these lines visible; full section reveal is handled by
  // `initTraditionalPostHeroReveal` for reliable fade/rise behavior.
  subLine.classList.remove("traditional-copy-line-reveal", "is-revealed");
  collectionsLine.classList.remove("traditional-copy-line-reveal", "is-revealed");
};

initTraditionalCopyLinesReveal();

const initTraditionalPostHeroReveal = () => {
  if (!document.body.classList.contains("page-traditional")) return;

  const heroSplit = document.querySelector(
    "body.page-traditional > section.split:first-of-type"
  );
  if (!heroSplit) return;

  const revealTargets = [];
  let sectionIndex = 0;

  for (let block = heroSplit.nextElementSibling; block; block = block.nextElementSibling) {
    if (block.matches("nav#navOverlay, nav.nav-overlay")) continue;
    if (!block.matches("section, footer")) continue;

    if (block.classList.contains("traditional-copy-block")) {
      const textBlock = block.querySelector(".hero-square-carousel__kees");
      if (textBlock) {
        textBlock.classList.add("scroll-reveal");
        textBlock.style.setProperty(
          "--reveal-delay",
          `${Math.min(sectionIndex, 4) * 80}ms`
        );
        revealTargets.push(textBlock);
        sectionIndex += 1;
        continue;
      }
    }

    block.classList.add("traditional-post-hero-reveal");
    block.style.setProperty(
      "--traditional-post-reveal-delay",
      `${Math.min(sectionIndex, 4) * 80}ms`
    );
    revealTargets.push(block);
    sectionIndex += 1;
  }

  if (!revealTargets.length) return;

  const revealNode = (node) => {
    if (!node || node.classList.contains("is-revealed")) return;
    node.classList.add("is-revealed");
  };

  const revealInViewNow = () => {
    revealTargets.forEach((node) => {
      if (node.classList.contains("is-revealed")) return;
      const rect = node.getBoundingClientRect();
      const isInView = rect.top <= window.innerHeight * 0.92 && rect.bottom >= window.innerHeight * 0.04;
      if (isInView) revealNode(node);
    });
  };

  const forceRevealTimer = window.setTimeout(() => {
    revealTargets.forEach((node) => revealNode(node));
  }, 1800);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    window.clearTimeout(forceRevealTimer);
    revealTargets.forEach((node) => revealNode(node));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, io) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealNode(entry.target);
        io.unobserve(entry.target);
      });
    },
    {
      threshold: 0.06,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealTargets.forEach((node) => observer.observe(node));
  revealInViewNow();
  window.addEventListener("scroll", revealInViewNow, { passive: true });
  window.addEventListener("resize", revealInViewNow, { passive: true });
  window.addEventListener("load", revealInViewNow, { once: true });
};

// Disabled custom post-hero section reveal on Traditional page.
// We use the same `scroll-reveal` text treatment as main page instead.

const initTraditionalIntroLinksAlignment = () => {
  if (!document.body.classList.contains("page-traditional")) return;
  const line = document.querySelector(".traditional-intro-copy__line");
  const links = document.querySelector(".traditional-intro-links");
  if (!line || !links) return;

  let resizeRaf = 0;
  const sync = () => {
    const width = Math.round(line.getBoundingClientRect().width);
    if (width > 0) {
      links.style.width = `${width}px`;
    }
  };

  const requestSync = () => {
    if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
    resizeRaf = window.requestAnimationFrame(() => {
      resizeRaf = 0;
      sync();
    });
  };

  requestSync();
  window.addEventListener("load", requestSync, { once: true });
  window.addEventListener("resize", requestSync, { passive: true });
};

initTraditionalIntroLinksAlignment();

const initTraditionalRoomFloodUpload = () => {
  if (!document.body.classList.contains("page-traditional")) return;
  const frame = document.getElementById("traditionalRoomFloodFrame");
  const input = document.getElementById("traditionalRoomFloodInput");
  const image = document.getElementById("traditionalRoomFloodImage");
  if (!frame || !input || !image) return;

  let objectUrl = "";
  const clearObjectUrl = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
  };

  input.addEventListener("change", () => {
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (!file || !String(file.type || "").startsWith("image/")) return;
    clearObjectUrl();
    objectUrl = URL.createObjectURL(file);
    image.src = objectUrl;
    frame.classList.add("has-image");
  });

  frame.addEventListener("click", () => {
    input.click();
  });

  window.addEventListener("beforeunload", clearObjectUrl, { once: true });
};

initTraditionalRoomFloodUpload();

const initTraditionalBottomImageParallax = () => {
  if (!document.body.classList.contains("page-traditional")) return;

  const frame = document.querySelector(".traditional-room-flood__frame");
  const image = document.querySelector(".traditional-room-flood__image");
  if (!image) return;

  const syncFrameBackground = () => {
    if (!frame) return;
    const source = image.currentSrc || image.getAttribute("src") || "";
    if (!source) return;
    frame.style.backgroundImage = `url("${source}")`;
  };

  syncFrameBackground();
  image.addEventListener("load", syncFrameBackground, { passive: true });
  // Parallax removed: keep static framing.
  image.style.transform = "translate3d(0, 0, 0) scale(1.14)";
};

initTraditionalBottomImageParallax();

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
  const AUTO_SLIDE_DURATION_MS = 1650;
  const AUTO_SLIDE_START_DELAY_MS = 100;
  /** Arrow clicks: slower than auto-start tweak for a gentler response. */
  const MANUAL_SLIDE_DURATION_MS = 1820;
  const MANUAL_SLIDE_START_DELAY_MS = 150;
  /* Consistent cadence: advance one slot every 4 seconds. */
  const AUTO_STEP_MS = 4000;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
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

  /** Arrow slides: keep the original quart curve profile, just slowed down. */
  const easeInOutQuart = (t) =>
    t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;

  const animateBy = (
    delta,
    durationMs,
    easeFn = easeInOutCubic,
    startDelayMs = 0
  ) => {
    if (!delta) return false;
    if (isAnimatingHeroSquares()) return false;

    const from = snapToNearestSlot(heroSquareViewport.scrollLeft);
    const to = from + delta;
    const start = performance.now() + Math.max(0, startDelayMs);
    currentX = from;
    targetX = to;
    heroSquareViewport.scrollLeft = from;
    heroSquareAnimating = true;
    syncArrowState();

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
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
      }
    };

    smoothRaf = window.requestAnimationFrame(tick);
    return true;
  };

  const restartAutoStepTimer = () => {
    if (autoStepTimer) return;
    autoStepTimer = window.setInterval(() => {
      autoStepOnce();
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
    // One slot per click; softer start + longer easing gives a gentler glide.
    const durationMs = getDurationForStep(MANUAL_SLIDE_DURATION_MS, step);
    const started = animateBy(
      direction * step,
      durationMs,
      easeInOutQuart,
      MANUAL_SLIDE_START_DELAY_MS
    );
    if (!started) return;
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

  // Keep autoplay reliable after viewport minimize/restore or tab visibility changes.
  const resumeHeroSquareAutoplay = () => {
    if (!heroSquareAnimating) {
      currentX = snapToNearestSlot(heroSquareViewport.scrollLeft);
      targetX = currentX;
      heroSquareViewport.scrollLeft = currentX;
    }
    restartAutoStepTimer();
    syncArrowState();
  };

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
    resumeHeroSquareAutoplay();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (autoStepTimer) {
        window.clearInterval(autoStepTimer);
        autoStepTimer = null;
      }
      return;
    }
    resumeHeroSquareAutoplay();
  });

  window.addEventListener("pageshow", () => {
    resumeHeroSquareAutoplay();
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
    const durationMs = getDurationForStep(AUTO_SLIDE_DURATION_MS, step);
    animateBy(step, durationMs, easeInOutCubic, AUTO_SLIDE_START_DELAY_MS);
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
const IS_TRADITIONAL_PAGE = document.body.classList.contains("page-traditional");
const TRADITIONAL_NAV_START_Y = 1;
const TRADITIONAL_NAV_RAMP_PX = 30;
const TRADITIONAL_TITLE_SHRINK_RAMP_PX = 140;
const TRADITIONAL_TOP_TITLE_DROP_PX = 25;
const TRADITIONAL_VERTICAL_STRETCH_MULTIPLIER = 1.2;
const HERO_TEXT_DARK_PROGRESS = 0.9;
const HERO_NAV_EXTRA_SCROLL_PX = 20;

const applyInitialHomeNavStateFromScroll = () => {
  if (!topbar || !mainHeroSplit) return;
  const navHeight = topbar.offsetHeight || 68;
  const shouldSolid = IS_TRADITIONAL_PAGE
    ? (window.scrollY || window.pageYOffset || 0) > TRADITIONAL_NAV_START_Y
    : mainHeroSplit.getBoundingClientRect().bottom <= navHeight + 1;
  topbar.classList.remove("topbar-pop-in", "topbar-pop-out", "topbar-exit-extend");
  topbar.classList.toggle("is-solid", shouldSolid);
  topbar.classList.toggle("nav-sheet-visible", shouldSolid);
  topbar.style.setProperty("--hero-nav-fade-progress", shouldSolid ? "1" : "0");
  topbar.style.setProperty("--hero-nav-links-progress", shouldSolid ? "1" : "0");
  topbar.style.setProperty("--hero-nav-sheet-extra", "0px");
};

// Hard reset stale nav lock state on startup/restore (prevents refresh disappearance).
document.body.classList.remove("topbar-static-lock");
document.body.style.removeProperty("--topbar-lock-y");
applyInitialHomeNavStateFromScroll();
window.addEventListener("pageshow", () => {
  document.body.classList.remove("topbar-static-lock");
  document.body.style.removeProperty("--topbar-lock-y");
  applyInitialHomeNavStateFromScroll();
});

/* Nav RAF runs after floating-title layout so thresholds use the live floating clone rect.
 * Scroll coalescing: cancel prior RAF and reschedule so rapid wheel/trackpad input always
 * applies one sync per paint with the latest scroll position (consistent at any speed). */
if (topbar && mainHeroSplit) {
  let heroNavRafId = null;
  let prevHasPassedHero = topbar.classList.contains("is-solid");
  let navInitialHydrationDone = false;
  let topbarPopTimer = null;
  let navRefreshStabilizeUntil = performance.now() + 900;
  let navReentryBlockedUntil = 0;
  let lastNavScrollY = window.scrollY || window.pageYOffset || 0;
  let navLastFlipAt = performance.now();
  let navLastFlipScrollY = lastNavScrollY;
  let navFastScrollLockUntil = 0;
  let heroFoucPendingCleared = false;
  /** Center-band hysteresis: wider exit band reduces slow-scroll flicker near threshold. */
  const LINK_BAND_ENTER_SLACK_PX = 0;
  const LINK_BAND_EXIT_SLACK_PX = 10;
  const NAV_FLIP_LOCK_MS = 220;
  const NAV_MIN_SCROLL_DELTA_PX = 3;
  /**
   * Fast-scroll guard: freeze nav-state flips during high-velocity wheel/trackpad movement,
   * then allow a flip again after a short settle window.
   */
  const NAV_FAST_SCROLL_DELTA_PX = 22;
  const NAV_FAST_SCROLL_LOCK_MS = 180;
  document.body.classList.remove("topbar-spring-in");
  document.body.classList.remove("topbar-spring-out");
  const beginNavRefreshStabilize = () => {
    navRefreshStabilizeUntil = performance.now() + 900;
    navInitialHydrationDone = false;
    if (topbarPopTimer) {
      window.clearTimeout(topbarPopTimer);
      topbarPopTimer = null;
    }
    topbar.classList.remove("topbar-pop-in", "topbar-pop-out", "topbar-exit-extend");
    topbar.style.removeProperty("--topbar-pop-start-height");
    topbar.style.removeProperty("--topbar-pop-end-height");
  };

  const syncTopbarStyleFromHero = () => {
    // Sync floating-title geometry first so nav decisions use the live text position this frame.
    if (typeof syncFloatingTitleImmediate === "function") {
      syncFloatingTitleImmediate();
    }
    const nowTs = performance.now();
    const currentScrollY = window.scrollY || window.pageYOffset || 0;
    const inRefreshStabilize = nowTs < navRefreshStabilizeUntil;
    const navHeight = topbar.offsetHeight || 68;
    const heroRectNow = mainHeroSplit.getBoundingClientRect();
    // Hard fallback for refresh/restore: if hero is already above the nav band,
    // force solid nav regardless of transient title geometry.
    const passedHeroByScroll = heroRectNow.bottom <= navHeight + 1;
    const scrollDeltaSinceLastFrame = Math.abs(currentScrollY - lastNavScrollY);
    const scrollingDown = currentScrollY > lastNavScrollY + 0.4;
    const scrollingUp = currentScrollY < lastNavScrollY - 0.4;
    let hasPassedHero = prevHasPassedHero;
    let titleCenterDeltaY = Number.POSITIVE_INFINITY;
    /** True when the name has cleared the nav link band again (hero overlap) — kills sticky solid + spring lock. */
    let titleBackInHero = false;
    /* Solid nav when visible floating title center reaches nav-link-row center. */
    const floatingTitleLive = document.querySelector(".hero-title-float");
    const titleForAlign = floatingTitleLive || heroTitle;
    /* Full About | Contact | Resume row — same vertical band you align to when scrolling. */
    const navRightRow = topbar.querySelector(".topbar__nav-right");
    const navRectForAlign = topbar.getBoundingClientRect();
    let linkBandCenterY = navRectForAlign.top + navRectForAlign.height * 0.5;
    if (navRightRow) {
      const rowRectCandidate = navRightRow.getBoundingClientRect();
      const rowIsVisible =
        rowRectCandidate.width > 1 &&
        rowRectCandidate.height > 1 &&
        getComputedStyle(navRightRow).display !== "none" &&
        getComputedStyle(navRightRow).visibility !== "hidden";
      if (rowIsVisible) {
        linkBandCenterY = rowRectCandidate.top + rowRectCandidate.height * 0.5;
      }
    }

    if (titleForAlign) {
      const titleRect = titleForAlign.getBoundingClientRect();
      const titleCenterY = titleRect.top + titleRect.height * 0.5;
      const rowCenterY = linkBandCenterY;
      titleCenterDeltaY = titleCenterY - rowCenterY;
      if (prevHasPassedHero) {
        hasPassedHero = titleCenterY <= rowCenterY + LINK_BAND_EXIT_SLACK_PX;
      } else {
        hasPassedHero = titleCenterY <= rowCenterY + LINK_BAND_ENTER_SLACK_PX;
        titleBackInHero = titleCenterY > rowCenterY + LINK_BAND_EXIT_SLACK_PX;
      }
    }
    if (IS_TRADITIONAL_PAGE) {
      hasPassedHero = currentScrollY > TRADITIONAL_NAV_START_Y;
      titleBackInHero = !hasPassedHero;
    }
    // If title is back in hero band, always unsolid.
    if (titleBackInHero) {
      hasPassedHero = false;
    }
    if (!IS_TRADITIONAL_PAGE) {
      const shouldForceImmediateSolid =
        hasPassedHero &&
        !prevHasPassedHero &&
        (passedHeroByScroll ||
          (Number.isFinite(titleCenterDeltaY) &&
            titleCenterDeltaY <= LINK_BAND_ENTER_SLACK_PX));
      // Refresh-safe guard: scroll position wins when title geometry has not settled yet.
      if (passedHeroByScroll) {
        hasPassedHero = true;
        titleBackInHero = false;
      }
      if (inRefreshStabilize) {
        hasPassedHero = passedHeroByScroll;
        titleBackInHero = !passedHeroByScroll;
      }
      // Hold entered state briefly only when motion is effectively paused.
      if (!inRefreshStabilize && prevHasPassedHero && !scrollingUp && !scrollingDown && !titleBackInHero) {
        hasPassedHero = true;
      }
      // Prevent immediate threshold rebound that causes a random pop right after fade-out.
      if (
        !inRefreshStabilize &&
        !prevHasPassedHero &&
        nowTs < navReentryBlockedUntil &&
        !shouldForceImmediateSolid
      ) {
        hasPassedHero = false;
      }
      // Extra anti-jitter gate: ignore micro flip-flops near threshold unless enough time/scroll has passed.
      if (
        !inRefreshStabilize &&
        hasPassedHero !== prevHasPassedHero &&
        !shouldForceImmediateSolid
      ) {
        const scrolledSinceFlip = Math.abs(currentScrollY - navLastFlipScrollY);
        if (
          nowTs - navLastFlipAt < NAV_FLIP_LOCK_MS ||
          scrolledSinceFlip < NAV_MIN_SCROLL_DELTA_PX
        ) {
          hasPassedHero = prevHasPassedHero;
        } else {
          navLastFlipAt = nowTs;
          navLastFlipScrollY = currentScrollY;
        }
      }
      // Prevent nav switching while user is fast-scrolling; apply the flip only after movement settles.
      if (!inRefreshStabilize && scrollDeltaSinceLastFrame >= NAV_FAST_SCROLL_DELTA_PX) {
        navFastScrollLockUntil = nowTs + NAV_FAST_SCROLL_LOCK_MS;
      }
      const isClearlyPastThreshold = Number.isFinite(titleCenterDeltaY)
        ? Math.abs(titleCenterDeltaY) > 26
        : false;
      if (
        !inRefreshStabilize &&
        hasPassedHero !== prevHasPassedHero &&
        nowTs < navFastScrollLockUntil &&
        !isClearlyPastThreshold &&
        !shouldForceImmediateSolid
      ) {
        hasPassedHero = prevHasPassedHero;
      }
    }

    if (
      hasPassedHero !== prevHasPassedHero &&
      navInitialHydrationDone &&
      !inRefreshStabilize &&
      !document.body.classList.contains("refresh-no-anim") &&
      !IS_TRADITIONAL_PAGE
    ) {
      if (topbarPopTimer) {
        window.clearTimeout(topbarPopTimer);
        topbarPopTimer = null;
      }
      if (hasPassedHero) {
        const heroRect = mainHeroSplit.getBoundingClientRect();
        const navRect = topbar.getBoundingClientRect();
        const popStartHeightPx = IS_TRADITIONAL_PAGE
          ? Math.round((topbar.offsetHeight || 68) + 15)
          : Math.max(
              Math.round(heroRect.bottom + 20 - navRect.top),
              Math.round((topbar.offsetHeight || 68) + 15)
            );
        topbar.style.setProperty("--topbar-pop-start-height", `${popStartHeightPx}px`);
        topbar.classList.remove("topbar-exit-extend");
        topbar.classList.remove("topbar-pop-out");
        topbar.style.removeProperty("--topbar-pop-end-height");
        topbar.classList.add("topbar-pop-in");
        topbarPopTimer = window.setTimeout(() => {
          topbar.classList.remove("topbar-pop-in");
          topbarPopTimer = null;
        }, 520);
      } else {
        topbar.classList.add("topbar-exit-extend");
        topbar.classList.remove("topbar-pop-out");
        topbar.classList.remove("topbar-pop-in");
        topbar.style.removeProperty("--topbar-pop-start-height");
        topbar.style.removeProperty("--topbar-pop-end-height");
        topbarPopTimer = window.setTimeout(() => {
          topbar.classList.remove("topbar-exit-extend");
          topbarPopTimer = null;
        }, 520);
        navReentryBlockedUntil = nowTs + 520;
      }
    }

    if (!navInitialHydrationDone) {
      topbar.classList.remove("topbar-pop-in");
      topbar.classList.remove("topbar-exit-extend");
      topbar.classList.remove("topbar-pop-out");
      topbar.style.removeProperty("--topbar-pop-start-height");
      topbar.style.removeProperty("--topbar-pop-end-height");
    }
    if (IS_TRADITIONAL_PAGE) {
      if (topbarPopTimer) {
        window.clearTimeout(topbarPopTimer);
        topbarPopTimer = null;
      }
      topbar.classList.remove("topbar-pop-in", "topbar-pop-out", "topbar-exit-extend");
      topbar.style.removeProperty("--topbar-pop-start-height");
      topbar.style.removeProperty("--topbar-pop-end-height");
    }
    document.body.classList.remove("topbar-spring-in");
    document.body.classList.remove("topbar-spring-out");

    topbar.classList.toggle("is-solid", hasPassedHero);
    // Run hero/nav visual sync only after solid-state class is finalized for this frame.
    if (typeof syncFloatingTitleImmediate === "function") {
      syncFloatingTitleImmediate();
    }

    if (!document.body.classList.contains("nav-scroll-hydrated")) {
      document.body.classList.add("nav-scroll-hydrated");
    }

    if (
      document.documentElement.classList.contains("hero-fouc-pending") &&
      !heroFoucPendingCleared &&
      document.body.classList.contains("hero-float-ready")
    ) {
      heroFoucPendingCleared = true;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.documentElement.classList.remove("hero-fouc-pending");
        });
      });
    }

    lastNavScrollY = currentScrollY;
    prevHasPassedHero = hasPassedHero;
    navInitialHydrationDone = true;
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
  window.addEventListener(
    "scroll",
    () => {
      if (document.body.classList.contains("refresh-no-anim")) {
        document.body.classList.remove("refresh-no-anim");
      }
    },
    { passive: true, once: true }
  );
  window.addEventListener("resize", requestHeroNavSync);
  window.addEventListener("home-refresh-sync", () => {
    beginNavRefreshStabilize();
    requestHeroNavSync();
  });
  requestHeroNavSync();
}

if (
  topbar &&
  mainHeroSplit &&
  heroTitle &&
  ENABLE_HERO_TITLE_SCROLL_ANIMATION
) {
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
    /** Extra dock offset when nav links are hidden (hamburger mode). */
    const HERO_DOCK_COMPACT_EXTRA_Y_PX = 6;
    /** Maximum allowed lift above periwinkle section bottom before docking. */
    const HERO_MAX_EDGE_LIFT_PX = 20;
    const CSS_PT_TO_PX = 96 / 72;
    /** Delayed scale response for Valerie (no bounce/overshoot). */
    const TITLE_SCALE_LAG = 0.24;
    /** Subtle per-frame scale smoothing while keeping Y fully scroll-driven. */
    const TITLE_SCALE_BLEND = 0.4;
    /** Reduce baseline compensation strength so scale ease does less vertical travel. */
    const TITLE_Y_SCALE_COMPENSATION_FACTOR = 0.18;
    const TITLE_SPRING_SETTLE_Y = 0.08;
    const TITLE_SPRING_SETTLE_SCALE = 0.0008;
    /** Start docking earlier to avoid a visible pause before nav entry. */
    const HERO_DOCK_BLEND_START = 0.6;
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
    let lockedSourceFontPx = 0;
    let whiteNavActiveForColor = false;
    let heroRefreshFreezeUntil = performance.now() + 1000;
    const shouldRunTraditionalTitleIntro = IS_TRADITIONAL_PAGE && !isRefreshLikeLoad;
    let traditionalTitleIntroStartTs = 0;
    let traditionalTitleIntroHasStarted = !shouldRunTraditionalTitleIntro;
    let traditionalTitleIntroFramePending = false;
    const TRADITIONAL_TITLE_INTRO_MS = 295;
    const traditionalNavLinkIntroStartTs = shouldRunTraditionalTitleIntro ? performance.now() : 0;
    const TRADITIONAL_NAV_LINK_INTRO_MS = 95;

    const beginHeroRefreshFreeze = () => {
      heroRefreshFreezeUntil = performance.now() + 1000;
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const getHeroDockOffsetPx = () => {
      const navRightRow = topbar.querySelector(".topbar__nav-right");
      const compactNavActive =
        !!navRightRow &&
        getComputedStyle(navRightRow).display === "none";
      return HERO_DOCK_Y_OFFSET_PX + (compactNavActive ? HERO_DOCK_COMPACT_EXTRA_Y_PX : 0);
    };
    const applyFloatingTransform = (y, sx, sy) => {
      floatingTitle.style.transform = `translate3d(-50%, ${y.toFixed(2)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    };
    const queueTraditionalTitleIntroFrame = () => {
      if (!shouldRunTraditionalTitleIntro || traditionalTitleIntroFramePending) return;
      traditionalTitleIntroFramePending = true;
      window.requestAnimationFrame(() => {
        traditionalTitleIntroFramePending = false;
        syncFloatingTitleCore();
      });
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
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const sourceRect = heroTitle.getBoundingClientRect();
      const navRect = topbar.getBoundingClientRect();
      const targetDockFontPx = HERO_DOCK_TARGET_FONT_PT * CSS_PT_TO_PX;
      const liveSourceFontPx =
        parseFloat(getComputedStyle(heroTitleLink).fontSize) || targetDockFontPx;
      if (!(lockedSourceFontPx > 0)) {
        lockedSourceFontPx = liveSourceFontPx;
      }
      const sourceFontPx = lockedSourceFontPx;
      endScale = clamp(targetDockFontPx / sourceFontPx, 0.08, 0.4);
      startTop = sourceRect.top;
      sourceAbsTop = sourceRect.top + currentScrollY;
      if (!(sourceRectHeight > 0)) {
        sourceRectHeight = sourceRect.height;
      }
      const baseSourceHeight = sourceRectHeight > 0 ? sourceRectHeight : sourceRect.height;
      {
        const dockOffsetPx = getHeroDockOffsetPx();
        // Dock to the fixed nav-bar center to keep hero text independent from link collapse.
        const navCenterY = navRect.top + navRect.height * 0.5;
        const heroBottomAbs = mainHeroSplit.getBoundingClientRect().bottom + currentScrollY;
        const endScaleY = endScale * verticalStretch;
        // Solve endpoint scroll so shrink completes when title center aligns with nav-link-row center.
        const endpointScrollY =
          heroBottomAbs -
          HERO_TITLE_BOTTOM_GAP_END_PX -
          baseSourceHeight * endScaleY * 0.5 +
          dockOffsetPx -
          navCenterY;
        dockTop =
          navCenterY -
          baseSourceHeight * endScaleY * 0.5;
        dockScrollY = Math.max(1, endpointScrollY);
      }
      /* Stay hidden until syncFloatingTitle applies transform (avoid flash at top:0). */
    };

    const remeasureAndSyncFloatingTitle = () => {
      measure();
      requestSyncFloatingTitle();
    };

    const syncFloatingTitleCore = () => {
      const nowTs = performance.now();
      const inRefreshFreeze = nowTs < heroRefreshFreezeUntil;
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const sourceRect = heroTitle.getBoundingClientRect();
      const baseTitleHeight = sourceRectHeight > 0 ? sourceRectHeight : sourceRect.height;
      const navRect = topbar.getBoundingClientRect();

      if (IS_TRADITIONAL_PAGE) {
        const navLiftProgress = clamp(
          (currentScrollY - TRADITIONAL_NAV_START_Y) / TRADITIONAL_NAV_RAMP_PX,
          0,
          1
        );
        const titleShrinkLinear = clamp(
          (currentScrollY - TRADITIONAL_NAV_START_Y) / TRADITIONAL_TITLE_SHRINK_RAMP_PX,
          0,
          1
        );
        const titleShrinkProgress =
          titleShrinkLinear * titleShrinkLinear * (3 - 2 * titleShrinkLinear);
        const dockOffsetPx = getHeroDockOffsetPx();
        // Traditional top state loads from the docked size, expands once, then scrolls normally.
        const topFontPt = HERO_DOCK_TARGET_FONT_PT + 10;
        const topScale = clamp((topFontPt * CSS_PT_TO_PX) / lockedSourceFontPx, 0.08, 0.46);
        if (
          shouldRunTraditionalTitleIntro &&
          !traditionalTitleIntroHasStarted &&
          currentScrollY <= TRADITIONAL_NAV_START_Y
        ) {
          traditionalTitleIntroHasStarted = true;
          traditionalTitleIntroStartTs = nowTs;
        }
        const introLinear = clamp(
          shouldRunTraditionalTitleIntro && traditionalTitleIntroHasStarted
            ? (nowTs - traditionalTitleIntroStartTs) / TRADITIONAL_TITLE_INTRO_MS
            : 0,
          0,
          1
        );
        const introProgress = 1 - Math.pow(1 - introLinear, 3);
        const navIntroLinear = clamp(
          shouldRunTraditionalTitleIntro
            ? (nowTs - traditionalNavLinkIntroStartTs) / TRADITIONAL_NAV_LINK_INTRO_MS
            : 0,
          0,
          1
        );
        const navIntroProgress = 1 - Math.pow(1 - navIntroLinear, 3);
        const introActive =
          shouldRunTraditionalTitleIntro &&
          traditionalTitleIntroHasStarted &&
          currentScrollY <= TRADITIONAL_NAV_START_Y &&
          introProgress < 1;
        const traditionalTopScale = shouldRunTraditionalTitleIntro ? topScale : endScale;
        const topStateScale =
          currentScrollY <= TRADITIONAL_NAV_START_Y
            ? endScale + (traditionalTopScale - endScale) * introProgress
            : traditionalTopScale;
        const fixedScale = topStateScale + (endScale - topStateScale) * titleShrinkProgress;
        const fixedScaleX = fixedScale * horizontalSquish;
        // Keep stretch proportions constant through the entire shrink.
        const fixedScaleY = fixedScale * verticalStretch * TRADITIONAL_VERTICAL_STRETCH_MULTIPLIER;
        const navDockCenterY = navRect.top + navRect.height * 0.5;
        const dockTopLive = navDockCenterY - (baseTitleHeight * fixedScaleY) * 0.5;
        const topDropPx = (1 - titleShrinkProgress) * TRADITIONAL_TOP_TITLE_DROP_PX;
        const dockY = dockTopLive + dockOffsetPx + topDropPx;
        const navFadeProgress = navLiftProgress;
        // Stronger visible expand/collapse on Traditional.
        const navSheetExtraPx = (1 - navLiftProgress) * 40;
        // On entry, links drop into their hero position immediately and quicker than Valerie.
        const topNavLinksProgress = shouldRunTraditionalTitleIntro
          ? 1 - navIntroProgress
          : 0;
        const navLinksLiftProgress = clamp(
          topNavLinksProgress + navLiftProgress * (1 - topNavLinksProgress),
          0,
          1
        );
        const navIsSolid = navFadeProgress > 0.001;

        if (springRaf) {
          window.cancelAnimationFrame(springRaf);
          springRaf = 0;
          springLastTs = 0;
        }
        springInit = true;
        springTargetY = dockY;
        springTargetScaleX = fixedScaleX;
        springTargetScaleY = fixedScaleY;
        if (
          introActive ||
          inRefreshFreeze ||
          !Number.isFinite(springScaleX) ||
          !Number.isFinite(springScaleY)
        ) {
          springY = dockY;
          springScaleX = fixedScaleX;
          springScaleY = fixedScaleY;
        } else {
          // Subtle delayed ease in both directions:
          // slightly quicker when shrinking, slightly softer when expanding back up.
          const TRADITIONAL_SMOOTH_SHRINK = 0.17;
          const TRADITIONAL_SMOOTH_EXPAND = 0.13;
          const isExpanding = fixedScaleY > springScaleY;
          const traditionalSmooth = isExpanding
            ? TRADITIONAL_SMOOTH_EXPAND
            : TRADITIONAL_SMOOTH_SHRINK;
          springY += (dockY - springY) * traditionalSmooth;
          springScaleX += (fixedScaleX - springScaleX) * traditionalSmooth;
          springScaleY += (fixedScaleY - springScaleY) * traditionalSmooth;
        }

        whiteNavActiveForColor = navIsSolid;
        topbar.classList.toggle("nav-sheet-visible", navIsSolid);
        topbar.style.setProperty(
          "--hero-nav-collapse-progress",
          navLiftProgress.toFixed(4)
        );
        topbar.style.setProperty(
          "--hero-nav-lift-progress",
          navLiftProgress.toFixed(4)
        );
        topbar.style.setProperty(
          "--hero-nav-links-progress",
          navLinksLiftProgress.toFixed(4)
        );
        topbar.style.setProperty(
          "--hero-nav-fade-progress",
          navFadeProgress.toFixed(4)
        );
        topbar.style.setProperty(
          "--hero-nav-sheet-extra",
          `${navSheetExtraPx.toFixed(2)}px`
        );

        applyFloatingTransform(springY, springScaleX, springScaleY);
        floatingTitle.style.visibility = "visible";
        floatingTitle.style.opacity = "1";
        floatingTitle.classList.add("is-layout-ready");
        document.body.classList.add("hero-float-ready");
        floatingTitle.style.removeProperty("opacity");
        floatingTitle.style.removeProperty("visibility");
        updateFloatingTitleColor();
        if (introActive) {
          queueTraditionalTitleIntroFrame();
        }
        return;
      }
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
      const isPoppingIn = topbar.classList.contains("topbar-pop-in");
      const isExitExtending = topbar.classList.contains("topbar-exit-extend");
      const navFadeProgress = isSolidNow || isPoppingIn ? 1 : 0;
      const navSheetExtraPx = isExitExtending ? 60 : 0;
      const navLinksLiftProgress = isSolidNow || isPoppingIn ? 1 : 0;
      const whiteNavVisibleNow = isSolidNow || navFadeProgress > 0.001;
      whiteNavActiveForColor = whiteNavVisibleNow;
      topbar.classList.toggle("nav-sheet-visible", navFadeProgress > 0.01);
      const dockOffsetPx = getHeroDockOffsetPx();
      const scale = 1 + (endScale - 1) * scaleEase;
      const scaleX = scale * horizontalSquish;
      const scaleY = scale * verticalStretch;
      const heroRect = mainHeroSplit.getBoundingClientRect();

      const heroAnchoredTop =
        heroRect.bottom - targetHeroBottomGap - baseTitleHeight * scaleY;
      /* Dock to fixed nav-bar center so title is independent from nav-link collapse motion. */
      const navDockCenterY = navRect.top + navRect.height * 0.5;
      const dockTopLive =
        navDockCenterY -
        (baseTitleHeight * scaleY) * 0.5;
      // Never let enlarged Valerie leave the periwinkle section.
      const boundaryTop =
        heroRect.bottom - HERO_MAX_EDGE_LIFT_PX - baseTitleHeight * scaleY;
      const constrainedHeroTop = Math.min(heroAnchoredTop, boundaryTop);
      const dockBlendLinear = clamp(
        (scaleP - HERO_DOCK_BLEND_START) / (1 - HERO_DOCK_BLEND_START),
        0,
        1
      );
      const dockBlend = dockBlendLinear * dockBlendLinear * (3 - 2 * dockBlendLinear);
      const blendedTop =
        constrainedHeroTop + (dockTopLive - constrainedHeroTop) * dockBlend;
      const y = blendedTop + dockOffsetPx;
      const clampedToHeroBoundary = clampTopToPeriwinkleEdge(y, scaleY);
      // Release the hero-edge clamp as we approach nav to prevent a "hold" before docking.
      const boundaryReleaseLinear = clamp((scaleP - 0.56) / 0.34, 0, 1);
      const boundaryRelease =
        boundaryReleaseLinear * boundaryReleaseLinear * (3 - 2 * boundaryReleaseLinear);
      const heroBoundaryY =
        clampedToHeroBoundary + (y - clampedToHeroBoundary) * boundaryRelease;
      const dockStopY = dockTopLive + dockOffsetPx;
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
      if (inRefreshFreeze || !Number.isFinite(springScaleX) || !Number.isFinite(springScaleY)) {
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
      topbar.style.setProperty(
        "--hero-nav-links-progress",
        navLinksLiftProgress.toFixed(4)
      );
      topbar.style.setProperty(
        "--hero-nav-fade-progress",
        navFadeProgress.toFixed(4)
      );
      topbar.style.setProperty(
        "--hero-nav-sheet-extra",
        `${navSheetExtraPx.toFixed(2)}px`
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

    window.addEventListener("home-refresh-sync", () => {
      if (!IS_TRADITIONAL_PAGE || isRefreshLikeLoad) {
        beginHeroRefreshFreeze();
      }
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
  let isLocked = document.body.classList.contains("topbar-static-lock");

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
    } else if (!shouldLockTopbar && (isLocked || document.body.classList.contains("topbar-static-lock"))) {
      document.body.classList.remove("topbar-static-lock");
      document.body.style.removeProperty("--topbar-lock-y");
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

  const requestSyncBurst = () => {
    requestSync();
    window.setTimeout(requestSync, 60);
    window.setTimeout(requestSync, 180);
    window.setTimeout(requestSync, 420);
  };

  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync);
  requestSyncBurst();
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
  // Removed scroll-linked parallax drift for collection rect groups.
  collectionRectGroups.forEach((group) => {
    group.style.transform = "translate3d(0, 0, 0)";
  });
}

const initHomeAccentRectParallax = () => {
  if (!document.body.classList.contains("page-home")) return;
  document.body.dataset.homeGroupedParallax = "1";
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const allBlocks = Array.from(
    document.querySelectorAll(
      ".hero-square-carousel__floral-block, .hero-square-carousel__geo-block, .hero-square-carousel__hopper-block, .hero-square-carousel__matisse-block"
    )
  );
  const anchoredSelectors = [
    ".hero-square-carousel__geo-block--green",
    ".hero-square-carousel__matisse-block--blue",
    ".hero-square-carousel__hopper-block--blue",
  ];
  const anchoredBlocks = allBlocks.filter((node) =>
    anchoredSelectors.some((selector) => node.matches(selector))
  );
  const parallaxScope =
    document.querySelector(".hero-square-carousel-collections") ||
    document.querySelector(".hero-follow-image");

  if (!allBlocks.length || !parallaxScope) return;
  if (prefersReducedMotion) {
    allBlocks.forEach((node) => node.style.setProperty("--accent-parallax-y", "0px"));
    [
      ".hero-square-carousel__kees",
      ".hero-square-carousel__collection-two-text",
      ".hero-square-carousel__collection-three-text",
      ".hero-square-carousel__collection-four-text",
      ".hero-square-carousel__collection-five-text",
    ].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.style.setProperty("--text-section-parallax-y", "0px");
    });
    return;
  }

  anchoredBlocks.forEach((node) => node.style.setProperty("--accent-parallax-y", "0px"));
  const movingBlocks = allBlocks.filter((node) => !anchoredBlocks.includes(node));

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const TEXT_SECTION_PARALLAX_SPEED_MULTIPLIER = 0.72;
  let rafId = 0;

  movingBlocks.forEach((node) => {
    node.style.setProperty("--accent-parallax-transform-duration", "0s");
    node.style.setProperty("--accent-parallax-transform-ease", "linear");
    node.style.transitionDelay = "0s";
    node.style.willChange = "transform";
  });

  const groupSpecs = [
    {
      speed: 0.16,
      max: 88,
      direction: 1,
      members: [
        { selector: ".hero-square-carousel__kees", variableName: "--text-section-parallax-y" },
        { selector: ".hero-traditional-layout #traditional-orange-strip", variableName: "--traditional-parallax-y" },
      ],
    },
    {
      speed: 0.16,
      max: 92,
      direction: 1,
      members: [
        { selector: ".hero-square-carousel__collection-two-text", variableName: "--text-section-parallax-y" },
        { selector: ".hero-square-carousel__floral-block--red", variableName: "--accent-parallax-y" },
        { selector: ".hero-square-carousel__floral-block--pink", variableName: "--accent-parallax-y" },
      ],
    },
    {
      speed: 0.155,
      max: 88,
      direction: 1,
      members: [
        { selector: ".hero-square-carousel__collection-three-text", variableName: "--text-section-parallax-y" },
        { selector: ".hero-square-carousel__geo-block--tan", variableName: "--accent-parallax-y" },
        { selector: ".hero-square-carousel__geo-block--purple", variableName: "--accent-parallax-y" },
      ],
    },
    {
      speed: 0.15,
      max: 84,
      direction: 1,
      members: [
        { selector: ".hero-square-carousel__collection-four-text", variableName: "--text-section-parallax-y" },
        { selector: ".hero-square-carousel__hopper-block--sand", variableName: "--accent-parallax-y" },
        { selector: ".hero-square-carousel__hopper-block--magenta", variableName: "--accent-parallax-y" },
      ],
    },
    {
      speed: 0.14,
      max: 80,
      direction: 1,
      members: [
        { selector: ".hero-square-carousel__collection-five-text", variableName: "--text-section-parallax-y" },
        { selector: ".hero-square-carousel__matisse-block--pink", variableName: "--accent-parallax-y" },
        { selector: ".hero-square-carousel__matisse-block--periwinkle", variableName: "--accent-parallax-y" },
      ],
    },
  ];

  const groupedNodes = new Set();
  const groupStates = [];
  groupSpecs.forEach((group) => {
    const members = [];
    let textNode = null;
    group.members.forEach((member) => {
      const node = document.querySelector(member.selector);
      if (!node) return;
      members.push({
        node,
        variableName: member.variableName,
      });
      if (!textNode && member.variableName === "--text-section-parallax-y") {
        textNode = node;
      }
      groupedNodes.add(node);
      node.style.willChange = "transform";
      if (member.variableName === "--text-section-parallax-y") {
        node.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
      }
    });
    if (members.length) {
      const root = textNode || members[0].node;
      groupStates.push({
        members,
        textNode,
        root,
        speed: group.speed,
        max: group.max,
        direction: group.direction,
      });
    }
  });

  const sharedBlocks = movingBlocks.filter((node) => !groupedNodes.has(node));
  const yellowRect = document.querySelector(".hero-square-carousel__matisse-block--pink");
  const traditionalUnderNavyRect = document.querySelector(
    ".hero-traditional-layout .hero-square-carousel__kees-rect--yellow"
  );
  const traditionalUnderNavyAnchor = traditionalUnderNavyRect?.closest(
    ".hero-traditional-layout"
  );
  if (traditionalUnderNavyRect) traditionalUnderNavyRect.style.willChange = "transform";

  const applyAlwaysOnRectParallax = (node, speed, max, direction = 1) => {
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const viewportCenter = window.innerHeight * 0.5;
    const nodeCenter = rect.top + rect.height * 0.5;
    const delta = nodeCenter - viewportCenter;
    const y = clamp(delta * speed * direction, -max, max);
    node.style.setProperty("--accent-parallax-y", `${y.toFixed(2)}px`);
  };

  const applyDownwardScrollParallax = (node, anchorNode, speed, max, variableName) => {
    if (!node || !anchorNode) return;
    const rect = anchorNode.getBoundingClientRect();
    const activationLine = window.innerHeight * 0.82;
    const activeDistance = Math.max(0, activationLine - rect.top);
    const y = clamp(activeDistance * speed, 0, max);
    node.style.setProperty(variableName, `${y.toFixed(2)}px`);
  };

  const render = () => {
    const viewportCenter = window.innerHeight * 0.5;

    // Keep non-grouped accents fixed so they do not drift unexpectedly.
    sharedBlocks.forEach((node) => {
      node.style.setProperty("--accent-parallax-y", "0px");
    });

    groupStates.forEach((group) => {
      const textReady =
        !group.textNode ||
        !group.textNode.classList.contains("scroll-reveal") ||
        group.textNode.classList.contains("is-revealed");

      const rootRect = group.root.getBoundingClientRect();
      const rootCenter = rootRect.top + rootRect.height * 0.5;
      const delta = rootCenter - viewportCenter;
      const y = clamp(
        delta * group.speed * group.direction,
        -group.max,
        group.max
      );
      const textY = clamp(
        delta * group.speed * TEXT_SECTION_PARALLAX_SPEED_MULTIPLIER * group.direction,
        -group.max * TEXT_SECTION_PARALLAX_SPEED_MULTIPLIER,
        group.max * TEXT_SECTION_PARALLAX_SPEED_MULTIPLIER
      );
      const yValue = `${y.toFixed(2)}px`;
      const textYValue = `${textY.toFixed(2)}px`;
      group.members.forEach((member) => {
        const isTextMember = member.variableName === "--text-section-parallax-y";
        if (isTextMember && !textReady) {
          member.node.style.setProperty(member.variableName, "0px");
          return;
        }
        member.node.style.setProperty(member.variableName, isTextMember ? textYValue : yValue);
      });
    });

    // Keep yellow moving independently of the grouped text reveal timing.
    applyAlwaysOnRectParallax(yellowRect, 0.2, 820, 1);
    applyDownwardScrollParallax(
      traditionalUnderNavyRect,
      traditionalUnderNavyAnchor,
      0.028,
      58,
      "--traditional-under-navy-parallax-y"
    );
    rafId = 0;
  };

  const requestUpdate = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(render);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("load", requestUpdate, { once: true });
  requestUpdate();
};

initHomeAccentRectParallax();

const initHomeTextSectionParallax = () => {
  if (!document.body.classList.contains("page-home")) return;
  if (document.body.dataset.homeGroupedParallax === "1") return;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const configs = [
    { selector: ".hero-square-carousel__kees", speed: 0.109, max: 37 },
    { selector: ".hero-square-carousel__collection-three-text", speed: 0.115, max: 37 },
    { selector: ".hero-square-carousel__collection-four-text", speed: 0.115, max: 37 },
    { selector: ".hero-square-carousel__collection-five-text", speed: 0.115, max: 37 },
  ];

  const items = configs
    .map((config) => {
      const node = document.querySelector(config.selector);
      if (!node) return null;
      return {
        node,
        speed: config.speed,
        max: config.max,
        revealRoot: node.classList.contains("scroll-reveal") ? node : null,
        readyAtMs: 0,
        transformUnlocked: false,
      };
    })
    .filter(Boolean);

  if (!items.length) return;
  if (prefersReducedMotion) {
    items.forEach((item) =>
      item.node.style.setProperty("--text-section-parallax-y", "0px")
    );
    return;
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const REVEAL_COMPLETE_WAIT_MS = 1900;
  const readBuffer = new Array(items.length);
  let rafPending = false;

  const updateNow = () => {
    const now = performance.now();
    const viewportCenter = window.innerHeight * 0.5;

    items.forEach((item, index) => {
      readBuffer[index] = item.node.getBoundingClientRect();
    });

    items.forEach((item, index) => {
      const isRevealed = !item.revealRoot || item.revealRoot.classList.contains("is-revealed");
      if (!isRevealed) {
        item.readyAtMs = 0;
        item.transformUnlocked = false;
        item.node.style.setProperty("--text-section-parallax-y", "0px");
        return;
      }

      if (!item.readyAtMs) {
        item.readyAtMs = now + REVEAL_COMPLETE_WAIT_MS;
      }

      if (now < item.readyAtMs) {
        item.node.style.setProperty("--text-section-parallax-y", "0px");
        return;
      }

      if (!item.transformUnlocked) {
        item.transformUnlocked = true;
        item.node.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
        item.node.style.willChange = "transform";
      }

      const rect = readBuffer[index];
      const nodeCenter = rect.top + rect.height * 0.5;
      const delta = nodeCenter - viewportCenter;
      const y = clamp(delta * item.speed, -item.max, item.max);
      item.node.style.setProperty("--text-section-parallax-y", `${y.toFixed(2)}px`);
    });
  };

  const requestUpdate = () => {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(() => {
      rafPending = false;
      updateNow();
    });
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("load", requestUpdate, { once: true });
  requestUpdate();
};

initHomeTextSectionParallax();

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

const initPostHeroScrollReveal = () => {
  if (!document.body.classList.contains("page-home")) return;

  const heroSplit = document.querySelector("body.page-home > section.split:first-of-type");
  if (!heroSplit) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealTargets = [];
  const scrollGatedTargets = [];
  const TEXT_AFTER_RECTANGLES_DELAY_MS = 320;
  const TRADITIONAL_TEXT_DELAY_MS = TEXT_AFTER_RECTANGLES_DELAY_MS;
  const CHILD_REVEAL_STAGGER_MS = 140;

  const addRevealItem = (node, delayMs, options = {}) => {
    if (!node || node.nodeType !== 1 || node.classList.contains("scroll-reveal")) return;
    node.classList.add("scroll-reveal");
    if (options.noLift) {
      node.classList.add("scroll-reveal-no-lift");
    }
    if (options.requiresScroll) {
      node.dataset.revealRequiresScroll = "true";
      scrollGatedTargets.push(node);
    }
    node.style.setProperty("--reveal-delay", `${Math.max(0, delayMs)}ms`);
    revealTargets.push(node);
  };

  for (let block = heroSplit.nextElementSibling; block; block = block.nextElementSibling) {
    if (block.matches("nav#navOverlay, nav.nav-overlay")) continue;
    if (!block.matches("section, footer")) continue;
    if (block.id === "collection") continue;

    if (block.classList.contains("hero-follow-image")) {
      const isTraditionalIntroSection = block.classList.contains(
        "hero-follow-image--traditional-intro"
      );
      if (isTraditionalIntroSection) {
        addRevealItem(block, 0, { noLift: true });

        const introCopy = block.querySelector(".traditional-intro-copy");
        const introLinks = block.querySelector(".traditional-intro-links");
        if (introCopy) addRevealItem(introCopy, 120);
        if (introLinks) addRevealItem(introLinks, 300);
      }

      const revealNodes = [];
      const addIfFound = (selector, options = {}) => {
        const node = block.querySelector(selector);
        if (node) {
          if (options.useRevealItem) {
            addRevealItem(node, options.delayMs || 0, options.revealOptions || {});
          } else {
            revealNodes.push(node);
          }
        }
      };

      addIfFound(".hero-follow-image__mark");
      addIfFound(".hero-follow-image__sub");
      addIfFound(".hero-follow-image__contact");
      // Keep the hero square carousel static on scroll; no reveal-driven lift.
      addIfFound(".hero-square-carousel");

      const traditionalLayout = block.querySelector(".hero-traditional-layout");
      if (traditionalLayout) {
        const traditionalRects = traditionalLayout.querySelector(".hero-square-carousel__diag-stack");
        const traditionalText = traditionalLayout.querySelector(".hero-square-carousel__kees");
        if (traditionalRects) {
          addRevealItem(traditionalRects, 0);
        }
        if (traditionalText) {
          addRevealItem(
            traditionalText,
            traditionalRects ? TRADITIONAL_TEXT_DELAY_MS : 0
          );
        }
        if (!traditionalRects && !traditionalText) revealNodes.push(traditionalLayout);
      }

      const collectionsWrap = block.querySelector(".hero-square-carousel-collections");
      if (collectionsWrap) {
        const collectionSections = Array.from(collectionsWrap.children).filter(
          (el) => el.nodeType === 1 && el.matches("section")
        );
        collectionSections.forEach((section) => {
          const sectionDelayMs = 0;
          const pieces = Array.from(section.children).filter((el) => el.nodeType === 1);
          if (pieces.length) {
            const imagePiece = pieces.find((el) => String(el.className || "").includes("image-wrap")) || null;
            const textPiece = pieces.find((el) => String(el.className || "").includes("-text")) || null;

            if (imagePiece) {
              addRevealItem(imagePiece, sectionDelayMs);
            }
            if (textPiece) {
              addRevealItem(
                textPiece,
                  sectionDelayMs +
                  (imagePiece ? TEXT_AFTER_RECTANGLES_DELAY_MS : 0),
                { noLift: true }
              );
            }

            const extraPieces = pieces.filter((el) => el !== imagePiece && el !== textPiece);
            extraPieces.forEach((piece, idx) => {
              addRevealItem(
                piece,
                sectionDelayMs +
                  (imagePiece ? TEXT_AFTER_RECTANGLES_DELAY_MS : 0) +
                  CHILD_REVEAL_STAGGER_MS * (idx + 1)
              );
            });
          } else {
            addRevealItem(section, sectionDelayMs);
          }
        });
      } else {
        addIfFound(".hero-square-carousel-collections");
      }

      revealNodes.forEach((el, i) =>
        addRevealItem(el, i * CHILD_REVEAL_STAGGER_MS)
      );
      continue;
    }

    if (block.classList.contains("traditional-copy-block")) {
      // This block handles its own one-time body-copy waterfall animation.
      continue;
    }

    if (block.classList.contains("traditional-sequence")) {
      continue;
    }

    const directChildren = Array.from(block.children).filter((el) => el.nodeType === 1);
    const revealNodes = directChildren.length > 1 ? directChildren.slice(0, 6) : [block];
    revealNodes.forEach((el, i) =>
      addRevealItem(el, i * CHILD_REVEAL_STAGGER_MS)
    );
  }

  if (!revealTargets.length) return;

  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((node) => node.classList.add("is-revealed"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (
          entry.target.dataset.revealRequiresScroll === "true" &&
          window.scrollY <= 2
        ) {
          return;
        }
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.001,
      rootMargin: "0px 0px -2% 0px",
    }
  );

  revealTargets.forEach((node) => revealObserver.observe(node));

  if (scrollGatedTargets.length) {
    const revealScrollGatedTargets = () => {
      if (window.scrollY <= 2) return;
      scrollGatedTargets.forEach((node) => {
        if (node.classList.contains("is-revealed")) return;
        const rect = node.getBoundingClientRect();
        const inView = rect.top <= window.innerHeight * 0.92 && rect.bottom >= 0;
        if (!inView) return;
        node.classList.add("is-revealed");
        revealObserver.unobserve(node);
      });
    };

    window.addEventListener("scroll", revealScrollGatedTargets, { passive: true });
    window.addEventListener("resize", revealScrollGatedTargets, { passive: true });
    window.addEventListener("load", revealScrollGatedTargets, { once: true });
  }
};

initPostHeroScrollReveal();

const lockHomeHeroPosition = () => {
  if (!document.body.classList.contains("page-home")) return;
  const hero = document.querySelector("body.page-home > section.split:first-of-type");
  if (!hero) return;
  const lockedNodes = [
    hero,
    ...hero.querySelectorAll(".split__rugs, .split__rug, .split__rug img"),
  ];
  lockedNodes.forEach((node) => {
    node.classList.remove("scroll-reveal", "is-revealed", "scroll-reveal-no-lift");
    node.style.removeProperty("--reveal-delay");
    node.style.transform = node.matches(".split__rug img")
      ? "translate3d(0, var(--hero-image-lock-y, 36px), 0) scale(var(--hero-image-lock-scale, 1.14))"
      : "none";
  });
};

let homeHeroPositionLockRaf = 0;
const requestHomeHeroPositionLock = () => {
  if (homeHeroPositionLockRaf) return;
  homeHeroPositionLockRaf = window.requestAnimationFrame(() => {
    homeHeroPositionLockRaf = 0;
    lockHomeHeroPosition();
  });
};

const lockHomeStaticScrollTargets = () => {
  if (!document.body.classList.contains("page-home")) return;
  const targets = document.querySelectorAll(
    ".hero-square-carousel, .hero-square-carousel__collection-two, .hero-square-carousel__collection-two-collage-overlay"
  );
  targets.forEach((node) => {
    node.classList.remove("scroll-reveal", "is-revealed", "scroll-reveal-no-lift");
    node.style.removeProperty("--reveal-delay");
  });
};

lockHomeHeroPosition();
lockHomeStaticScrollTargets();
initFixedOneShotReveals();
window.addEventListener("load", lockHomeHeroPosition, { once: true });
window.addEventListener("pageshow", lockHomeHeroPosition);
window.addEventListener("resize", lockHomeHeroPosition, { passive: true });
window.addEventListener("scroll", requestHomeHeroPositionLock, { passive: true });

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
