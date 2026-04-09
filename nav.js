// Shared navigation bar for all shader pages
(function() {
    const SHADERS = [
        { id: 'ocean', title: 'Ocean', url: '/ocean-shader.html' },
        { id: 'garden', title: 'Garden', url: '/garden/index.html' },
        { id: 'sparkles', title: 'Sparkles', url: '/sparkles/index.html' },
        { id: 'fog', title: 'Fog', url: '/fog/index.html' },
        { id: 'landscape', title: 'Landscape', url: '/landscape/index.html' },
        { id: 'sparkles-mobile', title: 'Sparkles 9:21', url: '/sparkles-mobile/index.html' },
        { id: 'sky', title: 'Sky', url: '/sky/index.html' },
    ];

    const path = location.pathname;
    const currentIdx = SHADERS.findIndex(s => path.endsWith(s.url) || path.endsWith(s.url.replace('/index.html', '/')));

    const nav = document.createElement('div');
    nav.id = 'shader-nav';
    nav.innerHTML = `
        <a href="/" class="nav-home" title="All Shaders">⌂</a>
        <div class="nav-items">${SHADERS.map((s, i) =>
            `<a href="${s.url}" class="nav-item${i === currentIdx ? ' active' : ''}">${s.title}</a>`
        ).join('')}</div>
        <div class="nav-arrows">
            <span class="nav-key${currentIdx <= 0 ? ' disabled' : ''}" id="nav-prev">←</span>
            <span class="nav-key${currentIdx >= SHADERS.length - 1 ? ' disabled' : ''}" id="nav-next">→</span>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        #shader-nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
            display: flex; align-items: center; gap: 6px;
            padding: 6px 14px;
            background: rgba(10,10,12,0.82);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            font-family: -apple-system, 'SF Pro', 'Helvetica Neue', sans-serif;
            font-size: 12px;
        }
        #shader-nav .nav-home {
            font-size: 15px; text-decoration: none;
            color: rgba(255,255,255,0.4);
            margin-right: 4px; line-height: 1;
            transition: color 0.2s;
        }
        #shader-nav .nav-home:hover { color: rgba(255,255,255,0.8); }
        #shader-nav .nav-items {
            display: flex; gap: 2px; flex: 1;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
        }
        #shader-nav .nav-items::-webkit-scrollbar { display: none; }
        #shader-nav .nav-item {
            text-decoration: none;
            color: rgba(255,255,255,0.35);
            padding: 4px 10px; border-radius: 6px;
            transition: background 0.2s, color 0.2s;
            white-space: nowrap;
        }
        #shader-nav .nav-item:hover {
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.7);
        }
        #shader-nav .nav-item.active {
            background: rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.9);
            font-weight: 500;
        }
        #shader-nav .nav-arrows { display: flex; gap: 4px; }
        #shader-nav .nav-key {
            display: inline-flex; align-items: center; justify-content: center;
            width: 24px; height: 22px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 5px;
            color: rgba(255,255,255,0.4);
            cursor: pointer; user-select: none;
            font-size: 13px; line-height: 1;
            transition: background 0.2s, color 0.2s;
        }
        #shader-nav .nav-key:hover:not(.disabled) {
            background: rgba(255,255,255,0.12);
            color: rgba(255,255,255,0.8);
        }
        #shader-nav .nav-key.disabled { opacity: 0.25; cursor: default; }
    `;

    document.head.appendChild(style);
    document.body.prepend(nav);

    function go(idx) {
        if (idx >= 0 && idx < SHADERS.length && idx !== currentIdx) {
            location.href = SHADERS[idx].url;
        }
    }

    document.getElementById('nav-prev').addEventListener('click', () => go(currentIdx - 1));
    document.getElementById('nav-next').addEventListener('click', () => go(currentIdx + 1));

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'ArrowLeft') go(currentIdx - 1);
        if (e.key === 'ArrowRight') go(currentIdx + 1);
    });
})();
