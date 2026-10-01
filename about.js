// Back-to-top arrow: appears as the reader nears the footer
(function () {
  "use strict";
  var btn = document.getElementById("toTop");
  var foot = document.querySelector(".footer");
  var top = document.getElementById("top");
  if (!btn || !foot) return;
  if (top) top.setAttribute("tabindex", "-1");

  var shown = false, ticking = false;
  function set(on) {
    if (on === shown) return;
    shown = on;
    btn.classList.toggle("is-visible", on);
    btn.setAttribute("tabindex", on ? "0" : "-1");
  }
  function check() {
    ticking = false;
    var nearFooter = foot.getBoundingClientRect().top < window.innerHeight + 260;
    set(nearFooter && window.scrollY > 300);
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(check); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", check);
  check();

  btn.addEventListener("click", function () {
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
    if (top) top.focus({ preventScroll: true });
  });
})();

/* ---------------------------------------------------------------
   Mobile menu: hamburger opens a slide-in sidebar (<= 860px).
   Esc / backdrop / close button / choosing a link all close it,
   focus stays inside while open and returns to the button after.
   --------------------------------------------------------------- */
(function () {
  "use strict";
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("siteNav");
  var backdrop = document.getElementById("navBackdrop");
  var closeBtn = document.getElementById("navClose");
  var bar = document.querySelector(".bar");
  if (!toggle || !nav || !backdrop || !bar) return;
  var mq = window.matchMedia("(max-width: 860px)");
  var html = document.documentElement;

  function isOpen() { return nav.classList.contains("is-open"); }
  function focusables() {
    return Array.prototype.slice.call(nav.querySelectorAll("a[href], button:not([disabled])"))
      .filter(function (el) { return el.offsetParent !== null; });
  }
  function open() {
    if (!mq.matches || isOpen()) return;
    nav.classList.add("is-open");
    backdrop.classList.add("is-open");
    bar.classList.add("is-nav-open");
    html.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    // let the sidebar become visible, then move focus into it
    setTimeout(function () { if (closeBtn) closeBtn.focus(); }, 30);
  }
  function close(returnFocus) {
    if (!isOpen()) return;
    nav.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    html.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    setTimeout(function () { bar.classList.remove("is-nav-open"); }, 330);
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener("click", function () { isOpen() ? close(true) : open(); });
  if (closeBtn) closeBtn.addEventListener("click", function () { close(true); });
  backdrop.addEventListener("click", function () { close(true); });
  nav.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (a && a.getAttribute("href").charAt(0) === "#") close(false);
  });
  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") { e.preventDefault(); close(true); return; }
    if (e.key !== "Tab") return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // growing the window back to desktop: reset everything
  var onChange = function () { if (!mq.matches) { close(false); bar.classList.remove("is-nav-open"); } };
  if (mq.addEventListener) mq.addEventListener("change", onChange); else mq.addListener(onChange);
})();
