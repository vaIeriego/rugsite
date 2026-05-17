/**
 * Forces Traditional collage orange strip dimensions in px (inline !important).
 * Edit ORANGE_EXTRA_PX below — avoids CSS variable/cascade/cache fighting layout.
 */
(function () {
  /** Horizontal pixels added to (400/520) × artboard width */
  var ORANGE_EXTRA_PX = -71;
  var HEIGHT_SUBTRACT_PX = 44;
  /** Multiply final orange strip width/height (1 = default). */
  var ORANGE_SCALE = 1.2;

  function applyOrangeStripSize() {
    var frame = document.getElementById("traditional-orange-strip");
    if (!frame) return;
    var rects = frame.closest(".hero-square-carousel__kees-rects");
    if (!rects) return;
    var rw = rects.getBoundingClientRect().width;
    var rh = rects.getBoundingClientRect().height;
    if (rw < 1 || rh < 1) return;

    var widthPx =
      ((400 / 520) * rw + ORANGE_EXTRA_PX) * ORANGE_SCALE;
    var heightPx =
      ((311 / 520) * rh - HEIGHT_SUBTRACT_PX) * ORANGE_SCALE;

    frame.style.setProperty("width", widthPx + "px", "important");
    frame.style.setProperty("height", Math.max(2, heightPx) + "px", "important");
    frame.style.setProperty("max-width", "none", "important");
    frame.style.setProperty("z-index", "25", "important");
    frame.style.setProperty("background-color", "#d35a1a", "important");

    requestAnimationFrame(function () {
      updateMeasureOverlay(frame, widthPx, heightPx);
    });
  }

  /** Shows rendered box size from layout (authoritative), not just the formula. */
  function updateMeasureOverlay(frame, targetW, targetH) {
    var r = frame.getBoundingClientRect();
    var rw = Math.round(r.width);
    var rh = Math.round(r.height);
    var label = frame.querySelector(".traditional-orange-strip__measure");
    if (!label) {
      label = document.createElement("span");
      label.className = "traditional-orange-strip__measure";
      label.setAttribute("aria-hidden", "true");
      frame.appendChild(label);
    }
    label.textContent = rw + " × " + rh + " px";
    frame.setAttribute(
      "title",
      "Rendered " +
        rw +
        " × " +
        rh +
        " px · target " +
        Math.round(targetW) +
        " × " +
        Math.round(targetH)
    );
  }

  function init() {
    applyOrangeStripSize();
    requestAnimationFrame(function () {
      requestAnimationFrame(applyOrangeStripSize);
    });
    window.addEventListener(
      "resize",
      function () {
        requestAnimationFrame(applyOrangeStripSize);
      },
      { passive: true }
    );
    window.addEventListener(
      "load",
      function () {
        requestAnimationFrame(applyOrangeStripSize);
      },
      { once: true }
    );

    var frame = document.getElementById("traditional-orange-strip");
    if (frame && typeof ResizeObserver !== "undefined") {
      var rects = frame.closest(".hero-square-carousel__kees-rects");
      if (rects) {
        var ro = new ResizeObserver(function () {
          requestAnimationFrame(applyOrangeStripSize);
        });
        ro.observe(rects);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();