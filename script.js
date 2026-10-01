(function () {
  "use strict";

  // ---- Sanity project settings — fill these in ----
  var SANITY_PROJECT_ID = "xbcsr11a";
  var SANITY_DATASET = "production";
  var SANITY_API_VERSION = "2024-01-01";

  var AUTHOR = "Benard Masila";

  var GROQ = '*[_type == "post" && defined(slug.current)] | order(publishedAt desc){' +
    '"id": slug.current,' +
    'title,' +
    'excerpt,' +
    'featured,' +
    'tags,' +
    '"date": publishedAt,' +
    '"img": mainImage.asset->url,' +
    '"imgAlt": mainImage.alt,' +
    'body[]{..., _type == "image" => {..., "asset": asset->{url}}}' +
  '}';

  function sanityQueryUrl(groq) {
    return "https://" + SANITY_PROJECT_ID + ".apicdn.sanity.io/v" +
      SANITY_API_VERSION + "/data/query/" + SANITY_DATASET +
      "?query=" + encodeURIComponent(groq);
  }

  function imageUrl(url, opts) {
    // Sanity's image CDN accepts resize/crop/format params directly on the asset URL.
    if (!url) return "";
    var q = opts || "w=1200&auto=format";
    return url + "?" + q;
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // ---- Portable Text -> HTML ----
  // Groups consecutive bullet-list blocks into a single <ul>, renders the
  // "note" style as the highlighted takeaway box, and drops in inline images.
  function blockText(block) {
    if (!block.children) return "";
    return block.children.map(function (c) { return c.text || ""; }).join("");
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderInline(block) {
    // Basic mark support: strong/em. Good enough for article body text.
    if (!block.children) return "";
    return block.children.map(function (span) {
      var text = escapeHTML(span.text || "");
      var marks = span.marks || [];
      if (marks.indexOf("strong") !== -1) text = "<strong>" + text + "</strong>";
      if (marks.indexOf("em") !== -1) text = "<em>" + text + "</em>";
      return text;
    }).join("");
  }

  function portableTextToHTML(blocks) {
    if (!blocks || !blocks.length) return "";
    var html = "";
    var i = 0;
    while (i < blocks.length) {
      var b = blocks[i];

      if (b._type === "image") {
        var src = b.asset && b.asset.url;
        html += src
          ? '<figure class="reader__img"><img src="' + imageUrl(src, "w=1200&auto=format") + '" alt="' + escapeHTML(b.alt || "") + '" loading="lazy"></figure>'
          : "";
        i++;
        continue;
      }

      if (b.listItem === "bullet") {
        var items = "";
        while (i < blocks.length && blocks[i].listItem === "bullet") {
          items += "<li>" + renderInline(blocks[i]) + "</li>";
          i++;
        }
        html += "<ul>" + items + "</ul>";
        continue;
      }

      if (b.style === "h2") {
        html += "<h2>" + renderInline(b) + "</h2>";
      } else if (b.style === "note") {
        html += '<p class="reader__note">' + renderInline(b) + "</p>";
      } else {
        html += "<p>" + renderInline(b) + "</p>";
      }
      i++;
    }
    return html;
  }

  // ---- App state ----
  var ALL = [];       // every post, featured first
  var FEATURED = null;
  var POSTS = [];      // non-featured posts
  var CATEGORIES = ["All"];
  var state = { cat: "All" };

  function $(id) { return document.getElementById(id); }

  function metaRow(p) {
    return '<div class="meta">' +
      '<span><svg class="icon" aria-hidden="true"><use href="#i-cal"/></svg>' + escapeHTML(p.date) + '</span>' +
      '<span><svg class="icon" aria-hidden="true"><use href="#i-clock"/></svg>' + p.read + ' min read</span>' +
      '</div>';
  }
  function byRow(p) {
    var tags = (p.tags || []).map(function (t) { return '<span class="tag">' + escapeHTML(t) + '</span>'; }).join("");
    return '<div class="by"><span class="avatar" aria-hidden="true"></span><span class="name">' + AUTHOR + '</span>' + tags + '</div>';
  }
  function postHref(p) { return "#read-" + p.id; }

  function readMore(p) {
    return '<a class="readmore" href="' + postHref(p) + '" data-open="' + p.id + '" aria-label="Read more: ' + escapeHTML(p.title) + '">' +
      'Read more<svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>';
  }
  function titleLink(p) {
    return '<h3><a href="' + postHref(p) + '" data-open="' + p.id + '">' + escapeHTML(p.title) + '</a></h3>';
  }
  function thumbImg(p, cls) {
    var url = imageUrl(p.img, "w=800&h=500&fit=crop&auto=format");
    return '<a class="thumb ' + (cls || "") + '" href="' + postHref(p) + '" data-open="' + p.id + '" tabindex="-1" aria-hidden="true">' +
      (url ? '<img src="' + url + '" alt="" loading="lazy">' : "") + '</a>';
  }
  function cardHTML(p) {
    return '<article class="card" data-post="' + p.id + '">' +
      thumbImg(p) +
      metaRow(p) +
      titleLink(p) +
      '<p class="excerpt">' + escapeHTML(p.excerpt || "") + '</p>' +
      readMore(p) +
      byRow(p) +
      '</article>';
  }

  function renderFeatured() {
    var card = $("featuredCard");
    if (!FEATURED) { card.innerHTML = ""; return; }
    var p = FEATURED;
    card.setAttribute("data-post", p.id);
    card.innerHTML =
      thumbImg(p, "thumb--featured") +
      '<div class="featured__body">' +
      metaRow(p) +
      titleLink(p) +
      '<p class="excerpt">' + escapeHTML(p.excerpt || "") + '</p>' +
      readMore(p) +
      byRow(p) +
      '</div>';
  }

  function renderFilters() {
    $("filters").innerHTML = CATEGORIES.map(function (c) {
      return '<li><button type="button" class="chip" data-cat="' + escapeHTML(c) + '" aria-pressed="' + (c === state.cat) + '">' + escapeHTML(c) + '</button></li>';
    }).join("");
  }

  function renderLatest() {
    var list = POSTS.filter(function (p) {
      return state.cat === "All" || (p.tags || []).indexOf(state.cat) !== -1;
    });
    $("latestGrid").innerHTML = list.map(cardHTML).join("");
    $("status").textContent = state.cat !== "All"
      ? "Showing " + list.length + (list.length === 1 ? " post" : " posts") + " in " + state.cat
      : "";
  }

  // ----- Events -----
  document.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-cat]");
    if (chip) {
      state.cat = chip.getAttribute("data-cat");
      renderFilters(); renderLatest();
      return;
    }
    var opener = e.target.closest("[data-open]");
    if (opener) {
      e.preventDefault();
      openPost(opener.getAttribute("data-open"));
      return;
    }
    var card = e.target.closest("[data-post]");
    if (card && !e.target.closest("a,button")) {
      openPost(card.getAttribute("data-post"));
      return;
    }
    var soon = e.target.closest("[data-soon]");
    if (soon) {
      e.preventDefault();
      toast("Full post and profile pages aren\u2019t part of this layout yet.");
    }
  });

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2600);
  }

  // ----- Article reader -----
  var reader = $("reader");

  function openPost(id) {
    var idx = -1;
    ALL.forEach(function (p, i) { if (p.id === id) idx = i; });
    if (idx < 0) return;
    var p = ALL[idx], next = ALL[(idx + 1) % ALL.length];
    var url = imageUrl(p.img, "w=1600&auto=format");
    var img = url
      ? '<div class="thumb thumb--featured"><img src="' + url + '" alt="' + escapeHTML(p.imgAlt || "") + '"></div>'
      : "";

    $("readerBody").innerHTML =
      img +
      '<div class="reader__content">' +
        metaRow(p) +
        '<h1 id="readerTitle">' + escapeHTML(p.title) + '</h1>' +
        byRow(p) +
        '<div class="reader__text">' + portableTextToHTML(p.body) + '</div>' +
        '<div class="reader__next">' +
          '<span class="reader__nextlabel">Up next</span>' +
          '<a href="' + postHref(next) + '" data-open="' + next.id + '">' + escapeHTML(next.title) + '</a>' +
        '</div>' +
        '<button type="button" class="reader__back" data-close-reader>Back to all posts</button>' +
      '</div>';

    if (!reader.open) {
      if (typeof reader.showModal === "function") reader.showModal();
      else reader.setAttribute("open", "");
    }
    document.documentElement.classList.add("is-locked");
    reader.scrollTop = 0;
  }

  function closeReader() {
    if (reader.open) reader.close();
  }
  reader.addEventListener("close", function () {
    document.documentElement.classList.remove("is-locked");
  });
  reader.addEventListener("click", function (e) {
    if (e.target === reader || e.target.closest("[data-close-reader]") || e.target.closest("#readerClose")) closeReader();
  });

  // Follow me: reveal / hide the floating LinkedIn icon
  var followBtn = $("followBtn"), liFloat = $("liFloat");
  function setFollow(on) {
    liFloat.classList.toggle("is-on", on);
    followBtn.setAttribute("aria-expanded", String(on));
  }
  followBtn.addEventListener("click", function () {
    setFollow(!liFloat.classList.contains("is-on"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && liFloat.classList.contains("is-on")) setFollow(false);
  });

  // Nav highlight
  var links = document.querySelectorAll(".nav__links a:not(.btn-contact)");
  links.forEach(function (a) {
    a.addEventListener("click", function () {
      links.forEach(function (l) { l.removeAttribute("aria-current"); });
      a.setAttribute("aria-current", "true");
    });
  });

  // Subscribe: handled by the EmailOctopus embed in index.html

  // ---- Load posts from Sanity ----
  function wordsInBody(body) {
    return (body || [])
      .filter(function (b) { return b._type !== "image"; })
      .map(blockText)
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function boot(posts) {
    posts.forEach(function (p) {
      p.date = fmtDate(p.date);
      p.read = Math.max(1, Math.round(wordsInBody(p.body) / 200));
    });

    FEATURED = posts.filter(function (p) { return p.featured; })[0] || posts[0] || null;
    POSTS = posts.filter(function (p) { return !FEATURED || p.id !== FEATURED.id; });
    ALL = FEATURED ? [FEATURED].concat(POSTS) : POSTS;

    var tagSet = {};
    posts.forEach(function (p) { (p.tags || []).forEach(function (t) { tagSet[t] = true; }); });
    CATEGORIES = ["All"].concat(Object.keys(tagSet));

    renderFeatured(); renderFilters(); renderLatest();
    $("status").textContent = posts.length ? "" : "No posts yet. Check back soon.";

    openFromHash();
  }

  // Deep links like /#read-bms open that article directly.
  function openFromHash() {
    var m = /^#read-(.+)$/.exec(location.hash);
    if (m) openPost(decodeURIComponent(m[1]));
  }
  window.addEventListener("hashchange", openFromHash);

  $("status").textContent = "Loading posts\u2026";
  fetch(sanityQueryUrl(GROQ))
    .then(function (r) { return r.json(); })
    .then(function (data) { boot(data.result || []); })
    .catch(function (err) {
      console.error("Failed to load posts from Sanity:", err);
      $("status").textContent = "Couldn\u2019t load posts right now. Please try again shortly.";
    });
})();


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
   Subscribe safety net.
   The email box normally comes from EmailOctopus' script. If that
   script is blocked (ad blocker, privacy extension, bad network) the
   card shows only its label. In that case we build our own visible
   email box + Subscribe button that posts to the same EmailOctopus form.
   --------------------------------------------------------------- */
