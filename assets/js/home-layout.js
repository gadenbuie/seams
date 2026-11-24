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
    };

    document.addEventListener('DOMContentLoaded', apply);
    document.addEventListener('docmd:page-mounted', apply);
})();
