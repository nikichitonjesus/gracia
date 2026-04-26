/* ============================================================
 * Universal Player — estilo Prime Video
 * Autor: Lovable · 2026
 *
 * USO:
 *   <script src="episodios.js"></script>
 *   <script src="player.js"></script>
 *
 *   // Reproducir una SERIE (usa los episodios definidos en episodios.js
 *   //  cuyo `seriesid` coincida con el de la serie):
 *   UniversalPlayer.play({ type: 'series', seriesid: 'jesucristo' });
 *
 *   // O directamente por slug/url:
 *   UniversalPlayer.play({ type: 'series', url: '/jesucristo-hombre' });
 *
 *   // Reproducir un EPISODIO INDIVIDUAL (película o capítulo suelto):
 *   UniversalPlayer.play({ type: 'episode', id: 'la-vida-de-jesucristo' });
 *
 *   // O pasando el objeto directamente:
 *   UniversalPlayer.play({ type: 'episode', episode: episObj });
 *
 *   // API global de episodios (lectura):
 *   window.masEpisodios            // array completo
 *   window.masEpisodios.series     // array de series
 *   window.masEpisodios.byId(id)
 *   window.masEpisodios.bySeries(seriesid)
 *   window.masEpisodios.random(n)  // n episodios aleatorios
 * ============================================================ */
