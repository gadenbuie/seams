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

    var apply = function () {
        var slug = String(read('page.slug') || '');
        var base = String(read('site.base') || '/');
        var rest = base !== '/' && slug.indexOf(base) === 0 ? slug.slice(base.length) : slug;
        var isHome = rest === '' || rest === '/';
        document.body.classList.toggle('no-sidebar', isHome);
        if (isHome) {
            fixMdLinks();
            wireCopyButtons();
        }
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

    // The install chip copies its command and says so for a moment.
    var wireCopyButtons = function () {
        document.querySelectorAll('.home-install[data-copy]').forEach(function (btn) {
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
