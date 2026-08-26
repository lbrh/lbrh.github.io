/*!
 * PPNYC Document Hub widget
 * Embed with:
 *   <div id="ppnyc-document-hub"></div>
 *   <script src="https://lbrh.github.io/ppnyc-hub/widget.js" defer></script>
 *
 * Detects which club's site it's running on (by hostname) and renders that
 * club's four-step race documentation flow, plus the shared PPNYC documents.
 * Document links live in documents.json next to this file, so updating one
 * JSON file updates all three club sites instantly (no redeploy needed).
 *
 * Manual override for staging/testing: add data-club="rmys|rycv|hbyc" to
 * either the script tag or the container div.
 */
(function () {
  'use strict';

  // Accent colors sampled from each club's own site (header/nav bar + crest).
  var CLUBS = {
    rmys: {
      name: 'Royal Melbourne Yacht Squadron',
      short: 'RMYS',
      hosts: ['rmys.com.au', 'www.rmys.com.au'],
      accent: '#e31b2c',
      accentDark: '#9c0f1c'
    },
    rycv: {
      name: 'Royal Yacht Club of Victoria',
      short: 'RYCV',
      hosts: ['rycv.com.au', 'www.rycv.com.au'],
      accent: '#1a2b5d',
      accentDark: '#0d1530'
    },
    hbyc: {
      name: 'Hobsons Bay Yacht Club',
      short: 'HBYC',
      hosts: ['hbyc.org.au', 'www.hbyc.org.au'],
      accent: '#0e193e',
      accentDark: '#060b1f'
    }
  };

  var CLUB_ORDER = ['rmys', 'rycv', 'hbyc'];

  // Used if documents.json can't be fetched (offline, blocked, malformed).
  var FALLBACK_DOCS = {
    updatedAt: '',
    common: {
      nor: { label: 'PPNYC Notice of Race', url: '#links-needed' },
      raceCalendar: { label: 'Combined Race Calendar', url: '#links-needed' },
      ssi: { label: 'PPNYC Standard Sailing Instructions', url: '#links-needed' },
      courseBook: { label: 'SSI Attachment 1 — Course Book', url: '#links-needed' }
    },
    clubs: {
      rmys: {
        annexure: { label: 'RMYS NOR Annexure', url: '#links-needed' },
        supplement: { label: 'RMYS SSI Supplement', url: '#links-needed' }
      },
      rycv: {
        annexure: { label: 'RYCV NOR Annexure', url: '#links-needed' },
        supplement: { label: 'RYCV SSI Supplement', url: '#links-needed' }
      },
      hbyc: {
        annexure: { label: 'HBYC NOR Annexure', url: '#links-needed' },
        supplement: { label: 'HBYC SSI Supplement', url: '#links-needed' }
      }
    }
  };

  var CONTAINER_ID = 'ppnyc-document-hub';
  var STYLE_ID = 'ppnyc-hub-styles';
  var SESSION_KEY = 'ppnycHubClub';

  function isPlaceholder(url) {
    return !url || url === '#' || url.indexOf('links-needed') !== -1;
  }

  function mergeDocs(fetched) {
    fetched = fetched || {};
    var merged = {
      updatedAt: fetched.updatedAt || FALLBACK_DOCS.updatedAt,
      common: {},
      clubs: {}
    };
    var key;
    for (key in FALLBACK_DOCS.common) {
      merged.common[key] = (fetched.common && fetched.common[key]) || FALLBACK_DOCS.common[key];
    }
    for (key in FALLBACK_DOCS.clubs) {
      var fetchedClub = fetched.clubs && fetched.clubs[key];
      merged.clubs[key] = {
        annexure: (fetchedClub && fetchedClub.annexure) || FALLBACK_DOCS.clubs[key].annexure,
        supplement: (fetchedClub && fetchedClub.supplement) || FALLBACK_DOCS.clubs[key].supplement
      };
    }
    return merged;
  }

  function getBaseUrl(scriptEl) {
    if (scriptEl && scriptEl.src) {
      return scriptEl.src.replace(/[^/]*$/, '');
    }
    return '';
  }

  function fetchDocs(scriptEl) {
    var base = getBaseUrl(scriptEl);
    var url = base + 'documents.json?_=' + Date.now();
    if (typeof fetch !== 'function') {
      return Promise.reject(new Error('fetch unsupported'));
    }
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('bad status ' + res.status);
      return res.json();
    });
  }

  function detectClubKey(container, scriptEl) {
    var override =
      (container && container.getAttribute('data-club')) ||
      (scriptEl && scriptEl.getAttribute('data-club'));
    if (override) {
      override = override.toLowerCase();
      if (CLUBS[override]) return override;
    }

    var host = window.location.hostname.toLowerCase();
    var key;
    for (key in CLUBS) {
      if (CLUBS[key].hosts.indexOf(host) !== -1) return key;
    }
    // Loose match, e.g. members.rmys.com.au or a staging subdomain.
    for (key in CLUBS) {
      var hosts = CLUBS[key].hosts;
      for (var i = 0; i < hosts.length; i++) {
        var bare = hosts[i].replace('www.', '');
        if (host.indexOf(bare) !== -1) return key;
      }
    }

    try {
      var remembered = window.sessionStorage.getItem(SESSION_KEY);
      if (remembered && CLUBS[remembered]) return remembered;
    } catch (e) {
      /* sessionStorage unavailable (privacy mode etc) — ignore */
    }

    return null;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (child) {
      if (child == null) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function docNode(doc) {
    if (isPlaceholder(doc && doc.url)) {
      return el('span', { class: 'ppnyc-hub__pending' }, [
        doc ? doc.label : '',
        el('em', {}, ['Coming soon'])
      ]);
    }
    return el(
      'a',
      {
        class: 'ppnyc-hub__link',
        href: doc.url,
        target: '_blank',
        rel: 'noopener noreferrer'
      },
      [
        el('span', { class: 'ppnyc-hub__link-label' }, [doc.label]),
        el('span', { class: 'ppnyc-hub__link-arrow', 'aria-hidden': 'true' }, ['↓'])
      ]
    );
  }

  function stepNode(index, doc) {
    return el('li', { class: 'ppnyc-hub__step' }, [
      el('span', { class: 'ppnyc-hub__step-num' }, [String(index)]),
      docNode(doc)
    ]);
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.ppnyc-hub{--ppnyc-accent:#0f5ea8;--ppnyc-accent-dark:#0a3d70;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
      'max-width:720px;margin:0 auto;background:#fff;border:1px solid #e2e5e9;border-radius:12px;' +
      'box-shadow:0 1px 3px rgba(15,23,42,.06);overflow:hidden;color:#1a2129;box-sizing:border-box}' +
      '.ppnyc-hub *{box-sizing:border-box}' +
      '.ppnyc-hub__header{padding:20px 24px;background:linear-gradient(135deg,var(--ppnyc-accent),var(--ppnyc-accent-dark));color:#fff}' +
      '.ppnyc-hub__eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;margin:0 0 4px}' +
      '.ppnyc-hub__title{font-size:20px;font-weight:700;margin:0;line-height:1.3}' +
      '.ppnyc-hub__body{padding:20px 24px}' +
      '.ppnyc-hub__section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#5b6472;margin:0 0 12px}' +
      '.ppnyc-hub__steps{list-style:none;margin:0 0 24px;padding:0;display:flex;flex-direction:column;gap:8px}' +
      '.ppnyc-hub__step{display:flex;align-items:center;gap:12px}' +
      '.ppnyc-hub__step-num{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:var(--ppnyc-accent);color:#fff;' +
      'font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}' +
      '.ppnyc-hub__grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '.ppnyc-hub__link{flex:1 1 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;' +
      'padding:10px 14px;border-radius:8px;background:#f5f7fa;border:1px solid #e2e5e9;color:#1a2129;' +
      'text-decoration:none;font-size:14px;font-weight:600;transition:background .15s,border-color .15s}' +
      '.ppnyc-hub__link:hover{background:#eef2f6;border-color:var(--ppnyc-accent)}' +
      '.ppnyc-hub__link-arrow{color:var(--ppnyc-accent);font-weight:700}' +
      '.ppnyc-hub__pending{flex:1 1 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;' +
      'padding:10px 14px;border-radius:8px;background:#f9f9f9;border:1px dashed #d7dbe0;color:#8a93a0;font-size:14px;font-weight:600}' +
      '.ppnyc-hub__pending em{font-style:normal;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#aab1bb}' +
      '.ppnyc-hub__footer{padding:12px 24px;border-top:1px solid #edf0f3;font-size:12px;color:#8a93a0}' +
      '.ppnyc-hub__picker{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}' +
      '.ppnyc-hub__picker-btn{padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.6);' +
      'background:rgba(255,255,255,.12);color:#fff;font-size:13px;font-weight:600;cursor:pointer}' +
      '.ppnyc-hub__picker-btn:hover{background:rgba(255,255,255,.22)}' +
      '.ppnyc-hub__loading{padding:32px 24px;text-align:center;color:#8a93a0;font-size:14px}' +
      '.ppnyc-hub__other{margin-top:24px;border-top:1px solid #edf0f3;padding-top:16px}' +
      '.ppnyc-hub__other-summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;' +
      'font-size:13px;font-weight:700;color:var(--ppnyc-accent)}' +
      '.ppnyc-hub__other-summary::-webkit-details-marker{display:none}' +
      '.ppnyc-hub__other-caret{transition:transform .15s;color:var(--ppnyc-accent)}' +
      '.ppnyc-hub__other[open] .ppnyc-hub__other-caret{transform:rotate(180deg)}' +
      '.ppnyc-hub__other-body{display:flex;flex-direction:column;gap:16px;margin-top:16px}' +
      '.ppnyc-hub__other-club-name{font-size:12px;font-weight:700;color:#5b6472;margin:0 0 8px}' +
      '@media (max-width:480px){.ppnyc-hub__grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function resetAccent(container) {
    container.style.removeProperty('--ppnyc-accent');
    container.style.removeProperty('--ppnyc-accent-dark');
  }

  function renderLoading(container) {
    container.className = 'ppnyc-hub';
    resetAccent(container);
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'ppnyc-hub__loading' }, ['Loading race documents…']));
  }

  function renderPicker(container, onPick) {
    container.className = 'ppnyc-hub';
    resetAccent(container);
    container.innerHTML = '';
    var header = el('div', { class: 'ppnyc-hub__header' }, [
      el('p', { class: 'ppnyc-hub__eyebrow' }, ['PPNYC Document Hub']),
      el('h2', { class: 'ppnyc-hub__title' }, ['Select your club to view race documents'])
    ]);
    var picker = el('div', { class: 'ppnyc-hub__picker' }, []);
    CLUB_ORDER.forEach(function (key) {
      var btn = el('button', { class: 'ppnyc-hub__picker-btn', type: 'button' }, [CLUBS[key].short]);
      btn.addEventListener('click', function () {
        try {
          window.sessionStorage.setItem(SESSION_KEY, key);
        } catch (e) {
          /* ignore */
        }
        onPick(key);
      });
      picker.appendChild(btn);
    });
    header.appendChild(picker);
    container.appendChild(header);
  }

  function otherClubsNode(otherClubKeys, docs) {
    var details = el('details', { class: 'ppnyc-hub__other' }, []);
    var summary = el('summary', { class: 'ppnyc-hub__other-summary' }, [
      el('span', {}, ['Racing at another club? View their sailing instructions']),
      el('span', { class: 'ppnyc-hub__other-caret', 'aria-hidden': 'true' }, ['▾'])
    ]);
    details.appendChild(summary);

    var body = el('div', { class: 'ppnyc-hub__other-body' }, []);
    otherClubKeys.forEach(function (key) {
      var club = CLUBS[key];
      var clubDocs = docs.clubs[key];
      body.appendChild(
        el('div', { class: 'ppnyc-hub__other-club' }, [
          el('p', { class: 'ppnyc-hub__other-club-name' }, [club.name]),
          el('div', { class: 'ppnyc-hub__grid' }, [
            docNode(clubDocs.annexure),
            docNode(clubDocs.supplement)
          ])
        ])
      );
    });
    details.appendChild(body);

    return details;
  }

  function render(container, clubKey, docs) {
    var club = CLUBS[clubKey];
    container.className = 'ppnyc-hub';
    container.style.setProperty('--ppnyc-accent', club.accent);
    container.style.setProperty('--ppnyc-accent-dark', club.accentDark);
    container.innerHTML = '';

    container.appendChild(
      el('div', { class: 'ppnyc-hub__header' }, [
        el('p', { class: 'ppnyc-hub__eyebrow' }, ['PPNYC Document Hub — ' + club.short]),
        el('h2', { class: 'ppnyc-hub__title' }, [club.name + ' Race Documentation'])
      ])
    );

    var body = el('div', { class: 'ppnyc-hub__body' }, []);
    var clubDocs = docs.clubs[clubKey];

    body.appendChild(el('p', { class: 'ppnyc-hub__section-title' }, ['Start here — in order']));
    var steps = el('ol', { class: 'ppnyc-hub__steps' }, [
      stepNode(1, docs.common.nor),
      stepNode(2, clubDocs.annexure),
      stepNode(3, docs.common.ssi),
      stepNode(4, clubDocs.supplement)
    ]);
    body.appendChild(steps);

    body.appendChild(el('p', { class: 'ppnyc-hub__section-title' }, ['Also useful']));
    body.appendChild(
      el('div', { class: 'ppnyc-hub__grid' }, [
        docNode(docs.common.raceCalendar),
        docNode(docs.common.courseBook)
      ])
    );

    var otherClubs = CLUB_ORDER.filter(function (key) {
      return key !== clubKey;
    });
    if (otherClubs.length) {
      body.appendChild(otherClubsNode(otherClubs, docs));
    }

    container.appendChild(body);

    if (docs.updatedAt) {
      container.appendChild(
        el('div', { class: 'ppnyc-hub__footer' }, ['Documents last updated ' + docs.updatedAt])
      );
    }
  }

  function findContainer(scriptEl) {
    var existing = document.getElementById(CONTAINER_ID);
    if (existing) return existing;

    // No container in the page markup — create one right where the
    // script tag is, so a bare 2-line embed still works.
    var div = document.createElement('div');
    div.id = CONTAINER_ID;
    if (scriptEl && scriptEl.parentNode) {
      scriptEl.parentNode.insertBefore(div, scriptEl.nextSibling);
    } else {
      document.body.appendChild(div);
    }
    return div;
  }

  function init(scriptEl) {
    injectStyles();
    var container = findContainer(scriptEl);
    var clubKey = detectClubKey(container, scriptEl);

    renderLoading(container);

    fetchDocs(scriptEl)
      .then(mergeDocs)
      .catch(function () {
        return FALLBACK_DOCS;
      })
      .then(function (docs) {
        if (clubKey) {
          render(container, clubKey, docs);
        } else {
          renderPicker(container, function (key) {
            render(container, key, docs);
          });
        }
      });
  }

  var currentScript = document.currentScript;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init(currentScript);
    });
  } else {
    init(currentScript);
  }
})();
