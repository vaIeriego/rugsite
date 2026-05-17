(() => {
  const protectImage = (img) => {
    if (!(img instanceof HTMLImageElement)) return;
    img.draggable = false;
    img.setAttribute("draggable", "false");
    img.style.webkitUserDrag = "none";
    img.style.userSelect = "none";
    img.style.webkitTouchCallout = "none";
  };

  const protectAllImages = (root = document) => {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("img").forEach(protectImage);
  };

  const isImageTarget = (target) =>
    target instanceof Element && !!target.closest("img");

  document.addEventListener("dragstart", (e) => {
    if (isImageTarget(e.target)) e.preventDefault();
  });

  document.addEventListener("contextmenu", (e) => {
    if (isImageTarget(e.target)) e.preventDefault();
  });

  document.addEventListener("mousedown", (e) => {
    if (e.button === 1 && isImageTarget(e.target)) e.preventDefault();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => protectAllImages(), {
      once: true
    });
  } else {
    protectAllImages();
  }

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.tagName === "IMG") protectImage(node);
          protectAllImages(node);
        }
      }
    });
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }
})();