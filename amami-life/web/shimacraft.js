// Dismiss a lightweight dialog only when both pointer ends are on its backdrop.
// A drag that starts inside a sheet must not discard the current interaction.
for (const dialog of document.querySelectorAll("dialog")) {
  let startedOutside = false;
  const outside = (event) => {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  dialog.addEventListener("pointerdown", (event) => {
    startedOutside = event.target === dialog && outside(event);
  });
  dialog.addEventListener("pointerup", (event) => {
    if (startedOutside && event.target === dialog && outside(event)) dialog.close();
    startedOutside = false;
  });
  dialog.addEventListener("pointercancel", () => { startedOutside = false; });
  dialog.addEventListener("close", () => { startedOutside = false; });
}

// Animate only deliberate page navigation, never incoming weather/tide updates.
// Content is visible and functional even if motion is unsupported or cancelled.
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let pageMotion = null;
const settlePage = () => {
  pageMotion?.cancel();
  pageMotion = null;
  if (motionPreference.matches || !document.getElementById("content").animate) return;
  pageMotion = document.getElementById("content").animate(
    [{ transform: "translateY(8px)" }, { transform: "translateY(0)" }],
    { duration: 260, easing: "cubic-bezier(.2,.75,.25,1)" },
  );
};
document.addEventListener("amami:view-rendered", (event) => {
  if (event.detail.pageChanged) settlePage();
});
motionPreference.addEventListener("change", () => {
  if (motionPreference.matches) { pageMotion?.cancel(); pageMotion = null; }
});