(function (global) {
  'use strict';

  /* -------------------- Datos / API global -------------------- */
  // Permite registrar episodios y series desde fuera (episodios.js).
  // window.EPISODES y window.SERIES son convenciones; también se acepta
  // window.masEpisodios pre-existente.
  const EPISODES = Array.isArray(global.EPISODES) ? global.EPISODES.slice() : [];
  const SERIES   = Array.isArray(global.SERIES)   ? global.SERIES.slice()   : [];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const masEpisodios = Object.assign(EPISODES.slice(), {
    all: () => EPISODES.slice(),
    series: SERIES.slice(),
    byId: (id) => EPISODES.find(e => e.id === id || e.episodeId === id),
    bySeries: (sid) => EPISODES.filter(e => e.seriesid === sid),
    serieById: (sid) => SERIES.find(s => s.seriesid === sid),
    serieByUrl: (u) => SERIES.find(s => s.url_serie === u),
    random: (n = 1) => shuffle(EPISODES).slice(0, n),
    add: (ep) => { EPISODES.push(ep); },
    addSerie: (s) => { SERIES.push(s); },
  });
  global.masEpisodios = masEpisodios;

  /* -------------------- Utilidades -------------------- */
  const fmtTime = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  };
  const parseTime = (t) => {
    if (typeof t === 'number') return t;
    if (!t) return 0;
    const parts = String(t).split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    return parts.reduce((acc, v) => acc * 60 + v, 0);
  };

  /* -------------------- CSS (estilo Prime Video) -------------------- */
  const CSS = `
  .up-root{position:fixed;inset:0;z-index:99999;background:#000;color:#fff;
    font-family:"Amazon Ember","Inter","Segoe UI",system-ui,-apple-system,sans-serif;
    display:none;opacity:0;transition:opacity .25s ease;user-select:none;-webkit-user-select:none}
  .up-root.up-open{display:block;opacity:1}
  .up-root *{box-sizing:border-box}
  .up-video{position:absolute;inset:0;width:100%;height:100%;background:#000;object-fit:contain}

  /* Vignette superior + inferior estilo Prime */
  .up-vignette{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s ease;
    background:linear-gradient(to bottom,
      rgba(0,0,0,.85) 0%, rgba(0,0,0,.55) 12%, rgba(0,0,0,0) 28%,
      rgba(0,0,0,0) 70%, rgba(0,0,0,.6) 88%, rgba(0,0,0,.95) 100%)}
  .up-root.up-show .up-vignette{opacity:1}

  /* Top bar */
  .up-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:16px;
    padding:18px 28px;z-index:5;opacity:0;transform:translateY(-8px);transition:all .25s ease;pointer-events:none}
  .up-root.up-show .up-top{opacity:1;transform:none;pointer-events:auto}
  .up-back{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;
    width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    cursor:pointer;backdrop-filter:blur(10px);transition:background .2s,transform .2s}
  .up-back:hover{background:rgba(255,255,255,.18);transform:scale(1.05)}
  .up-titles{display:flex;flex-direction:column;line-height:1.2;min-width:0;flex:1}
  .up-series-label{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#9ad1ff;font-weight:600}
  .up-title{font-size:20px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .up-sub{font-size:13px;color:rgba(255,255,255,.7);margin-top:2px}

  /* Center play/seek controls */
  .up-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    display:flex;align-items:center;gap:48px;z-index:4;opacity:0;transition:opacity .25s ease;pointer-events:none}
  .up-root.up-show .up-center{opacity:1;pointer-events:auto}
  .up-cbtn{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.18);color:#fff;
    border-radius:50%;width:64px;height:64px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;backdrop-filter:blur(8px);transition:transform .15s,background .2s}
  .up-cbtn:hover{background:rgba(255,255,255,.18);transform:scale(1.08)}
  .up-cbtn.up-play{width:84px;height:84px}
  .up-cbtn svg{width:28px;height:28px;fill:#fff}
  .up-cbtn.up-play svg{width:38px;height:38px}

  /* Skip indicator (double tap / +10 / -10) */
  .up-skip-indicator{position:absolute;top:50%;transform:translateY(-50%);
    background:rgba(0,0,0,.55);border-radius:999px;padding:14px 20px;display:none;align-items:center;gap:8px;
    color:#fff;font-weight:600;z-index:6;pointer-events:none;font-size:14px}
  .up-skip-indicator.up-show-i{display:flex;animation:upPulse .5s ease}
  @keyframes upPulse{0%{transform:translateY(-50%) scale(.8);opacity:0}50%{opacity:1}100%{transform:translateY(-50%) scale(1);opacity:.95}}

  /* Bottom controls */
  .up-bottom{position:absolute;left:0;right:0;bottom:0;padding:20px 28px 22px;z-index:5;
    opacity:0;transform:translateY(10px);transition:all .25s ease;pointer-events:none}
  .up-root.up-show .up-bottom{opacity:1;transform:none;pointer-events:auto}

  .up-progress-wrap{position:relative;padding:10px 0;cursor:pointer}
  .up-progress{position:relative;width:100%;height:4px;background:rgba(255,255,255,.25);border-radius:2px;overflow:visible;transition:height .15s}
  .up-progress-wrap:hover .up-progress{height:6px}
  .up-buffer{position:absolute;left:0;top:0;height:100%;background:rgba(255,255,255,.4);border-radius:2px;width:0}
  .up-fill{position:absolute;left:0;top:0;height:100%;background:linear-gradient(90deg,#1399ff,#00c2ff);border-radius:2px;width:0}
  .up-handle{position:absolute;top:50%;width:14px;height:14px;background:#fff;border-radius:50%;
    transform:translate(-50%,-50%) scale(0);transition:transform .15s;box-shadow:0 0 0 4px rgba(0,194,255,.25)}
  .up-progress-wrap:hover .up-handle,.up-handle.up-drag{transform:translate(-50%,-50%) scale(1)}
  .up-tip{position:absolute;bottom:22px;background:rgba(0,0,0,.85);color:#fff;padding:4px 8px;border-radius:4px;
    font-size:12px;font-weight:600;display:none;transform:translateX(-50%);pointer-events:none;white-space:nowrap}

  .up-row{display:flex;align-items:center;gap:8px;margin-top:10px}
  .up-row .up-spacer{flex:1}
  .up-btn{background:transparent;border:none;color:#fff;cursor:pointer;padding:8px;border-radius:6px;
    display:flex;align-items:center;justify-content:center;transition:background .15s,transform .15s}
  .up-btn:hover{background:rgba(255,255,255,.12)}
  .up-btn:active{transform:scale(.92)}
  .up-btn svg{width:22px;height:22px;fill:#fff}
  .up-btn[disabled]{opacity:.35;cursor:not-allowed}
  .up-time{font-variant-numeric:tabular-nums;font-size:13px;color:rgba(255,255,255,.85);padding:0 10px;letter-spacing:.02em}

  /* Volume slider */
  .up-vol-wrap{display:flex;align-items:center;gap:6px}
  .up-vol{width:0;overflow:hidden;transition:width .2s}
  .up-vol-wrap:hover .up-vol{width:90px}
  .up-vol input{width:90px;accent-color:#00c2ff;cursor:pointer}

  /* Popovers */
  .up-pop{position:absolute;bottom:64px;background:rgba(20,22,28,.96);border:1px solid rgba(255,255,255,.08);
    border-radius:10px;padding:10px;min-width:180px;display:none;z-index:10;
    box-shadow:0 10px 40px rgba(0,0,0,.6);backdrop-filter:blur(12px)}
  .up-pop.up-show-pop{display:block}
  .up-pop h5{margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9ad1ff;font-weight:700}
  .up-pop button{display:flex;align-items:center;justify-content:space-between;width:100%;background:transparent;
    border:none;color:#fff;padding:8px 10px;border-radius:6px;cursor:pointer;font-size:13px;text-align:left}
  .up-pop button:hover{background:rgba(255,255,255,.08)}
  .up-pop button.up-active{color:#00c2ff;font-weight:700}

  /* Skip intro / next episode */
  .up-skip-action{position:absolute;right:32px;bottom:120px;z-index:6;display:none;animation:upRise .25s ease}
  @keyframes upRise{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
  .up-skip-action.up-visible{display:block}
  .up-skip-btn{background:rgba(255,255,255,.95);color:#0a0a0a;border:none;padding:12px 22px;border-radius:6px;
    font-weight:700;font-size:14px;cursor:pointer;letter-spacing:.02em;transition:transform .15s,background .15s}
  .up-skip-btn:hover{background:#fff;transform:translateY(-1px)}

  /* Next episode card */
  .up-next-card{position:absolute;right:32px;bottom:120px;z-index:6;display:none;
    background:rgba(20,22,28,.95);border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;
    width:320px;box-shadow:0 12px 40px rgba(0,0,0,.7);backdrop-filter:blur(10px)}
  .up-next-card.up-visible{display:block;animation:upRise .3s ease}
  .up-next-thumb{position:relative;width:100%;aspect-ratio:16/9;background:#000 center/cover}
  .up-next-thumb::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.6),transparent 60%)}
  .up-next-progress{position:absolute;left:0;bottom:0;height:3px;background:#00c2ff;width:0;z-index:2;transition:width 1s linear}
  .up-next-body{padding:12px 14px}
  .up-next-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9ad1ff;font-weight:700}
  .up-next-title{font-size:15px;font-weight:700;margin:4px 0 8px}
  .up-next-actions{display:flex;gap:8px}
  .up-next-actions button{flex:1;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.15);
    background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-weight:600;font-size:13px;transition:background .15s}
  .up-next-actions button.up-primary{background:#fff;color:#0a0a0a;border-color:#fff}
  .up-next-actions button:hover{background:rgba(255,255,255,.18)}
  .up-next-actions button.up-primary:hover{background:#e6e6e6}

  /* Episode list panel */
  .up-panel{position:absolute;top:0;right:0;bottom:0;width:420px;max-width:90vw;
    background:rgba(12,14,20,.97);border-left:1px solid rgba(255,255,255,.08);
    transform:translateX(100%);transition:transform .3s ease;z-index:20;
    display:flex;flex-direction:column;backdrop-filter:blur(14px)}
  .up-panel.up-open{transform:none}
  .up-panel-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;
    border-bottom:1px solid rgba(255,255,255,.06)}
  .up-panel-head h3{margin:0;font-size:18px;font-weight:700}
  .up-panel-body{flex:1;overflow-y:auto;padding:12px}
  .up-ep-item{display:flex;gap:12px;padding:10px;border-radius:8px;cursor:pointer;transition:background .15s;margin-bottom:6px}
  .up-ep-item:hover{background:rgba(255,255,255,.06)}
  .up-ep-item.up-current{background:rgba(0,194,255,.12);outline:1px solid rgba(0,194,255,.35)}
  .up-ep-thumb{width:128px;aspect-ratio:16/9;background:#000 center/cover;border-radius:6px;flex-shrink:0}
  .up-ep-meta{min-width:0;display:flex;flex-direction:column;gap:4px}
  .up-ep-num{font-size:11px;color:#9ad1ff;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
  .up-ep-title{font-size:14px;font-weight:700;line-height:1.2}
  .up-ep-desc{font-size:12px;color:rgba(255,255,255,.65);line-height:1.4;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

  /* Loading */
  .up-loading{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:7;background:rgba(0,0,0,.4)}
  .up-loading.up-on{display:flex}
  .up-spinner{width:54px;height:54px;border:3px solid rgba(255,255,255,.2);border-top-color:#00c2ff;border-radius:50%;
    animation:upSpin .9s linear infinite}
  @keyframes upSpin{to{transform:rotate(360deg)}}

  /* Error */
  .up-error{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    background:rgba(170,30,30,.92);padding:16px 22px;border-radius:10px;display:none;z-index:8;
    text-align:center;max-width:80%;font-weight:600}
  .up-error.up-on{display:block}

  /* Mobile */
  @media (max-width:760px){
    .up-top{padding:14px 16px}
    .up-title{font-size:16px}
    .up-bottom{padding:12px 16px 16px}
    .up-center{gap:28px}
    .up-cbtn{width:54px;height:54px}
    .up-cbtn.up-play{width:68px;height:68px}
    .up-cbtn svg{width:22px;height:22px}
    .up-cbtn.up-play svg{width:30px;height:30px}
    .up-vol-wrap .up-vol{display:none}
    .up-skip-action,.up-next-card{right:16px;bottom:110px}
    .up-next-card{width:260px}
  }
  `;

  /* -------------------- Iconos SVG -------------------- */
  const ICON = {
    close:'<svg viewBox="0 0 24 24"><path d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L10.6 13.4l-6.3 6.3-1.4-1.42L9.18 12 2.9 5.71 4.3 4.29l6.3 6.3 6.29-6.3z"/></svg>',
    play:'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    back10:'<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12" y="16" text-anchor="middle" font-size="8" font-weight="700" fill="#fff" font-family="Inter,system-ui">10</text></svg>',
    fwd10:'<svg viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="12" y="16" text-anchor="middle" font-size="8" font-weight="700" fill="#fff" font-family="Inter,system-ui">10</text></svg>',
    prev:'<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zM21 6 9 12l12 6z"/></svg>',
    next:'<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM3 6l12 6L3 18z"/></svg>',
    list:'<svg viewBox="0 0 24 24"><path d="M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z"/></svg>',
    cog:'<svg viewBox="0 0 24 24"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.5-2.4 1a7.5 7.5 0 0 0-1.7-1l-.4-2.6h-4l-.4 2.6c-.6.2-1.2.5-1.7 1l-2.4-1-2 3.5L6.5 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.5 2.4-1c.5.4 1 .8 1.7 1l.4 2.6h4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',
    fs:'<svg viewBox="0 0 24 24"><path d="M5 5h6V3H3v8h2zM3 21h8v-2H5v-6H3zM21 5v6h-2V5h-6V3h8zM21 13v8h-8v-2h6v-6z"/></svg>',
    fsExit:'<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z"/></svg>',
    vol:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
    mute:'<svg viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.5 2.5zM19 12c0 .9-.2 1.8-.5 2.6l1.5 1.5A8.9 8.9 0 0 0 21 12c0-4-2.7-7.4-6.5-8.4v2.1c2.5.9 4.5 3.4 4.5 6.3zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.2 4.2c-.6.5-1.4.9-2.2 1.1v2.1a8.8 8.8 0 0 0 3.7-1.8L19.7 21l1.3-1.3z"/></svg>',
  };

  /* -------------------- Estado del reproductor -------------------- */
  let root, video, els = {};
  let queue = [];          // episodios actualmente en cola (serie o single)
  let index = 0;
  let isSeries = false;
  let currentSerie = null;
  let hideTimer = null;
  let nextCardArmed = false;
  let nextCardTimer = null;
  let lastTap = 0, lastTapX = 0;
  let dragging = false;

  /* -------------------- Construcción del DOM -------------------- */
  function build() {
    if (root) return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    root = document.createElement('div');
    root.className = 'up-root';
    root.innerHTML = `
      <video class="up-video" playsinline preload="metadata"></video>
      <div class="up-vignette"></div>

      <div class="up-skip-indicator" data-side="left">${ICON.back10}<span>10s</span></div>
      <div class="up-skip-indicator" data-side="right" style="right:auto"><span>10s</span>${ICON.fwd10}</div>

      <div class="up-top">
        <button class="up-back" aria-label="Cerrar">${ICON.close}</button>
        <div class="up-titles">
          <span class="up-series-label"></span>
          <span class="up-title"></span>
          <span class="up-sub"></span>
        </div>
      </div>

      <div class="up-center">
        <button class="up-cbtn up-back10" aria-label="Retroceder 10s">${ICON.back10}</button>
        <button class="up-cbtn up-play" aria-label="Reproducir/Pausar">${ICON.play}</button>
        <button class="up-cbtn up-fwd10" aria-label="Avanzar 10s">${ICON.fwd10}</button>
      </div>

      <div class="up-skip-action"><button class="up-skip-btn">Saltar intro</button></div>

      <div class="up-next-card">
        <div class="up-next-thumb"><div class="up-next-progress"></div></div>
        <div class="up-next-body">
          <div class="up-next-eyebrow">A continuación</div>
          <div class="up-next-title"></div>
          <div class="up-next-actions">
            <button class="up-cancel-next">Cancelar</button>
            <button class="up-primary up-play-next">Reproducir ahora</button>
          </div>
        </div>
      </div>

      <div class="up-bottom">
        <div class="up-progress-wrap">
          <div class="up-progress">
            <div class="up-buffer"></div>
            <div class="up-fill"></div>
            <div class="up-handle"></div>
          </div>
          <div class="up-tip"></div>
        </div>
        <div class="up-row">
          <button class="up-btn up-prev" aria-label="Anterior">${ICON.prev}</button>
          <button class="up-btn up-toggle" aria-label="Reproducir/Pausar">${ICON.play}</button>
          <button class="up-btn up-next" aria-label="Siguiente">${ICON.next}</button>
          <span class="up-time">0:00 / 0:00</span>
          <div class="up-spacer"></div>
          <div class="up-vol-wrap">
            <button class="up-btn up-volbtn" aria-label="Volumen">${ICON.vol}</button>
            <div class="up-vol"><input type="range" min="0" max="1" step="0.01" value="1"></div>
          </div>
          <div style="position:relative">
            <button class="up-btn up-listbtn" aria-label="Episodios">${ICON.list}</button>
          </div>
          <div style="position:relative">
            <button class="up-btn up-cogbtn" aria-label="Ajustes">${ICON.cog}</button>
            <div class="up-pop up-settings">
              <h5>Velocidad</h5>
              <div class="up-speeds"></div>
              <h5 style="margin-top:8px">Calidad</h5>
              <div class="up-quality"></div>
            </div>
          </div>
          <button class="up-btn up-fs" aria-label="Pantalla completa">${ICON.fs}</button>
        </div>
      </div>

      <aside class="up-panel">
        <div class="up-panel-head">
          <h3>Episodios</h3>
          <button class="up-btn up-panel-close" aria-label="Cerrar">${ICON.close}</button>
        </div>
        <div class="up-panel-body"></div>
      </aside>

      <div class="up-loading"><div class="up-spinner"></div></div>
      <div class="up-error"></div>
    `;
    document.body.appendChild(root);

    /* refs */
    video = root.querySelector('.up-video');
    els = {
      top: root.querySelector('.up-top'),
      seriesLabel: root.querySelector('.up-series-label'),
      title: root.querySelector('.up-title'),
      sub: root.querySelector('.up-sub'),
      back: root.querySelector('.up-back'),
      center: root.querySelector('.up-center'),
      playC: root.querySelector('.up-cbtn.up-play'),
      back10C: root.querySelector('.up-cbtn.up-back10'),
      fwd10C: root.querySelector('.up-cbtn.up-fwd10'),
      progressWrap: root.querySelector('.up-progress-wrap'),
      buffer: root.querySelector('.up-buffer'),
      fill: root.querySelector('.up-fill'),
      handle: root.querySelector('.up-handle'),
      tip: root.querySelector('.up-tip'),
      toggle: root.querySelector('.up-toggle'),
      prev: root.querySelector('.up-prev'),
      next: root.querySelector('.up-next'),
      time: root.querySelector('.up-time'),
      vol: root.querySelector('.up-vol input'),
      volbtn: root.querySelector('.up-volbtn'),
      listbtn: root.querySelector('.up-listbtn'),
      cogbtn: root.querySelector('.up-cogbtn'),
      settings: root.querySelector('.up-settings'),
      speeds: root.querySelector('.up-speeds'),
      quality: root.querySelector('.up-quality'),
      fs: root.querySelector('.up-fs'),
      panel: root.querySelector('.up-panel'),
      panelBody: root.querySelector('.up-panel-body'),
      panelClose: root.querySelector('.up-panel-close'),
      loading: root.querySelector('.up-loading'),
      error: root.querySelector('.up-error'),
      skipAction: root.querySelector('.up-skip-action'),
      skipBtn: root.querySelector('.up-skip-btn'),
      nextCard: root.querySelector('.up-next-card'),
      nextThumb: root.querySelector('.up-next-thumb'),
      nextProgress: root.querySelector('.up-next-progress'),
      nextTitle: root.querySelector('.up-next-title'),
      cancelNext: root.querySelector('.up-cancel-next'),
      playNext: root.querySelector('.up-play-next'),
      indL: root.querySelector('.up-skip-indicator[data-side="left"]'),
      indR: root.querySelector('.up-skip-indicator[data-side="right"]'),
    };

    bindEvents();
  }

  /* -------------------- Eventos -------------------- */
  function bindEvents() {
    els.back.addEventListener('click', close);
    els.playC.addEventListener('click', togglePlay);
    els.toggle.addEventListener('click', togglePlay);
    els.back10C.addEventListener('click', () => seekRel(-10));
    els.fwd10C.addEventListener('click', () => seekRel(10));
    els.prev.addEventListener('click', () => playIndex(index - 1));
    els.next.addEventListener('click', () => playIndex(index + 1));
    els.fs.addEventListener('click', toggleFs);
    els.skipBtn.addEventListener('click', handleSkip);
    els.cancelNext.addEventListener('click', cancelNextCard);
    els.playNext.addEventListener('click', () => { cancelNextCard(); playIndex(index + 1); });

    els.vol.addEventListener('input', e => { video.volume = +e.target.value; video.muted = video.volume === 0; });
    els.volbtn.addEventListener('click', () => { video.muted = !video.muted; });

    els.listbtn.addEventListener('click', () => els.panel.classList.toggle('up-open'));
    els.panelClose.addEventListener('click', () => els.panel.classList.remove('up-open'));

    els.cogbtn.addEventListener('click', (e) => { e.stopPropagation(); els.settings.classList.toggle('up-show-pop'); });
    document.addEventListener('click', (e) => {
      if (!els.settings.contains(e.target) && e.target !== els.cogbtn) els.settings.classList.remove('up-show-pop');
    });

    /* Video events */
    video.addEventListener('loadedmetadata', () => { updateTime(); restoreProgress(); });
    video.addEventListener('timeupdate', () => { updateTime(); checkSkipAndNext(); });
    video.addEventListener('progress', updateBuffer);
    video.addEventListener('play', () => setPlayIcon(true));
    video.addEventListener('pause', () => setPlayIcon(false));
    video.addEventListener('ended', onEnded);
    video.addEventListener('waiting', () => els.loading.classList.add('up-on'));
    video.addEventListener('canplay', () => els.loading.classList.remove('up-on'));
    video.addEventListener('error', onError);

    /* Mouse / touch UI */
    root.addEventListener('mousemove', showUi);
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('click', onCenterClick);

    /* Progress drag */
    const onPointerMove = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const r = els.progressWrap.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (x - r.left) / r.width));
      if (dragging) {
        video.currentTime = pct * (video.duration || 0);
      }
      els.tip.style.display = 'block';
      els.tip.style.left = (pct * r.width) + 'px';
      els.tip.textContent = fmtTime(pct * (video.duration || 0));
    };
    els.progressWrap.addEventListener('mousemove', onPointerMove);
    els.progressWrap.addEventListener('mouseleave', () => els.tip.style.display = 'none');
    els.progressWrap.addEventListener('mousedown', (e) => {
      dragging = true; els.handle.classList.add('up-drag');
      onPointerMove(e);
      const up = () => { dragging = false; els.handle.classList.remove('up-drag');
        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', up);
    });
    els.progressWrap.addEventListener('touchstart', (e) => {
      dragging = true; onPointerMove(e);
    }, { passive: true });
    els.progressWrap.addEventListener('touchmove', (e) => onPointerMove(e), { passive: true });
    els.progressWrap.addEventListener('touchend', () => { dragging = false; els.tip.style.display='none'; });

    /* Keyboard */
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (!root || !root.classList.contains('up-open')) return;
    switch (e.key) {
      case ' ': case 'k': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft':  seekRel(-10); break;
      case 'ArrowRight': seekRel(10); break;
      case 'ArrowUp':    video.volume = Math.min(1, video.volume + .1); els.vol.value = video.volume; break;
      case 'ArrowDown':  video.volume = Math.max(0, video.volume - .1); els.vol.value = video.volume; break;
      case 'f': toggleFs(); break;
      case 'm': video.muted = !video.muted; break;
      case 'Escape': close(); break;
      case 'n': playIndex(index + 1); break;
      case 'p': playIndex(index - 1); break;
    }
  }

  function onTouchStart(e) {
    showUi();
    const now = Date.now();
    const x = e.touches[0].clientX;
    const w = window.innerWidth;
    if (now - lastTap < 320 && Math.abs(x - lastTapX) < 60) {
      // double tap
      if (x < w / 3) { seekRel(-10); flashIndicator('left'); }
      else if (x > 2 * w / 3) { seekRel(10); flashIndicator('right'); }
      else togglePlay();
      e.preventDefault?.();
    }
    lastTap = now; lastTapX = x;
  }

  function onCenterClick(e) {
    // Click sobre el video (no controles) -> mostrar/ocultar UI o pausar en desktop
    if (e.target === video || e.target.classList.contains('up-vignette')) {
      if (window.matchMedia('(hover:hover)').matches) togglePlay();
      else showUi();
    }
  }

  /* -------------------- UI helpers -------------------- */
  function showUi() {
    root.classList.add('up-show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!video.paused) root.classList.remove('up-show');
    }, 3200);
  }
  function setPlayIcon(playing) {
    const html = playing ? ICON.pause : ICON.play;
    els.playC.innerHTML = html;
    els.toggle.innerHTML = html;
  }
  function togglePlay() { if (video.paused) video.play(); else video.pause(); showUi(); }
  function seekRel(d) { video.currentTime = Math.min((video.duration||0), Math.max(0, video.currentTime + d)); showUi(); }
  function flashIndicator(side) {
    const el = side === 'left' ? els.indL : els.indR;
    el.style.left = side === 'left' ? '15%' : 'auto';
    el.style.right = side === 'right' ? '15%' : 'auto';
    el.classList.add('up-show-i');
    setTimeout(() => el.classList.remove('up-show-i'), 500);
  }

  function updateTime() {
    els.time.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(video.duration)}`;
    const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    els.fill.style.width = pct + '%';
    els.handle.style.left = pct + '%';
  }
  function updateBuffer() {
    if (!video.buffered.length || !video.duration) return;
    const end = video.buffered.end(video.buffered.length - 1);
    els.buffer.style.width = ((end / video.duration) * 100) + '%';
  }

  function toggleFs() {
    if (!document.fullscreenElement) root.requestFullscreen?.().catch(()=>{});
    else document.exitFullscreen?.();
  }
  document.addEventListener('fullscreenchange', () => {
    els.fs.innerHTML = document.fullscreenElement ? ICON.fsExit : ICON.fs;
  });

  /* -------------------- Skip / Next -------------------- */
  let activeSkip = null; // { type:'intro'|'recap'|'credits', start, end }

  function checkSkipAndNext() {
    const ep = queue[index]; if (!ep) return;
    const t = video.currentTime;
    const dur = video.duration || 0;
    const segs = [
      ep.skipIntro && { type:'intro', label:'Saltar intro', ...rangeOf(ep.skipIntro) },
      ep.skipRecap && { type:'recap', label:'Saltar resumen', ...rangeOf(ep.skipRecap) },
      ep.skipCredits && { type:'credits', label:'Ver siguiente', ...rangeOf(ep.skipCredits) },
    ].filter(Boolean).filter(s => s.end > 0 && s.end > s.start);

    const hit = segs.find(s => t >= s.start && t < s.end);
    if (hit) {
      if (!activeSkip || activeSkip.type !== hit.type) {
        activeSkip = hit;
        els.skipBtn.textContent = hit.label;
        els.skipAction.classList.add('up-visible');
      }
    } else if (activeSkip) {
      activeSkip = null;
      els.skipAction.classList.remove('up-visible');
    }

    // Next-up card cuando entran créditos o quedan <20s
    const nearEnd = dur && (dur - t) <= 20;
    if (isSeries && nearEnd && index < queue.length - 1 && !nextCardArmed) {
      armNextCard();
    }
  }
  function rangeOf(seg) { return { start: parseTime(seg.start), end: parseTime(seg.end) }; }

  function handleSkip() {
    if (!activeSkip) return;
    if (activeSkip.type === 'credits') {
      playIndex(index + 1);
    } else {
      video.currentTime = activeSkip.end + 0.1;
    }
    els.skipAction.classList.remove('up-visible');
    activeSkip = null;
  }

  function armNextCard() {
    const nx = queue[index + 1]; if (!nx) return;
    nextCardArmed = true;
    els.nextThumb.style.backgroundImage = `url("${nx.thumbnail || nx.thumbnail2 || ''}")`;
    els.nextTitle.textContent = nx.title || 'Siguiente episodio';
    els.nextCard.classList.add('up-visible');
    // barra de progreso visual
    requestAnimationFrame(() => { els.nextProgress.style.transition='width 10s linear'; els.nextProgress.style.width='100%'; });
    nextCardTimer = setTimeout(() => playIndex(index + 1), 10000);
  }
  function cancelNextCard() {
    nextCardArmed = false;
    clearTimeout(nextCardTimer);
    els.nextCard.classList.remove('up-visible');
    els.nextProgress.style.transition='none'; els.nextProgress.style.width='0';
  }

  function onEnded() {
    cancelNextCard();
    if (isSeries && index < queue.length - 1) playIndex(index + 1);
  }

  /* -------------------- Errores y persistencia -------------------- */
  function onError() {
    els.error.textContent = 'No se pudo reproducir el video. Verifica la conexión o el enlace.';
    els.error.classList.add('up-on');
    els.loading.classList.remove('up-on');
    setTimeout(() => els.error.classList.remove('up-on'), 4500);
  }

  function progressKey(ep) { return 'up:progress:' + (ep.id || ep.url || ep.mediaUrl || ep.title); }
  function saveProgress() {
    const ep = queue[index]; if (!ep || !video.duration) return;
    try { localStorage.setItem(progressKey(ep), JSON.stringify({ t: video.currentTime, d: video.duration, at: Date.now() })); } catch(e){}
  }
  function restoreProgress() {
    const ep = queue[index]; if (!ep) return;
    try {
      const raw = localStorage.getItem(progressKey(ep));
      if (!raw) return;
      const { t, d } = JSON.parse(raw);
      if (t > 5 && d && t < d - 30) video.currentTime = t;
    } catch(e){}
  }
  setInterval(() => { if (root && root.classList.contains('up-open')) saveProgress(); }, 5000);

  /* -------------------- Settings: speed/quality -------------------- */
  function buildSettings(ep) {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    els.speeds.innerHTML = '';
    speeds.forEach(s => {
      const b = document.createElement('button');
      b.textContent = s === 1 ? 'Normal' : (s + 'x');
      b.className = video.playbackRate === s ? 'up-active' : '';
      b.onclick = () => {
        video.playbackRate = s;
        els.speeds.querySelectorAll('button').forEach(x => x.classList.remove('up-active'));
        b.classList.add('up-active');
      };
      els.speeds.appendChild(b);
    });
    // quality: si hay mediaUrl2 -> opción dual
    els.quality.innerHTML = '';
    const qualities = [];
    if (ep.mediaUrl)  qualities.push({ label: ep.lang  || 'Original', src: ep.mediaUrl });
    if (ep.mediaUrl2) qualities.push({ label: ep.lang2 || 'Alterna',  src: ep.mediaUrl2 });
    if (qualities.length < 2) {
      els.quality.innerHTML = '<button disabled style="opacity:.5">Única</button>';
      return;
    }
    qualities.forEach((q, i) => {
      const b = document.createElement('button');
      b.textContent = q.label;
      if (i === 0) b.classList.add('up-active');
      b.onclick = () => {
        const t = video.currentTime;
        video.src = q.src;
        video.currentTime = t;
        video.play();
        els.quality.querySelectorAll('button').forEach(x => x.classList.remove('up-active'));
        b.classList.add('up-active');
      };
      els.quality.appendChild(b);
    });
  }

  /* -------------------- Lista de episodios -------------------- */
  function buildList() {
    els.panelBody.innerHTML = '';
    queue.forEach((ep, i) => {
      const item = document.createElement('div');
      item.className = 'up-ep-item' + (i === index ? ' up-current' : '');
      item.innerHTML = `
        <div class="up-ep-thumb" style="background-image:url('${ep.thumbnail || ep.thumbnail2 || ''}')"></div>
        <div class="up-ep-meta">
          <span class="up-ep-num">${ep.season || ''}${ep.season && ep.episode ? ' · ' : ''}${ep.episode || ''}</span>
          <span class="up-ep-title">${ep.title || ''}</span>
          <span class="up-ep-desc">${ep.description || ''}</span>
        </div>`;
      item.addEventListener('click', () => { playIndex(i); els.panel.classList.remove('up-open'); });
      els.panelBody.appendChild(item);
    });
  }

  /* -------------------- Carga / reproducción -------------------- */
  function normalizeEpisode(ep) {
    return Object.assign({}, ep, {
      url: ep.url || ep.mediaUrl,
      _alt: ep.mediaUrl2,
      thumbnail: ep.thumbnail || ep.thumbnail2,
    });
  }

  function playIndex(i) {
    cancelNextCard();
    if (i < 0 || i >= queue.length) return;
    index = i;
    const ep = queue[i];
    const src = ep.url || ep.mediaUrl;
    if (!src) { onError(); return; }

    els.seriesLabel.textContent = isSeries
      ? (currentSerie?.titulo_serie || ep.season || 'Serie')
      : (ep.type || 'Película');
    els.title.textContent = ep.title || '';
    els.sub.textContent = [ep.season, ep.episode, ep.year].filter(Boolean).join(' · ');

    els.prev.disabled = i === 0;
    els.next.disabled = i === queue.length - 1;

    video.src = src;
    if (ep.thumbnail) video.poster = ep.thumbnail;
    if (ep.subtitlesUrl) {
      // limpiar tracks existentes
      [...video.querySelectorAll('track')].forEach(t => t.remove());
      const tr = document.createElement('track');
      tr.kind = 'subtitles'; tr.src = ep.subtitlesUrl; tr.srclang = 'es'; tr.label = 'Español'; tr.default = true;
      video.appendChild(tr);
    }
    video.load();
    video.play().catch(()=>{ /* autoplay puede requerir gesto */ });

    buildSettings(ep);
    buildList();
    showUi();
  }

  /* -------------------- API pública -------------------- */
  function open() {
    document.body.style.overflow = 'hidden';
    root.classList.add('up-open');
    showUi();
  }
  function close() {
    saveProgress();
    cancelNextCard();
    video.pause();
    video.removeAttribute('src');
    video.load();
    root.classList.remove('up-open');
    els.panel.classList.remove('up-open');
    document.body.style.overflow = '';
    if (document.fullscreenElement) document.exitFullscreen?.();
  }

  /**
   * Punto de entrada principal.
   * opts:
   *   { type:'series', seriesid?, url? }   -> reproduce todos los episodios de la serie
   *   { type:'episode', id? | episode? }   -> reproduce un episodio individual
   *   { episodes:[...], startIndex?:0 }    -> reproduce una cola personalizada
   */
  function play(opts = {}) {
    build();
    queue = []; isSeries = false; currentSerie = null; index = 0;

    if (Array.isArray(opts.episodes) && opts.episodes.length) {
      queue = opts.episodes.map(normalizeEpisode);
      isSeries = queue.length > 1;
      index = opts.startIndex || 0;
    } else if (opts.type === 'series') {
      const serie = opts.seriesid
        ? masEpisodios.serieById(opts.seriesid)
        : (opts.url ? masEpisodios.serieByUrl(opts.url) : null);
      currentSerie = serie || null;
      const sid = serie?.seriesid || opts.seriesid;
      const eps = sid ? masEpisodios.bySeries(sid) : [];
      if (!eps.length) { build(); open(); onError(); return; }
      queue = eps.map(normalizeEpisode);
      isSeries = true;
      index = opts.startIndex || 0;
    } else if (opts.type === 'episode') {
      let ep = opts.episode
        || (opts.id ? masEpisodios.byId(opts.id) : null)
        || (opts.url ? EPISODES.find(e => e.detailUrl === opts.url) : null);
      if (!ep) { build(); open(); onError(); return; }
      queue = [normalizeEpisode(ep)];
      isSeries = false;
    } else {
      console.warn('UniversalPlayer.play: opts inválidas', opts);
      return;
    }

    open();
    playIndex(index);
  }

  global.UniversalPlayer = { play, close, get queue(){ return queue; }, get current(){ return queue[index]; } };
})(window);
