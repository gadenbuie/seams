// Per-page layout tweak for the docmd site.
// Hides the sidebar on the home page, including during SPA navigation.
(function () {
    var read = function (path) {
        try {
            var v = window.docmd && window.docmd.var && window.docmd.var.get
                ? window.docmd.var.get(path)
                : undefined;
            if (v !== undefined && v !== null) return v;
        } catch (err) { /* fall through */ }
        var tree = window.__DOCMD_VARIABLES__ || {};
        return path.split('.').reduce(function (node, key) {
            return node ? node[key] : undefined;
        }, tree);
    };

    // The proposal card opens in two states: the summary shows in the
    // preview, and one button reveals the whole document while a sticky
    // bar holds a close control at the bottom of the card. Closing also
    // walks the reader back to the card, since the collapsed text no
    // longer fills the screen.
    var wireExcerpt = function () {
        var more = document.querySelector('.home-excerpt-more');
        if (!more || more.dataset.wired) return;
        more.dataset.wired = '1';
        var rest = more.querySelector('.home-excerpt-rest');
        var toggle = more.querySelector('.home-excerpt-toggle');
        var card = more.closest('.home-excerpt');
        var hide = card.querySelector('.home-excerpt-hidebar button');
        // The preview ends exactly where the motivation section begins,
        // so the fade covers the summary's last lines and the next
        // heading never peeks through.
        var sizePreview = function () {
            card.style.setProperty('--home-preview-h', rest.offsetTop + 'px');
        };
        var setCollapse = function (collapsed) {
            if (collapsed) {
                card.setAttribute('data-collapsed', '');
            } else {
                card.removeAttribute('data-collapsed');
            }
            toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            rest.inert = collapsed;
            rest.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
        };
        toggle.addEventListener('click', function () { setCollapse(false); });
        hide.addEventListener('click', function () {
            setCollapse(true);
            if (card) {
                var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                card.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
            }
        });
        sizePreview();
        // Webfonts change how the summary wraps; re-measure when they land.
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(sizePreview);
        }
        window.addEventListener('resize', sizePreview);
        setCollapse(true);
    };

    var apply = function () {
        var slug = String(read('page.slug') || '');
        var base = String(read('site.base') || '/');
        var rest = base !== '/' && slug.indexOf(base) === 0 ? slug.slice(base.length) : slug;
        var isHome = rest === '' || rest === '/';
        document.body.classList.toggle('no-sidebar', isHome);
        applyTitlebarMark();
        fixTocTitle();
        if (isHome) {
            fixMdLinks();
            wireCopyButtons();
            wireSeams();
            wireLoopThread();
            wireExcerpt();
        }
    };

    // docmd ships the contents heading as "On This Page"; the site keeps
    // its labels in sentence case, so the text is rewritten on each page.
    var fixTocTitle = function () {
        document.querySelectorAll('.toc-title').forEach(function (title) {
            Array.prototype.forEach.call(title.childNodes, function (node) {
                if (node.nodeType === 3 && node.textContent.trim() === 'On This Page') {
                    node.textContent = 'On this page';
                }
            });
        });
    };

    // The titlebar mark is an inline SVG whose colors read from CSS
    // variables (see the titlebar section of home.css), so the light and
    // dark switch happens in the browser's cascade. External SVG images
    // cannot inherit the page's variables, which is why the mark is
    // inlined here instead of loaded from a file.
    var markSvg = '<svg class="menubar-mark" viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" focusable="false">' +
        '<rect class="mark-square" width="32" height="32" rx="6"/>' +
        '<path class="mark-stitch" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-dasharray="3.1 2.3"' +
        ' d="M24 27.5 H8.5 A4 4 0 0 1 4.5 23.5 V8.5 A4 4 0 0 1 8.5 4.5 H23.5 A4 4 0 0 1 27.5 8.5 V23.5"/>' +
        '<g transform="rotate(-7 16 16)"><path class="mark-s" d="M16.40 23.47Q17.53 23.47 18.19 22.88Q18.85 22.30 18.85 21.35Q18.85 20.68 18.54 20.14Q18.24 19.60 17.49 19.15Q16.75 18.69 15.46 18.28Q13.55 17.64 12.45 16.89Q11.35 16.13 10.89 15.19Q10.43 14.25 10.43 13.06Q10.43 11.02 11.81 9.91Q13.20 8.80 15.51 8.80Q16.51 8.80 17.15 8.99Q17.79 9.18 18.13 9.37Q18.47 9.56 18.57 9.56Q18.73 9.56 19.14 9.37Q19.55 9.18 19.95 8.99Q20.35 8.80 20.47 8.80Q20.53 8.80 20.59 8.83Q20.65 8.86 20.67 8.98L21.54 13.68Q21.57 13.81 21.55 13.88Q21.53 13.96 21.48 14.00Q21.43 14.01 21.39 13.99Q21.34 13.97 21.30 13.91Q20.36 12.10 19.48 11.04Q18.60 9.99 17.68 9.54Q16.75 9.09 15.67 9.09Q14.44 9.09 13.77 9.70Q13.09 10.32 13.09 11.35Q13.09 12.03 13.41 12.59Q13.72 13.15 14.54 13.61Q15.35 14.08 16.85 14.51Q18.57 15.00 19.61 15.73Q20.65 16.45 21.11 17.39Q21.57 18.32 21.57 19.46Q21.57 20.79 20.93 21.76Q20.29 22.73 19.19 23.27Q18.09 23.80 16.70 23.80Q15.81 23.80 15.15 23.55Q14.50 23.29 14.10 23.04Q13.71 22.78 13.61 22.78Q13.52 22.78 13.17 23.02Q12.82 23.25 12.46 23.48Q12.09 23.72 11.95 23.72Q11.88 23.72 11.80 23.64Q11.72 23.57 11.69 23.40L10.97 19.37Q10.96 19.20 10.97 19.12Q10.99 19.04 11.05 19.01Q11.08 18.98 11.12 19.01Q11.16 19.04 11.20 19.10Q12.51 21.49 13.82 22.48Q15.13 23.47 16.40 23.47Z"/></g>' +
        '</svg>';

    // The stitch gradient lives in one shared defs block so several marks
    // can reference it without duplicate ids.
    var applyTitlebarMark = function () {
        if (!document.getElementById('seams-mark-stitch')) {
            var holder = document.createElement('div');
            holder.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
                '<defs><linearGradient id="seams-mark-stitch" x1="0" y1="0" x2="1" y2="1">' +
                '<stop offset="0" class="mark-stitch-from"/>' +
                '<stop offset="0.55" class="mark-stitch-mid"/>' +
                '<stop offset="1" class="mark-stitch-to"/>' +
                '</linearGradient></defs></svg>';
            document.body.appendChild(holder.firstChild);
        }
        document.querySelectorAll('.menubar-brand').forEach(function (brand) {
            if (brand.querySelector('.menubar-mark')) return;
            brand.insertAdjacentHTML('afterbegin', markSvg);
        });
    };

    // The hero buttons carry an inset seam, a dashed stroke on a rect
    // inset 5px from the edge. CSS fades it in on hover and runs the
    // stitches while the button is pressed; see the hero buttons section
    // of home.css. The rect uses width and height of 100% so one shape
    // fits both buttons at their rendered sizes. The 3px corner radius
    // follows the nested radius rule: the 8px outer radius minus the
    // 5px inset.
    var seamSvg = '<svg class="home-seam" aria-hidden="true" focusable="false">' +
        '<rect x="0" y="0" width="100%" height="100%" rx="3"/></svg>';

    var wireSeams = function () {
        document.querySelectorAll('.home-button-primary, .home-install').forEach(function (btn) {
            if (btn.querySelector('.home-seam')) return;
            btn.insertAdjacentHTML('beforeend', seamSvg);
        });
    };

    // The stages thread is the same conveyor stitch as the wordmark's,
    // drawn as an SVG line that home.css positions along the row and
    // animates. The dashed border on .home-loop::before stays as the
    // no-JS and narrow-screen thread; injecting the SVG adds a class
    // that hides it where the animated thread replaces it. The path runs
    // 216px past the left end so stitches enter from there as the line
    // advances toward stage five.
    var threadSvg = '<svg class="home-loop-thread" aria-hidden="true" focusable="false">' +
        '<path d="M-216 1.25 H 1400" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="7 5"/></svg>';

    // The narrow-screen twin runs downward instead, so stitches enter at
    // the top and feed toward stage five. It spans the loop's full
    // height with a long path that the svg clips, since the height is
    // whatever the five stages add up to.
    var threadSvgV = '<svg class="home-loop-thread-v" aria-hidden="true" focusable="false">' +
        '<path d="M1.25 -216 V 2600" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="7 5"/></svg>';

    var wireLoopThread = function () {
        document.querySelectorAll('.home-loop').forEach(function (loop) {
            if (loop.classList.contains('thread-animated')) return;
            loop.classList.add('thread-animated');
            loop.insertAdjacentHTML('afterbegin', threadSvg);
            loop.insertAdjacentHTML('afterbegin', threadSvgV);
        });
    };

    // docmd rewrites links written in markdown, but links written as raw HTML
    // keep their source paths, e.g. "guide.md". Map those to the built routes
    // the same way the build would, so they work in the SPA and directly.
    var fixMdLinks = function () {
        document.querySelectorAll('.home a[href]').forEach(function (a) {
            var href = a.getAttribute('href');
            if (/^https?:/.test(href) || href.indexOf('.md') === -1) return;
            a.setAttribute('href', href.replace(/\.md(?=#|$)/, '/'));
        });
    };

    // The install chip and the prompt box copy their command and say so
    // for a moment.
    var wireCopyButtons = function () {
        document.querySelectorAll('.home-install[data-copy], .home-copy[data-copy]').forEach(function (btn) {
            if (btn.dataset.wired) return;
            btn.dataset.wired = '1';
            btn.addEventListener('click', function () {
                var hint = btn.querySelector('.home-install-hint');
                var done = function () {
                    if (!hint) return;
                    hint.textContent = hint.dataset.copied || 'copied';
                    hint.classList.add('is-copied');
                    setTimeout(function () {
                        hint.textContent = hint.dataset.idle || 'copy';
                        hint.classList.remove('is-copied');
                    }, 1600);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(btn.dataset.copy).then(done, done);
                } else {
                    done();
                }
            });
        });
    };

    document.addEventListener('DOMContentLoaded', apply);
    document.addEventListener('docmd:page-mounted', apply);
})();