(function () {
  "use strict";
  var FORM_ID = "8f33b312-bc90-11f1-a127-437308d7de23";
  var HONEYPOT = "hpc4b27b6e-eb38-11e9-be00-06b4694bee2a";
  var ACTION = "https://eocampaign1.com/form/" + FORM_ID;
  var host = document.getElementById("eo-embed");
  if (!host) return;
  var fallback = null;

  function embedWorks() {
    var i = host.querySelector(".emailoctopus-form input[type='email']");
    return !!(i && i.offsetWidth > 40 && i.offsetHeight > 20);
  }

  function build() {
    if (fallback) return;
    fallback = document.createElement("form");
    fallback.className = "sub-fallback";
    fallback.setAttribute("novalidate", "");
    fallback.innerHTML =
      '<div class="sub-fallback__row">' +
        '<input id="field_0" name="field_0" type="email" placeholder="Email address" ' +
          'autocomplete="email" required aria-required="true" aria-label="Email address">' +
        '<button type="submit">Subscribe</button>' +
      '</div>' +
      '<input type="text" name="' + HONEYPOT + '" tabindex="-1" autocomplete="off" ' +
        'aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;width:0">' +
      '<p class="sub-fallback__msg" role="status" aria-live="polite"></p>' +
      '<p class="sub-fallback__credit">Powered by <a href="https://emailoctopus.com/?utm_source=powered_by_form&amp;utm_medium=user_referral" target="_blank" rel="noopener">EmailOctopus</a></p>';
    host.appendChild(fallback);

    var input = fallback.querySelector("#field_0");
    var btn = fallback.querySelector("button");
    var msg = fallback.querySelector(".sub-fallback__msg");

    fallback.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "sub-fallback__msg";
      var v = (input.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        msg.textContent = "Please enter a valid email address.";
        msg.classList.add("is-error");
        input.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = "Subscribing…";
      fetch(ACTION, { method: "POST", body: new FormData(fallback), mode: "no-cors" })
        .then(function () {
          msg.textContent = "Thanks! Check your inbox to confirm your subscription.";
          msg.classList.add("is-ok");
          input.value = "";
        })
        .catch(function () {
          msg.textContent = "Couldn't reach the sign-up service. Check your connection or ad blocker and try again.";
          msg.classList.add("is-error");
        })
        .then(function () {
          btn.disabled = false;
          btn.textContent = "Subscribe";
        });
    });
  }

  function check() {
    if (embedWorks()) {
      if (fallback) { fallback.remove(); fallback = null; }
    } else {
      build();
    }
  }

  function failed() {
    console.warn("EmailOctopus script failed to load (blocked by an extension/network, or offline). Showing backup form.");
    build();
  }
  if (window.__eoFailed) failed();
  host.addEventListener("error", function (e) {
    if (e.target && e.target.tagName === "SCRIPT") failed();
  }, true);

  window.addEventListener("load", function () {
    setTimeout(check, 2500);
    // if EmailOctopus finally loads late, drop our copy
    var n = 0, t = setInterval(function () {
      n++; if (fallback && embedWorks()) check();
      if (n > 10) clearInterval(t);
    }, 2000);
  });
})();

/* Hide the "Enter your email to subscribe" label once someone has subscribed
   (works for the EmailOctopus form and for the backup form). */
(function () {
  "use strict";
  var host = document.getElementById("eo-embed");
  var wrap = host && host.closest(".newsletter__form");
  if (!host || !wrap) return;

  function subscribed() {
    var eo = host.querySelector(".emailoctopus-success-message");
    if (eo && eo.textContent.trim()) return true;
    return !!host.querySelector(".sub-fallback__msg.is-ok");
  }
  function sync() { wrap.classList.toggle("is-subscribed", subscribed()); }

  new MutationObserver(sync).observe(host, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ["class", "style"]
  });
  sync();
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
