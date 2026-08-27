/*!
 * PPNYC Document Hub widget
 * Embed with:
 *   <div id="ppnyc-document-hub"></div>
 *   <script src="https://lbrh.space/ppnyc-hub/widget.js" defer></script>
 *
 * Full-page race documentation hub. Detects which club's site it's running
 * on (by hostname) and renders that club's own document sequence front and
 * centre, with the other two clubs' sailing instructions available behind
 * an expander. Document links live in documents.json next to this file, so
 * updating one JSON file updates all three club sites instantly.
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

  // Static descriptive copy. Each club publishes its own single Standard +
  // Supplementary Sailing Instructions document (there's no separate
  // program-wide SSI distinct from a club's own) — only the NOR, race
  // calendar and course book are genuinely shared across all three clubs.
  var COMMON_DESC = {
    nor: 'The governing Notice of Race for the combined program.',
    raceCalendar: 'The shared scheduling reference for all host clubs.',
    courseBook: 'The shared course and mark reference.'
  };
  var CLUB_DOC_DESC = {
    annexure: 'Host-club Notice of Race annexure.',
    supplement: "The host club's Standard and Supplementary Sailing Instructions."
  };

  // Used if documents.json can't be fetched (offline, blocked, malformed).
  var FALLBACK_DOCS = {
    updatedAt: '',
    common: {
      nor: { label: 'PPNYC Notice of Race', url: '#links-needed' },
      raceCalendar: { label: 'Combined Race Calendar', url: '#links-needed' },
      courseBook: { label: 'Combined Course Book', url: '#links-needed' }
    },
    clubs: {
      rmys: {
        annexure: { label: 'RMYS NOR Annexure', url: '#links-needed' },
        supplement: { label: 'RMYS Standard & Supplementary Sailing Instructions', url: '#links-needed' }
      },
      rycv: {
        annexure: { label: 'RYCV NOR Annexure', url: '#links-needed' },
        supplement: { label: 'RYCV Standard & Supplementary Sailing Instructions', url: '#links-needed' }
      },
      hbyc: {
        annexure: { label: 'HBYC NOR Annexure', url: '#links-needed' },
        supplement: { label: 'HBYC Standard & Supplementary Sailing Instructions', url: '#links-needed' }
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

  function docCard(doc, description) {
    var pending = isPlaceholder(doc && doc.url);
    var card = el(
      'div',
      { class: 'ppnyc-hub__card' + (pending ? ' ppnyc-hub__card--pending' : '') },
      []
    );
    card.appendChild(el('p', { class: 'ppnyc-hub__card-title' }, [doc ? doc.label : '']));
    if (description) {
      card.appendChild(el('p', { class: 'ppnyc-hub__card-desc' }, [description]));
    }
    if (pending) {
      card.appendChild(el('span', { class: 'ppnyc-hub__card-status' }, ['Coming soon']));
    } else {
      card.appendChild(
        el(
          'a',
          { class: 'ppnyc-hub__card-link', href: doc.url, target: '_blank', rel: 'noopener noreferrer' },
          ['View document ', el('span', { 'aria-hidden': 'true' }, ['↓'])]
        )
      );
    }
    return card;
  }

  function stepRow(num, doc, description) {
    return el('div', { class: 'ppnyc-hub__step' }, [
      el('div', { class: 'ppnyc-hub__step-num' }, [String(num)]),
      docCard(doc, description)
    ]);
  }

  function sectionHeading(kicker, title, desc) {
    var nodes = [
      el('p', { class: 'ppnyc-hub__kicker' }, [kicker]),
      el('h2', { class: 'ppnyc-hub__section-title' }, [title])
    ];
    if (desc) nodes.push(el('p', { class: 'ppnyc-hub__section-desc' }, [desc]));
    return nodes;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.ppnyc-hub{--ppnyc-accent:#0f5ea8;--ppnyc-accent-dark:#0a3d70;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
      'max-width:1120px;margin:0 auto;width:100%;background:#fff;color:#16202c;box-sizing:border-box}' +
      '.ppnyc-hub *{box-sizing:border-box}' +
      '.ppnyc-hub__bar{height:5px;background:linear-gradient(90deg,var(--ppnyc-accent),var(--ppnyc-accent-dark))}' +
      '.ppnyc-hub__hero{padding:48px 28px 40px}' +
      '.ppnyc-hub__hero-title{font-size:clamp(26px,4vw,38px);font-weight:800;line-height:1.15;' +
      'margin:0 0 14px;color:#0f172a;max-width:820px}' +
      '.ppnyc-hub__hero-desc{font-size:16px;line-height:1.65;color:#475569;margin:0;max-width:640px}' +
      '.ppnyc-hub__section{padding:36px 28px;border-top:1px solid #edf0f3}' +
      '.ppnyc-hub__kicker{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;' +
      'color:var(--ppnyc-accent);margin:0}' +
      '.ppnyc-hub__section-title{font-size:22px;font-weight:800;color:#0f172a;margin:8px 0 8px}' +
      '.ppnyc-hub__section-desc{font-size:14px;line-height:1.6;color:#64748b;margin:0 0 24px;max-width:640px}' +
      '.ppnyc-hub__steps{display:flex;flex-direction:column;gap:16px}' +
      '.ppnyc-hub__step{display:flex;align-items:flex-start;gap:16px}' +
      '.ppnyc-hub__step-num{flex:0 0 auto;width:32px;height:32px;border-radius:50%;background:var(--ppnyc-accent);' +
      'color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:2px}' +
      '.ppnyc-hub__step .ppnyc-hub__card{flex:1 1 auto}' +
      '.ppnyc-hub__doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}' +
      '.ppnyc-hub__card{border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;background:#fff;' +
      'display:flex;flex-direction:column;gap:6px;transition:border-color .15s,box-shadow .15s}' +
      '.ppnyc-hub__card:hover{border-color:var(--ppnyc-accent);box-shadow:0 4px 14px rgba(15,23,42,.06)}' +
      '.ppnyc-hub__card--pending{border-style:dashed;background:#fafafa}' +
      '.ppnyc-hub__card-title{font-size:15px;font-weight:700;color:#0f172a;margin:0}' +
      '.ppnyc-hub__card-desc{font-size:13px;line-height:1.5;color:#64748b;margin:0}' +
      '.ppnyc-hub__card-link{margin-top:4px;font-size:13px;font-weight:700;color:var(--ppnyc-accent);' +
      'text-decoration:none;display:inline-flex;align-items:center;gap:4px}' +
      '.ppnyc-hub__card-link:hover{text-decoration:underline}' +
      '.ppnyc-hub__card-status{margin-top:4px;font-size:11px;font-weight:800;letter-spacing:.05em;' +
      'text-transform:uppercase;color:#94a3b8}' +
      '.ppnyc-hub__toggle{background:none;border:0;padding:0;width:100%;text-align:left;cursor:pointer;' +
      'font:inherit;color:inherit;display:block}' +
      '.ppnyc-hub__toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px}' +
      '.ppnyc-hub__toggle-title{font-size:22px;font-weight:800;color:#0f172a;margin:0}' +
      '.ppnyc-hub__toggle-caret{color:var(--ppnyc-accent);font-size:16px;flex:0 0 auto;transition:transform .15s}' +
      '.ppnyc-hub__toggle[aria-expanded="true"] .ppnyc-hub__toggle-caret{transform:rotate(180deg)}' +
      '.ppnyc-hub__toggle .ppnyc-hub__section-desc{margin-top:8px}' +
      '.ppnyc-hub__other-body{margin-top:24px;display:flex;flex-direction:column;gap:28px}' +
      '.ppnyc-hub__other-club-name{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;' +
      'color:#334155;margin:0 0 10px}' +
      '.ppnyc-hub__status-msg{font-size:14px;color:#334155;margin:8px 0 4px;font-weight:600}' +
      '.ppnyc-hub__status-updated{font-size:12px;color:#94a3b8;margin:0}' +
      '.ppnyc-hub__club-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;' +
      'margin-top:32px;max-width:820px}' +
      '.ppnyc-hub__club-card{border:2px solid var(--card-accent,var(--ppnyc-accent));border-radius:12px;' +
      'padding:20px;background:#fff;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:6px;' +
      'transition:transform .15s,box-shadow .15s;font:inherit}' +
      '.ppnyc-hub__club-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.1)}' +
      '.ppnyc-hub__club-card-code{font-size:12px;font-weight:800;letter-spacing:.06em;color:var(--card-accent,var(--ppnyc-accent))}' +
      '.ppnyc-hub__club-card-name{font-size:16px;font-weight:700;color:#0f172a}' +
      '.ppnyc-hub__loading{padding:96px 28px;text-align:center;color:#94a3b8;font-size:15px}' +
      '@media (max-width:640px){.ppnyc-hub__doc-grid{grid-template-columns:1fr}' +
      '.ppnyc-hub__hero{padding:36px 20px 32px}.ppnyc-hub__section{padding:28px 20px}}';
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
    container.appendChild(el('div', { class: 'ppnyc-hub__bar' }, []));

    var hero = el('div', { class: 'ppnyc-hub__hero' }, [
      el('h1', { class: 'ppnyc-hub__hero-title' }, ['Every PPNYC race document, in one place.']),
      el('p', { class: 'ppnyc-hub__hero-desc' }, [
        'Select your club to see its Notice of Race, sailing instructions and supplementary documents.'
      ])
    ]);

    var grid = el('div', { class: 'ppnyc-hub__club-grid' }, []);
    CLUB_ORDER.forEach(function (key) {
      var club = CLUBS[key];
      var btn = el(
        'button',
        { type: 'button', class: 'ppnyc-hub__club-card', style: '--card-accent:' + club.accent },
        [
          el('span', { class: 'ppnyc-hub__club-card-code' }, [club.short]),
          el('span', { class: 'ppnyc-hub__club-card-name' }, [club.name])
        ]
      );
      btn.addEventListener('click', function () {
        try {
          window.sessionStorage.setItem(SESSION_KEY, key);
        } catch (e) {
          /* ignore */
        }
        onPick(key);
      });
      grid.appendChild(btn);
    });
    hero.appendChild(grid);
    container.appendChild(hero);
  }

  function otherClubsSection(otherKeys, docs) {
    var section = el('div', { class: 'ppnyc-hub__section' }, []);
    var toggle = el('button', { type: 'button', class: 'ppnyc-hub__toggle', 'aria-expanded': 'false' }, [
      el('span', { class: 'ppnyc-hub__kicker' }, ['RACING ELSEWHERE']),
      el('span', { class: 'ppnyc-hub__toggle-row' }, [
        el('span', { class: 'ppnyc-hub__toggle-title' }, ['Sailing instructions for other host clubs']),
        el('span', { class: 'ppnyc-hub__toggle-caret', 'aria-hidden': 'true' }, ['▾'])
      ]),
      el('span', { class: 'ppnyc-hub__section-desc' }, [
        "Racing an event hosted by a different club? Open their annexure and supplementary sailing instructions below."
      ])
    ]);

    var body = el('div', { class: 'ppnyc-hub__other-body' }, []);
    body.hidden = true;
    otherKeys.forEach(function (key) {
      var club = CLUBS[key];
      var clubDocs = docs.clubs[key];
      body.appendChild(
        el('div', {}, [
          el('p', { class: 'ppnyc-hub__other-club-name' }, [club.name + ' (' + club.short + ')']),
          el('div', { class: 'ppnyc-hub__doc-grid' }, [
            docCard(clubDocs.annexure, CLUB_DOC_DESC.annexure),
            docCard(clubDocs.supplement, CLUB_DOC_DESC.supplement)
          ])
        ])
      );
    });

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      body.hidden = open;
    });

    section.appendChild(toggle);
    section.appendChild(body);
    return section;
  }

  function statusSection(docs, clubKey) {
    var club = CLUBS[clubKey];
    var clubDocs = docs.clubs[clubKey];
    var relevant = [
      docs.common.nor,
      docs.common.raceCalendar,
      docs.common.courseBook,
      clubDocs.annexure,
      clubDocs.supplement
    ];
    var pending = relevant.filter(function (d) {
      return isPlaceholder(d && d.url);
    }).length;

    var section = el('div', { class: 'ppnyc-hub__section' }, [
      el('p', { class: 'ppnyc-hub__kicker' }, ['DOCUMENT STATUS'])
    ]);
    var msg =
      pending > 0
        ? pending + ' of ' + relevant.length + ' ' + club.short + ' documents are still being finalised.'
        : 'All ' + club.short + ' documents are live.';
    section.appendChild(el('p', { class: 'ppnyc-hub__status-msg' }, [msg]));
    if (docs.updatedAt) {
      section.appendChild(el('p', { class: 'ppnyc-hub__status-updated' }, ['Last updated ' + docs.updatedAt]));
    }
    return section;
  }

  function render(container, clubKey, docs) {
    var club = CLUBS[clubKey];
    container.className = 'ppnyc-hub';
    container.style.setProperty('--ppnyc-accent', club.accent);
    container.style.setProperty('--ppnyc-accent-dark', club.accentDark);
    container.innerHTML = '';

    container.appendChild(el('div', { class: 'ppnyc-hub__bar' }, []));

    container.appendChild(
      el('div', { class: 'ppnyc-hub__hero' }, [
        el('h1', { class: 'ppnyc-hub__hero-title' }, ['Every PPNYC race document, in one place.']),
        el('p', { class: 'ppnyc-hub__hero-desc' }, [
          'Start with the common documents, then open the ' +
            club.name +
            ' NOR annexure and Sailing Instructions.'
        ])
      ])
    );

    var clubDocs = docs.clubs[clubKey];

    var stepsSection = el(
      'div',
      { class: 'ppnyc-hub__section' },
      sectionHeading(
        'FOLLOW THE DOCUMENT SEQUENCE',
        'Document sequence',
        'Open these documents in order for any ' + club.short + ' race.'
      )
    );
    stepsSection.appendChild(
      el('div', { class: 'ppnyc-hub__steps' }, [
        stepRow(1, docs.common.nor, COMMON_DESC.nor),
        stepRow(2, clubDocs.annexure, CLUB_DOC_DESC.annexure),
        stepRow(3, clubDocs.supplement, CLUB_DOC_DESC.supplement)
      ])
    );
    container.appendChild(stepsSection);

    var commonSection = el(
      'div',
      { class: 'ppnyc-hub__section' },
      sectionHeading(
        'SHARED ACROSS THE PROGRAM',
        'Common documents',
        'These documents apply across RMYS, RYCV and HBYC events.'
      )
    );
    commonSection.appendChild(
      el('div', { class: 'ppnyc-hub__doc-grid' }, [
        docCard(docs.common.raceCalendar, COMMON_DESC.raceCalendar),
        docCard(docs.common.courseBook, COMMON_DESC.courseBook)
      ])
    );
    container.appendChild(commonSection);

    var otherClubs = CLUB_ORDER.filter(function (key) {
      return key !== clubKey;
    });
    if (otherClubs.length) {
      container.appendChild(otherClubsSection(otherClubs, docs));
    }

    container.appendChild(statusSection(docs, clubKey));
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
