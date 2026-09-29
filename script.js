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

  // Subscribe
  var form = $("subform"), email = $("email"), msg = $("formmsg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = email.value.trim();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    msg.classList.toggle("is-error", !ok);
    email.setAttribute("aria-invalid", String(!ok));
    if (!ok) {
      msg.textContent = "Enter an email address like name@example.com.";
      email.focus();
      return;
    }
    msg.textContent = "Subscribed. New posts will arrive at " + v + ".";
    email.value = "";
  });
  email.addEventListener("input", function () {
    email.removeAttribute("aria-invalid");
    msg.classList.remove("is-error");
  });

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
