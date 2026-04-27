/* =========================================================================
 *  player.js — Reproductor Universal estilo Prime Video
 *  -----------------------------------------------------------------------
 *  • Inyecta su propio markup + CSS (no requiere HTML adicional).
 *  • Iconos centrales en PNG (los que ya usabas), iconos de barra en SVG.
 *  • Ventana lateral de episodios EMPUJA el video (no lo cubre).
 *  • Recomendados flotantes: aparecen al hacer scroll up, ocultan al scroll down.
 *  • Indicadores ±N segundos que se ACUMULAN (10, 20, 30…) por toques rápidos.
 *  • Lógica de reproducción separada: serie vs episodio suelto vs película.
 *  • Persistencia delegada a memoria.js  (window.Memoria).
 *  • Media Session API + Picture-in-Picture personalizado.
 *
 *  API pública:
 *    Player.playEpisode(episode, { episodes, recommendations })
 *    Player.playSeries(series, { episodes, recommendations })
 *    Player.playMovie(movie,    { recommendations })
 *    Player.close()
 *
 *  Donde:
 *    episode = { id, date, mediaUrl, mediaUrl2?, trailer?, thumbnail, title,
 *                description, seriesid?, skipIntro?, skipRecap?, skipCredits?,
 *                subtitlesUrl?, bgColor?, allowDownload? ... }
 *    series  = { seriesid, titulo_serie, portada_serie, descripcion_serie, bgColor }
 *    episodes = TODOS los episodios disponibles (se filtran por seriesid)
 *    recommendations = [ episode | series ]   (para ventana lateral / floating)
 * ======================================================================= */
(function (global) {
  'use strict';

  if (!global.Memoria) {
    console.error('[Player] memoria.js debe cargarse antes que player.js');
  }
  const Mem = global.Memoria;

  /* ---------- iconos PNG (los tuyos, centrales) --------------------- */
  const IMG = {
    play:    'https://nikichitonjesus.odoo.com/web/image/715-d5d403f0/playvid.png',
    pause:   'https://nikichitonjesus.odoo.com/web/image/716-c7a68f34/pausevid.png',
    back10:  'https://www.nikichitonjesus.com/web/image/438-deea748f/-10.webp',
    fwd10:   'https://www.nikichitonjesus.com/web/image/439-9448d521/%2B10.webp'
  };

  /* ---------- iconos SVG (en línea, vectoriales, color heredado) ---- */
  const SVG = {
    close:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    prev:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6L9 12l11 6V6z"/></svg>`,
    next:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 6v12l11-6L4 6z"/></svg>`,
    volHigh:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zm-2.5-9v2.06A8.001 8.001 0 0 1 20 12a8.001 8.001 0 0 1-6 7.94V22c4.56-.93 8-4.96 8-10s-3.44-9.07-8-10z"/></svg>`,
    volMute:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45c.03-.21.05-.42.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.93 8.93 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
    speed:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.46 10A9 9 0 1 0 21 13.99l-1.43-.42A7.5 7.5 0 1 1 18.05 11.5L19.46 10zM12 8v5l4.25 2.52.77-1.28L13.5 12.25V8H12z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.66 8.84a.5.5 0 0 0 .12.64L4.81 11.06a7.07 7.07 0 0 0 0 1.88L2.78 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96a7 7 0 0 0 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>`,
    pip:      `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`,
    fullscreen: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
    fullscreenExit: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`,
    list:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z"/></svg>`,
    history:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3zm-1 5v5l4.25 2.52.77-1.28L13.5 12.25V8H12z"/></svg>`,
    chevronUp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`,
    chevronDown:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>`,
    sparkle:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z"/></svg>`
  };

  /* ---------- estilos --------------------------------------------------- */
  const CSS = `
  #upv-root, #upv-root * { box-sizing: border-box; }
  #upv-root {
    --primary: #00a8e1;        /* azul Prime */
    --primary-dim: #0090c2;
    --bg: #000;
    --text: #fff;
    --text-dim: rgba(255,255,255,.72);
    --panel: rgba(15,17,21,.92);
    --panel-blur: rgba(15,17,21,.6);
    --side-w: 380px;
    --ease: cubic-bezier(.22,.61,.36,1);
    position: fixed; inset: 0; z-index: 99999;
    background: #000; color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: none; overflow: hidden;
  }
  #upv-root.open { display: block; }
  #upv-stage {
    position: absolute; inset: 0;
    transition: transform .55s var(--ease), width .55s var(--ease);
    will-change: transform;
  }
  #upv-root.side-open #upv-stage {
    width: calc(100% - var(--side-w));
  }
  #upv-video {
    width: 100%; height: 100%; object-fit: contain; background: #000;
    display: block;
  }
  /* Top vignette + bottom vignette */
  #upv-vignette {
    position: absolute; inset: 0; pointer-events: none; z-index: 5;
    background:
      linear-gradient(to bottom, rgba(0,0,0,.85) 0, rgba(0,0,0,0) 18%),
      linear-gradient(to top,    rgba(0,0,0,.9)  0, rgba(0,0,0,0) 28%);
    opacity: 0; transition: opacity .35s var(--ease);
  }
  #upv-root.controls-on #upv-vignette { opacity: 1; }

  /* TOP BAR */
  #upv-topbar {
    position: absolute; top: 0; left: 0; right: 0; z-index: 30;
    display: flex; align-items: center; gap: 16px;
    padding: 18px 24px;
    opacity: 0; transform: translateY(-12px);
    transition: opacity .3s var(--ease), transform .35s var(--ease);
  }
  #upv-root.controls-on #upv-topbar { opacity: 1; transform: none; }
  #upv-title {
    font-size: 20px; font-weight: 600; letter-spacing: .2px;
    text-shadow: 0 2px 8px rgba(0,0,0,.6);
    flex: 1; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  #upv-close {
    width: 42px; height: 42px; border-radius: 50%;
    background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.15);
    color: #fff; cursor: pointer; padding: 10px;
    display: grid; place-items: center;
    transition: transform .2s var(--ease), background .2s, border-color .2s;
  }
  #upv-close:hover { transform: scale(1.08); background: var(--primary); border-color: var(--primary); }
  #upv-close svg { width: 100%; height: 100%; }

  /* CENTER CONTROLS */
  #upv-center {
    position: absolute; inset: 0; z-index: 20;
    display: flex; align-items: center; justify-content: center;
    gap: clamp(48px, 12vw, 140px);
    pointer-events: none;
    opacity: 0; transition: opacity .3s var(--ease);
  }
  #upv-root.controls-on #upv-center { opacity: 1; }
  #upv-root.controls-on #upv-center > * { pointer-events: auto; }

  .upv-cbtn {
    background: radial-gradient(circle at 50% 50%, rgba(0,0,0,.55) 35%, transparent 75%);
    border: none; cursor: pointer; padding: 18px; border-radius: 50%;
    display: grid; place-items: center;
    position: relative;
    transition: transform .2s var(--ease);
  }
  .upv-cbtn:hover { transform: scale(1.12); }
  .upv-cbtn:active { transform: scale(.92); }
  .upv-cbtn img { width: 56px; height: 56px; display: block; pointer-events: none; }
  .upv-cbtn.big img { width: 88px; height: 88px; filter: drop-shadow(0 4px 14px rgba(0,168,225,.4)); }
  .upv-cbtn.big { padding: 24px; }
  .upv-cbtn.big::after {
    content: ''; position: absolute; inset: 0; border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(0,168,225,.55); animation: upv-pulse 2.4s var(--ease) infinite;
    pointer-events: none;
  }
  @keyframes upv-pulse {
    0%   { box-shadow: 0 0 0 0    rgba(0,168,225,.45); }
    70%  { box-shadow: 0 0 0 24px rgba(0,168,225,0);   }
    100% { box-shadow: 0 0 0 0    rgba(0,168,225,0);   }
  }
  /* contadores ±N s al lado de back/forward */
  .upv-counter {
    position: absolute; top: 50%; transform: translateY(-50%);
    background: rgba(0,0,0,.55); color: #fff;
    padding: 6px 12px; border-radius: 999px;
    font-size: 14px; font-weight: 700; letter-spacing: .3px;
    opacity: 0; pointer-events: none;
    transition: opacity .25s, transform .25s;
    white-space: nowrap;
  }
  .upv-cbtn .upv-counter.left  { right: calc(100% + 8px); }
  .upv-cbtn .upv-counter.right { left:  calc(100% + 8px); }
  .upv-counter.show { opacity: 1; transform: translateY(-50%) scale(1.05); }

  /* BOTTOM BAR */
  #upv-bottom {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 30;
    padding: 0 24px 18px; display: flex; flex-direction: column; gap: 10px;
    opacity: 0; transform: translateY(12px);
    transition: opacity .3s var(--ease), transform .35s var(--ease);
  }
  #upv-root.controls-on #upv-bottom { opacity: 1; transform: none; }

  /* progress */
  #upv-progress {
    position: relative; height: 6px; background: rgba(255,255,255,.22);
    border-radius: 999px; cursor: pointer; overflow: visible;
    transition: height .15s var(--ease);
  }
  #upv-progress:hover { height: 8px; }
  #upv-buffered { position: absolute; left: 0; top: 0; height: 100%; background: rgba(255,255,255,.32); border-radius: 999px; width: 0; }
  #upv-played   { position: absolute; left: 0; top: 0; height: 100%; background: var(--primary); border-radius: 999px; width: 0; }
  #upv-handle {
    position: absolute; top: 50%; transform: translate(-50%, -50%) scale(0);
    width: 16px; height: 16px; border-radius: 50%; background: var(--primary);
    box-shadow: 0 0 0 4px rgba(0,168,225,.25);
    transition: transform .15s var(--ease);
  }
  #upv-progress:hover #upv-handle, #upv-progress.dragging #upv-handle { transform: translate(-50%, -50%) scale(1); }
  #upv-tooltip {
    position: absolute; bottom: 16px; transform: translateX(-50%);
    background: rgba(0,0,0,.85); color: #fff; padding: 5px 10px;
    border-radius: 6px; font-size: 12px; font-weight: 600;
    pointer-events: none; opacity: 0; transition: opacity .15s;
  }
  #upv-tooltip.show { opacity: 1; }

  /* control row */
  #upv-row {
    display: flex; align-items: center; gap: 6px;
  }
  .upv-btn {
    background: none; border: none; color: #fff; cursor: pointer;
    width: 40px; height: 40px; padding: 8px; border-radius: 8px;
    display: grid; place-items: center; position: relative;
    transition: transform .2s var(--ease), background .2s, color .2s;
  }
  .upv-btn:hover { background: rgba(255,255,255,.12); transform: translateY(-2px); color: var(--primary); }
  .upv-btn:active { transform: scale(.9); }
  .upv-btn svg { width: 100%; height: 100%; }
  .upv-spacer { flex: 1; }
  #upv-time {
    color: #fff; font-size: 13px; font-weight: 500; padding: 0 12px;
    font-variant-numeric: tabular-nums; letter-spacing: .3px;
    text-shadow: 0 1px 4px rgba(0,0,0,.6);
  }

  /* popups */
  .upv-pop {
    position: absolute; bottom: calc(100% + 12px); left: 50%;
    transform: translateX(-50%) translateY(8px);
    background: var(--panel); backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px; padding: 14px;
    min-width: 180px;
    opacity: 0; pointer-events: none;
    transition: opacity .2s var(--ease), transform .25s var(--ease);
    box-shadow: 0 12px 40px rgba(0,0,0,.6);
    z-index: 50;
  }
  .upv-pop.show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
  .upv-pop input[type=range] {
    -webkit-appearance: none; appearance: none;
    width: 140px; height: 4px; background: rgba(255,255,255,.22);
    border-radius: 999px; outline: none; cursor: pointer;
  }
  .upv-pop input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
    background: var(--primary); cursor: pointer; transition: transform .15s;
    box-shadow: 0 0 0 4px rgba(0,168,225,.18);
  }
  .upv-pop input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }
  .upv-pop label {
    display: block; font-size: 12px; color: var(--text-dim);
    margin-bottom: 8px; text-transform: uppercase; letter-spacing: .8px; font-weight: 600;
  }
  .upv-pop .val { font-size: 13px; font-weight: 600; color: var(--primary); margin-top: 6px; text-align: center; }
  .upv-pop .speeds { display: grid; grid-template-columns: repeat(4,1fr); gap: 4px; margin-top: 8px; }
  .upv-pop .speeds button {
    background: rgba(255,255,255,.06); border: 1px solid transparent;
    color: #fff; padding: 6px 0; border-radius: 6px; cursor: pointer;
    font-size: 12px; font-weight: 600; transition: all .2s;
  }
  .upv-pop .speeds button:hover { background: rgba(255,255,255,.14); }
  .upv-pop .speeds button.active { background: var(--primary); border-color: var(--primary); }
  .upv-pop .menu-item {
    display: flex; align-items: center; gap: 10px;
    background: none; border: none; color: #fff; padding: 8px 10px;
    width: 100%; cursor: pointer; border-radius: 8px;
    font-size: 14px; transition: background .2s;
  }
  .upv-pop .menu-item:hover { background: rgba(255,255,255,.1); }
  .upv-pop .menu-item svg { width: 18px; height: 18px; flex-shrink: 0; }

  /* SIDE PANEL — empuja el video */
  #upv-side {
    position: absolute; top: 0; right: 0; bottom: 0;
    width: var(--side-w); background: linear-gradient(180deg, #0d0f13 0%, #05060a 100%);
    border-left: 1px solid rgba(255,255,255,.06);
    transform: translateX(100%); transition: transform .55s var(--ease);
    z-index: 40; display: flex; flex-direction: column; overflow: hidden;
  }
  #upv-root.side-open #upv-side { transform: none; }
  #upv-side-head {
    display: flex; align-items: center; gap: 10px;
    padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,.06);
  }
  #upv-side-title { font-size: 16px; font-weight: 600; flex: 1; }
  #upv-side-close {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,.06); border: none; color: #fff;
    cursor: pointer; padding: 9px; display: grid; place-items: center;
    transition: background .2s, transform .2s;
  }
  #upv-side-close:hover { background: var(--primary); transform: rotate(90deg); }
  #upv-side-close svg { width: 100%; height: 100%; }
  #upv-side-list { flex: 1; overflow-y: auto; padding: 12px; }
  #upv-side-list::-webkit-scrollbar { width: 6px; }
  #upv-side-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 999px; }
  .upv-ep {
    display: flex; gap: 12px; padding: 10px; border-radius: 10px;
    cursor: pointer; transition: background .2s, transform .2s;
    margin-bottom: 8px;
  }
  .upv-ep:hover { background: rgba(255,255,255,.06); transform: translateX(-2px); }
  .upv-ep.active {
    background: rgba(0,168,225,.14); box-shadow: inset 3px 0 0 var(--primary);
  }
  .upv-ep-thumb {
    width: 130px; aspect-ratio: 16/9; border-radius: 6px;
    background-size: cover; background-position: center;
    flex-shrink: 0; background-color: #1a1d23; position: relative; overflow: hidden;
  }
  .upv-ep-thumb .bar { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--primary); width: 0; }
  .upv-ep-info { flex: 1; min-width: 0; }
  .upv-ep-info h4 { margin: 2px 0 4px; font-size: 14px; font-weight: 600; line-height: 1.3;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .upv-ep-info p  { margin: 0; font-size: 12px; color: var(--text-dim); line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  /* FLOATING RECOMMENDATIONS */
  #upv-floating {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 25;
    background: linear-gradient(to top, rgba(0,0,0,.95) 0%, rgba(0,0,0,.7) 60%, rgba(0,0,0,0) 100%);
    padding: 70px 24px 110px;
    transform: translateY(100%); transition: transform .5s var(--ease);
    pointer-events: none;
  }
  #upv-floating.show { transform: translateY(0); pointer-events: auto; }
  #upv-floating-head {
    display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
  }
  #upv-floating-head h3 { margin: 0; font-size: 18px; font-weight: 600; flex: 1;
    display: flex; align-items: center; gap: 8px; }
  #upv-floating-head h3 svg { width: 18px; height: 18px; color: var(--primary); }
  #upv-floating-close {
    background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
    color: #fff; padding: 6px 14px; border-radius: 999px; cursor: pointer;
    font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;
    transition: all .2s;
  }
  #upv-floating-close:hover { background: var(--primary); border-color: var(--primary); }
  #upv-floating-close svg { width: 14px; height: 14px; }
  #upv-floating-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px;
  }
  .upv-rec {
    cursor: pointer; border-radius: 8px; overflow: hidden;
    background: #14171c; transition: transform .25s var(--ease), box-shadow .25s;
  }
  .upv-rec:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 10px 30px rgba(0,168,225,.25); }
  .upv-rec-thumb {
    width: 100%; aspect-ratio: 16/9;
    background-size: cover; background-position: center; background-color: #1a1d23;
  }
  .upv-rec-info { padding: 8px 10px; }
  .upv-rec-info h4 { margin: 0 0 3px; font-size: 13px; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .upv-rec-info p { margin: 0; font-size: 11px; color: var(--text-dim);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* skip buttons */
  #upv-skip {
    position: absolute; right: 24px; bottom: 100px; z-index: 28;
    display: flex; flex-direction: column; gap: 10px; align-items: flex-end;
  }
  .upv-skip-btn {
    background: rgba(20,23,28,.92); color: #fff; border: 1px solid rgba(255,255,255,.18);
    padding: 12px 22px; border-radius: 6px; cursor: pointer;
    font-size: 14px; font-weight: 600; letter-spacing: .3px;
    transition: all .2s var(--ease); backdrop-filter: blur(8px);
  }
  .upv-skip-btn:hover { background: var(--primary); border-color: var(--primary); transform: translateY(-2px); }

  /* next-up card al final del episodio */
  #upv-nextup {
    position: absolute; right: 24px; bottom: 100px; z-index: 28;
    width: 320px; background: rgba(15,17,21,.94); backdrop-filter: blur(10px);
    border-radius: 10px; overflow: hidden;
    border: 1px solid rgba(255,255,255,.1);
    box-shadow: 0 12px 40px rgba(0,0,0,.6);
    display: none; opacity: 0; transform: translateY(20px);
    transition: opacity .35s, transform .35s;
  }
  #upv-nextup.show { display: block; opacity: 1; transform: none; }
  #upv-nextup .nu-thumb {
    width: 100%; aspect-ratio: 16/9; background-size: cover; background-position: center; position: relative;
  }
  #upv-nextup .nu-bar { position: absolute; left: 0; bottom: 0; height: 4px; background: var(--primary); width: 0; transition: width .1s linear; }
  #upv-nextup .nu-body { padding: 12px 14px; }
  #upv-nextup .nu-label { font-size: 11px; text-transform: uppercase; color: var(--primary); font-weight: 700; letter-spacing: 1px; }
  #upv-nextup .nu-title { margin: 4px 0 8px; font-size: 15px; font-weight: 600; }
  #upv-nextup .nu-actions { display: flex; gap: 8px; }
  #upv-nextup .nu-actions button {
    flex: 1; padding: 8px; border-radius: 6px; cursor: pointer;
    font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,.18);
    background: rgba(255,255,255,.06); color: #fff; transition: all .2s;
  }
  #upv-nextup .nu-actions .play { background: var(--primary); border-color: var(--primary); }
  #upv-nextup .nu-actions button:hover { transform: translateY(-1px); }

  /* loading + error */
  #upv-loading {
    position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
    z-index: 15; pointer-events: none;
  }
  #upv-loading.show { display: flex; }
  #upv-spinner {
    width: 56px; height: 56px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,.15); border-top-color: var(--primary);
    animation: upv-spin 1s linear infinite;
  }
  @keyframes upv-spin { to { transform: rotate(360deg); } }
  #upv-error {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: rgba(220,38,38,.95); color: #fff; padding: 14px 22px;
    border-radius: 8px; z-index: 1000; display: none; max-width: 80%;
    text-align: center; font-size: 14px;
  }

  /* responsive */
  @media (max-width: 768px) {
    #upv-root { --side-w: 85vw; }
    .upv-cbtn img { width: 44px; height: 44px; }
    .upv-cbtn.big img { width: 70px; height: 70px; }
    #upv-title { font-size: 16px; }
    #upv-floating { padding: 50px 14px 90px; }
    #upv-floating-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .upv-ep-thumb { width: 110px; }
    #upv-bottom { padding: 0 12px 12px; }
    #upv-nextup { width: 260px; right: 12px; bottom: 90px; }
    #upv-skip { right: 12px; bottom: 90px; }
  }
  `;

  /* ---------- markup --------------------------------------------------- */
  const HTML = `
  <style>${CSS}</style>
  <div id="upv-stage">
    <video id="upv-video" playsinline crossorigin="anonymous"></video>
    <div id="upv-vignette"></div>

    <div id="upv-topbar">
      <div id="upv-title"></div>
      <button id="upv-close" aria-label="Cerrar">${SVG.close}</button>
    </div>

    <div id="upv-center">
      <button class="upv-cbtn" id="upv-back" aria-label="Retroceder">
        <img src="${IMG.back10}" alt="">
        <span class="upv-counter left" id="upv-back-counter">-10s</span>
      </button>
      <button class="upv-cbtn big" id="upv-play" aria-label="Reproducir/Pausar">
        <img src="${IMG.play}" alt="" id="upv-play-img">
      </button>
      <button class="upv-cbtn" id="upv-fwd" aria-label="Avanzar">
        <img src="${IMG.fwd10}" alt="">
        <span class="upv-counter right" id="upv-fwd-counter">+10s</span>
      </button>
    </div>

    <div id="upv-skip"></div>
    <div id="upv-nextup">
      <div class="nu-thumb" id="upv-nu-thumb"><div class="nu-bar" id="upv-nu-bar"></div></div>
      <div class="nu-body">
        <div class="nu-label">Siguiente episodio</div>
        <div class="nu-title" id="upv-nu-title"></div>
        <div class="nu-actions">
          <button id="upv-nu-cancel">Cancelar</button>
          <button class="play" id="upv-nu-play">Reproducir ahora</button>
        </div>
      </div>
    </div>

    <div id="upv-floating">
      <div id="upv-floating-head">
        <h3>${SVG.sparkle} Quizá te interese</h3>
        <button id="upv-floating-close">${SVG.close} Ocultar</button>
      </div>
      <div id="upv-floating-grid"></div>
    </div>

    <div id="upv-bottom">
      <div id="upv-progress">
        <div id="upv-buffered"></div>
        <div id="upv-played"></div>
        <div id="upv-handle"></div>
        <div id="upv-tooltip">0:00</div>
      </div>
      <div id="upv-row">
        <button class="upv-btn" id="upv-prev" aria-label="Anterior">${SVG.prev}</button>
        <button class="upv-btn" id="upv-playsm" aria-label="Play/Pause"><svg viewBox="0 0 24 24" fill="currentColor"><path id="upv-playsm-path" d="M8 5v14l11-7z"/></svg></button>
        <button class="upv-btn" id="upv-next" aria-label="Siguiente">${SVG.next}</button>
        <span id="upv-time">0:00 / 0:00</span>
        <div class="upv-spacer"></div>
        <div style="position:relative">
          <button class="upv-btn" id="upv-vol-btn" aria-label="Volumen">${SVG.volHigh}</button>
          <div class="upv-pop" id="upv-vol-pop">
            <label>Volumen</label>
            <input type="range" id="upv-vol" min="0" max="1" step="0.05" value="1">
            <div class="val" id="upv-vol-val">100%</div>
          </div>
        </div>
        <div style="position:relative">
          <button class="upv-btn" id="upv-spd-btn" aria-label="Velocidad">${SVG.speed}</button>
          <div class="upv-pop" id="upv-spd-pop">
            <label>Velocidad</label>
            <div class="speeds" id="upv-spd-grid"></div>
            <div class="val" id="upv-spd-val">1x</div>
          </div>
        </div>
        <button class="upv-btn" id="upv-list-btn" aria-label="Episodios">${SVG.list}</button>
        <div style="position:relative">
          <button class="upv-btn" id="upv-set-btn" aria-label="Ajustes">${SVG.settings}</button>
          <div class="upv-pop" id="upv-set-pop">
            <button class="menu-item" id="upv-hist-btn">${SVG.history} Historial</button>
            <button class="menu-item" id="upv-pip-btn">${SVG.pip} Mini reproductor</button>
          </div>
        </div>
        <button class="upv-btn" id="upv-fs-btn" aria-label="Pantalla completa">${SVG.fullscreen}</button>
      </div>
    </div>

    <div id="upv-loading"><div id="upv-spinner"></div></div>
    <div id="upv-error" role="alert"></div>
  </div>

  <aside id="upv-side">
    <div id="upv-side-head">
      <div id="upv-side-title">Episodios</div>
      <button id="upv-side-close" aria-label="Cerrar">${SVG.close}</button>
    </div>
    <div id="upv-side-list"></div>
  </aside>
  `;

  /* ---------- estado --------------------------------------------------- */
  const state = {
    mode: null,           // 'series' | 'episode' | 'movie'
    episodes: [],         // playlist activa (orden a respetar)
    index: 0,             // posición actual
    seriesId: null,       // si es modo serie
    recommendations: [],  // contenido para floating + lateral cuando es película
    isPlaying: false,
    duration: 0,
    speed: 1,
    seekAccum: 0, seekDir: 0, seekTimer: null,
    controlsTimer: null,
    nextUpTimer: null,
    saveTimer: null,
    initialStart: 0,      // tiempo inicial al cargar src
    universalPool: []     // último pool global para fallback aleatorio al final
  };

  /* ---------- crear DOM raíz ------------------------------------------ */
  const root = document.createElement('div');
  root.id = 'upv-root';
  root.innerHTML = HTML;
  document.body.appendChild(root);

  /* shortcuts */
  const $ = id => root.querySelector('#' + id);
  const video    = $('upv-video');
  const playImg  = $('upv-play-img');
  const titleEl  = $('upv-title');
  const stage    = $('upv-stage');
  const side     = $('upv-side');
  const sideList = $('upv-side-list');
  const sideTitle= $('upv-side-title');
  const floating = $('upv-floating');
  const floatingGrid = $('upv-floating-grid');
  const skipWrap = $('upv-skip');
  const nextUp   = $('upv-nextup');
  const tooltip  = $('upv-tooltip');
  const buffered = $('upv-buffered');
  const played   = $('upv-played');
  const handle   = $('upv-handle');
  const progress = $('upv-progress');
  const timeEl   = $('upv-time');
  const errorEl  = $('upv-error');
  const loadingEl= $('upv-loading');
  const playsmPath = $('upv-playsm-path');

  /* ---------- helpers -------------------------------------------------- */
  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
    return h ? `${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`
             : `${m}:${String(x).padStart(2,'0')}`;
  }
  function parseT(t) {
    if (!t || typeof t !== 'string') return 0;
    const p = t.split(':').map(Number);
    if (p.length === 2) return (p[0]||0)*60 + (p[1]||0);
    if (p.length === 3) return (p[0]||0)*3600 + (p[1]||0)*60 + (p[2]||0);
    return 0;
  }
  function showError(msg) {
    errorEl.textContent = msg; errorEl.style.display = 'block';
    setTimeout(() => errorEl.style.display = 'none', 4500);
  }
  function ep() { return state.episodes[state.index]; }

  /* ---------- mostrar/ocultar controles ------------------------------- */
  function showControls() {
    root.classList.add('controls-on');
    clearTimeout(state.controlsTimer);
    if (state.isPlaying) state.controlsTimer = setTimeout(hideControls, 3000);
  }
  function hideControls() {
    if (anyPopupOpen() || progress.classList.contains('dragging')) return;
    root.classList.remove('controls-on');
  }
  function anyPopupOpen() {
    return root.querySelectorAll('.upv-pop.show').length > 0;
  }

  /* ---------- play / pause -------------------------------------------- */
  function togglePlay() {
    if (video.paused) video.play().catch(handleErr);
    else video.pause();
  }
  function setPlayUI(playing) {
    state.isPlaying = playing;
    playImg.src = playing ? IMG.pause : IMG.play;
    playsmPath.setAttribute('d', playing ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5v14l11-7z');
    updateMediaSession();
  }
  video.addEventListener('play',  () => { setPlayUI(true);  showControls(); });
  video.addEventListener('pause', () => { setPlayUI(false); showControls(); });

  /* ---------- progreso ------------------------------------------------- */
  video.addEventListener('loadedmetadata', () => {
    state.duration = video.duration || 0;
    if (state.initialStart && state.initialStart < state.duration - 5) {
      try { video.currentTime = state.initialStart; } catch(_) {}
    }
    state.initialStart = 0;
    updateMediaSession();
  });
  video.addEventListener('timeupdate', () => {
    if (!state.duration) return;
    const pct = (video.currentTime / state.duration) * 100;
    played.style.width = pct + '%';
    handle.style.left = pct + '%';
    timeEl.textContent = `${fmt(video.currentTime)} / ${fmt(state.duration)}`;
    handleSkipMarkers();
    handleNextUp();
    throttledSave();
  });
  video.addEventListener('progress', () => {
    if (video.buffered.length && state.duration) {
      const end = video.buffered.end(video.buffered.length - 1);
      buffered.style.width = (end / state.duration * 100) + '%';
    }
  });
  video.addEventListener('waiting', () => loadingEl.classList.add('show'));
  video.addEventListener('playing', () => loadingEl.classList.remove('show'));
  video.addEventListener('canplay', () => loadingEl.classList.remove('show'));
  video.addEventListener('ended',   onEnded);
  video.addEventListener('error',   handleErr);

  function throttledSave() {
    if (state.saveTimer) return;
    state.saveTimer = setTimeout(() => {
      state.saveTimer = null;
      const e = ep(); if (!e) return;
      Mem.saveEpisodeProgress(e, video.currentTime, state.duration);
    }, 1500);
  }

  /* ---------- seek con acumulador ±N --------------------------------- */
  function seek(delta, btn) {
    const dir = delta > 0 ? 1 : -1;
    if (state.seekDir !== dir) state.seekAccum = 0;
    state.seekDir = dir;
    state.seekAccum += Math.abs(delta);
    video.currentTime = Math.max(0, Math.min(state.duration || 1e9, video.currentTime + delta));
    const counter = btn.querySelector('.upv-counter');
    counter.textContent = (dir > 0 ? '+' : '-') + state.seekAccum + 's';
    counter.classList.add('show');
    clearTimeout(state.seekTimer);
    state.seekTimer = setTimeout(() => {
      counter.classList.remove('show');
      state.seekAccum = 0; state.seekDir = 0;
    }, 900);
    showControls();
  }
  $('upv-back').addEventListener('click', e => seek(-10, e.currentTarget));
  $('upv-fwd' ).addEventListener('click', e => seek( 10, e.currentTarget));

  /* ---------- progress bar drag --------------------------------------- */
  let dragging = false;
  function pxToTime(clientX) {
    const r = progress.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, clientX - r.left));
    return { pct: x / r.width, x };
  }
  progress.addEventListener('mousemove', e => {
    if (!state.duration) return;
    const { pct, x } = pxToTime(e.clientX);
    tooltip.textContent = fmt(pct * state.duration);
    tooltip.style.left = x + 'px';
    tooltip.classList.add('show');
  });
  progress.addEventListener('mouseleave', () => { if (!dragging) tooltip.classList.remove('show'); });
  function startDrag(e) {
    dragging = true; progress.classList.add('dragging');
    moveDrag(e); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', moveDrag, { passive:false }); window.addEventListener('touchend', endDrag);
  }
  function moveDrag(e) {
    if (!dragging || !state.duration) return;
    if (e.cancelable) e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const { pct, x } = pxToTime(cx);
    video.currentTime = pct * state.duration;
    played.style.width = (pct * 100) + '%';
    handle.style.left  = (pct * 100) + '%';
    tooltip.textContent = fmt(video.currentTime);
    tooltip.style.left = x + 'px'; tooltip.classList.add('show');
  }
  function endDrag() {
    dragging = false; progress.classList.remove('dragging');
    tooltip.classList.remove('show');
    window.removeEventListener('mousemove', moveDrag); window.removeEventListener('mouseup', endDrag);
    window.removeEventListener('touchmove', moveDrag); window.removeEventListener('touchend', endDrag);
  }
  progress.addEventListener('mousedown', startDrag);
  progress.addEventListener('touchstart', startDrag, { passive: true });

  /* ---------- volumen / velocidad / popups ---------------------------- */
  const volBtn = $('upv-vol-btn'), volPop = $('upv-vol-pop'), volSlider = $('upv-vol'), volVal = $('upv-vol-val');
  const spdBtn = $('upv-spd-btn'), spdPop = $('upv-spd-pop'), spdGrid = $('upv-spd-grid'), spdVal = $('upv-spd-val');
  const setBtn = $('upv-set-btn'), setPop = $('upv-set-pop');

  function closeAllPops(except) {
    [volPop, spdPop, setPop].forEach(p => { if (p !== except) p.classList.remove('show'); });
  }
  function togglePop(p) { const open = p.classList.contains('show'); closeAllPops(p); p.classList.toggle('show', !open); showControls(); }
  volBtn.addEventListener('click', () => togglePop(volPop));
  spdBtn.addEventListener('click', () => togglePop(spdPop));
  setBtn.addEventListener('click', () => togglePop(setPop));
  document.addEventListener('click', e => {
    if (!root.contains(e.target)) return;
    if (!e.target.closest('.upv-pop') && !e.target.closest('#upv-vol-btn') &&
        !e.target.closest('#upv-spd-btn') && !e.target.closest('#upv-set-btn')) {
      closeAllPops();
    }
  });

  volSlider.addEventListener('input', () => {
    video.volume = parseFloat(volSlider.value);
    video.muted = video.volume === 0;
    volVal.textContent = Math.round(video.volume * 100) + '%';
    volBtn.innerHTML = video.muted ? SVG.volMute : SVG.volHigh;
  });
  // construir grid de velocidades
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  SPEEDS.forEach(s => {
    const b = document.createElement('button');
    b.textContent = s + 'x'; if (s === 1) b.classList.add('active');
    b.dataset.s = s;
    b.addEventListener('click', () => {
      video.playbackRate = s; state.speed = s; spdVal.textContent = s + 'x';
      spdGrid.querySelectorAll('button').forEach(x => x.classList.toggle('active', +x.dataset.s === s));
    });
    spdGrid.appendChild(b);
  });

  /* ---------- ventana lateral ----------------------------------------- */
  function openSide() {
    root.classList.add('side-open');
    showControls();
    setTimeout(() => {
      const a = sideList.querySelector('.upv-ep.active');
      if (a) a.scrollIntoView({ behavior:'smooth', block:'center' });
    }, 350);
  }
  function closeSide() { root.classList.remove('side-open'); }
  $('upv-list-btn').addEventListener('click', () => {
    root.classList.contains('side-open') ? closeSide() : openSide();
  });
  $('upv-side-close').addEventListener('click', closeSide);

  function renderSide() {
    sideList.innerHTML = '';
    if (state.mode === 'series') sideTitle.textContent = 'Episodios';
    else if (state.mode === 'episode') sideTitle.textContent = 'Más de esta serie';
    else sideTitle.textContent = 'Recomendados';

    const list = state.episodes;
    list.forEach((e, i) => {
      const div = document.createElement('div');
      div.className = 'upv-ep' + (i === state.index ? ' active' : '');
      const prog = Mem.getEpisodeProgress(e.id);
      const barPct = prog && prog.duration ? Math.min(100, prog.time / prog.duration * 100) : 0;
      div.innerHTML = `
        <div class="upv-ep-thumb" style="background-image:url('${e.thumbnail || e.thumbnail2 || ''}')">
          <div class="bar" style="width:${barPct}%"></div>
        </div>
        <div class="upv-ep-info">
          <h4>${e.title || 'Sin título'}</h4>
          <p>${e.description || ''}</p>
        </div>`;
      div.addEventListener('click', () => {
        state.index = i;
        loadCurrent({ resume: true });
        renderSide();
      });
      sideList.appendChild(div);
    });
  }

  /* ---------- floating recommendations -------------------------------- */
  let lastTouchY = 0, scrollAccum = 0;
  function showFloating() { floating.classList.add('show'); }
  function hideFloating() { floating.classList.remove('show'); }
  $('upv-floating-close').addEventListener('click', hideFloating);

  // wheel
  stage.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) < 4) return;
    if (e.deltaY < 0) { scrollAccum -= e.deltaY; if (scrollAccum > 30) showFloating(); }
    else { scrollAccum = 0; hideFloating(); }
  }, { passive: true });
  // touch
  stage.addEventListener('touchstart', e => { lastTouchY = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchmove',  e => {
    const dy = lastTouchY - e.touches[0].clientY;
    if (dy > 40) showFloating();
    else if (dy < -40) hideFloating();
  }, { passive: true });

  function renderFloating() {
    floatingGrid.innerHTML = '';
    const recs = state.recommendations || [];
    if (!recs.length) { hideFloating(); return; }
    recs.slice(0, 18).forEach(r => {
      const isSeries = !!r.seriesid && !r.mediaUrl;   // objeto serie
      const thumb = r.portada_serie || r.thumbnail || r.thumbnail2 || '';
      const title = r.titulo_serie || r.title || '';
      const desc  = r.descripcion_serie || r.description || '';
      const div = document.createElement('div');
      div.className = 'upv-rec';
      div.innerHTML = `
        <div class="upv-rec-thumb" style="background-image:url('${thumb}')"></div>
        <div class="upv-rec-info"><h4>${title}</h4><p>${desc}</p></div>`;
      div.addEventListener('click', () => {
        hideFloating();
        if (isSeries) Player.playSeries(r, { episodes: state.universalPool, recommendations: recs });
        else Player.playEpisode(r, { episodes: state.universalPool, recommendations: recs });
      });
      floatingGrid.appendChild(div);
    });
  }

  /* ---------- skip intro / recap / credits --------------------------- */
  function handleSkipMarkers() {
    const e = ep(); if (!e) return;
    skipWrap.innerHTML = '';
    const t = video.currentTime;
    if (e.skipIntro) {
      const a = parseT(e.skipIntro.start), b = parseT(e.skipIntro.end);
      if (t >= a && t < b) addSkip('Omitir intro', () => video.currentTime = b);
    }
    if (e.skipRecap) {
      const a = parseT(e.skipRecap.start), b = parseT(e.skipRecap.end);
      if (t >= a && t < b) addSkip('Omitir resumen', () => video.currentTime = b);
    }
  }
  function addSkip(label, fn) {
    const b = document.createElement('button');
    b.className = 'upv-skip-btn'; b.textContent = label;
    b.addEventListener('click', fn);
    skipWrap.appendChild(b);
  }

  /* ---------- next-up card ------------------------------------------- */
  let nextUpStart = 0, nextUpRaf = null;
  function handleNextUp() {
    const e = ep(); if (!e) return;
    const t = video.currentTime;
    let trigger = false, untilEnd = (state.duration || 0) - t;
    if (e.skipCredits) {
      const a = parseT(e.skipCredits.start);
      if (t >= a) trigger = true;
    } else if (state.duration && untilEnd > 0 && untilEnd < 25) {
      trigger = true;
    }
    if (trigger) showNextUp();
    else hideNextUp();
  }
  function showNextUp() {
    const next = pickNext();
    if (!next) return;
    if (nextUp.classList.contains('show')) return;
    $('upv-nu-thumb').style.backgroundImage = `url('${next.thumbnail || next.thumbnail2 || ''}')`;
    $('upv-nu-title').textContent = next.title || next.titulo_serie || '';
    nextUp.classList.add('show');
    nextUpStart = performance.now();
    cancelAnimationFrame(nextUpRaf);
    const tick = () => {
      const elapsed = (performance.now() - nextUpStart) / 1000;
      const pct = Math.min(100, (elapsed / 10) * 100);
      $('upv-nu-bar').style.width = pct + '%';
      if (pct >= 100) playNext();
      else if (nextUp.classList.contains('show')) nextUpRaf = requestAnimationFrame(tick);
    };
    nextUpRaf = requestAnimationFrame(tick);
  }
  function hideNextUp() {
    nextUp.classList.remove('show');
    cancelAnimationFrame(nextUpRaf);
    $('upv-nu-bar').style.width = '0%';
  }
  $('upv-nu-cancel').addEventListener('click', hideNextUp);
  $('upv-nu-play').addEventListener('click', () => { hideNextUp(); playNext(); });

  function pickNext() {
    if (state.index + 1 < state.episodes.length) return state.episodes[state.index + 1];
    // fin de la lista → algo del pool universal
    const pool = state.universalPool.filter(p => p.id !== ep().id);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  function playNext() {
    if (state.index + 1 < state.episodes.length) {
      state.index++; loadCurrent({ resume: false }); renderSide(); return;
    }
    // fin: si era serie → marcar exhausted, luego saltar a algo aleatorio
    if (state.mode === 'series' && state.seriesId) Mem.markSeriesExhausted(state.seriesId);
    const next = pickNext();
    if (!next) return;
    if (next.seriesid && state.universalPool.some(x => x.seriesid)) {
      // empezar como episodio suelto del pool
      Player.playEpisode(next, { episodes: state.universalPool, recommendations: state.recommendations });
    } else {
      Player.playEpisode(next, { episodes: state.universalPool, recommendations: state.recommendations });
    }
  }
  function onEnded() {
    const e = ep(); if (e) Mem.markEpisodeCompleted(e);
    playNext();
  }

  /* ---------- prev / next --------------------------------------------- */
  $('upv-prev').addEventListener('click', () => {
    if (state.index > 0) { state.index--; loadCurrent({ resume: true }); renderSide(); }
  });
  $('upv-next').addEventListener('click', () => playNext());
  $('upv-play').addEventListener('click', togglePlay);
  $('upv-playsm').addEventListener('click', togglePlay);

  /* ---------- fullscreen / pip --------------------------------------- */
  $('upv-fs-btn').addEventListener('click', toggleFs);
  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else root.requestFullscreen().catch(() => {});
  }
  document.addEventListener('fullscreenchange', () => {
    $('upv-fs-btn').innerHTML = document.fullscreenElement ? SVG.fullscreenExit : SVG.fullscreen;
  });
  $('upv-pip-btn').addEventListener('click', async () => {
    closeAllPops();
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
    } catch (e) { showError('PiP no disponible'); }
  });
  $('upv-hist-btn').addEventListener('click', () => {
    closeAllPops();
    showHistory();
  });

  function showHistory() {
    sideTitle.textContent = 'Historial';
    sideList.innerHTML = '';
    const hist = Mem.getHistory();
    if (!hist.length) {
      sideList.innerHTML = '<p style="padding:14px;color:rgba(255,255,255,.6);font-size:14px">Sin historial.</p>';
    } else {
      hist.forEach(h => {
        const div = document.createElement('div');
        div.className = 'upv-ep';
        div.innerHTML = `
          <div class="upv-ep-thumb" style="background-image:url('${h.thumbnail || ''}')"></div>
          <div class="upv-ep-info">
            <h4>${h.title}</h4>
            <p>${new Date(h.ts).toLocaleString()}</p>
          </div>`;
        div.addEventListener('click', () => {
          // buscar episodio en el pool
          const found = state.universalPool.find(x => x.id === h.episodeId);
          if (found) Player.playEpisode(found, { episodes: state.universalPool, recommendations: state.recommendations });
          else showError('Ya no está disponible.');
        });
        sideList.appendChild(div);
      });
    }
    openSide();
  }

  /* ---------- top bar / close ---------------------------------------- */
  $('upv-close').addEventListener('click', () => Player.close());
  // mousemove → mostrar controles
  stage.addEventListener('mousemove', showControls);
  stage.addEventListener('click', e => {
    // click sobre el video propiamente → toggle play
    if (e.target === video || e.target === stage) togglePlay();
  });

  /* ---------- teclado ------------------------------------------------- */
  document.addEventListener('keydown', e => {
    if (!root.classList.contains('open')) return;
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    switch (e.key) {
      case ' ': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft':  seek(-10, $('upv-back')); break;
      case 'ArrowRight': seek( 10, $('upv-fwd' )); break;
      case 'ArrowUp':    video.volume = Math.min(1, video.volume + .05); volSlider.value = video.volume; volSlider.dispatchEvent(new Event('input')); break;
      case 'ArrowDown':  video.volume = Math.max(0, video.volume - .05); volSlider.value = video.volume; volSlider.dispatchEvent(new Event('input')); break;
      case 'f': case 'F': toggleFs(); break;
      case 'p': case 'P': $('upv-pip-btn').click(); break;
      case 'm': case 'M': video.muted = !video.muted; break;
      case 'Escape': if (!document.fullscreenElement) Player.close(); break;
      case 'n': case 'N': playNext(); break;
    }
    showControls();
  });

  /* ---------- Media Session API -------------------------------------- */
  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const e = ep(); if (!e) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:  e.title || '',
        artist: e.proudccion || e.production || (state.mode === 'series' ? 'Serie' : 'Reproduciendo'),
        album:  e.seriesid || '',
        artwork: [
          { src: e.thumbnail || e.thumbnail2 || '', sizes: '512x512', type: 'image/webp' }
        ]
      });
      navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play',  () => video.play());
      navigator.mediaSession.setActionHandler('pause', () => video.pause());
      navigator.mediaSession.setActionHandler('seekbackward',  d => seek(-(d.seekOffset || 10), $('upv-back')));
      navigator.mediaSession.setActionHandler('seekforward',   d => seek( (d.seekOffset || 10), $('upv-fwd')));
      navigator.mediaSession.setActionHandler('previoustrack', () => $('upv-prev').click());
      navigator.mediaSession.setActionHandler('nexttrack',     () => playNext());
      navigator.mediaSession.setActionHandler('seekto', d => { if (d.fastSeek && 'fastSeek' in video) video.fastSeek(d.seekTime); else video.currentTime = d.seekTime; });
    } catch(_) {}
  }

  /* ---------- carga del current --------------------------------------- */
  function loadCurrent({ resume = true } = {}) {
    const e = ep(); if (!e) return;
    const src = e.mediaUrl || e.mediaUrl2 || e.trailer;
    if (!src) { showError('Sin fuente de video'); return; }

    // limpiar pistas previas
    while (video.firstChild) video.removeChild(video.firstChild);

    video.src = src;
    video.poster = e.thumbnail || e.thumbnail2 || '';
    titleEl.textContent = e.title || '';

    // subtítulos
    if (e.subtitlesUrl) {
      const tr = document.createElement('track');
      tr.kind = 'subtitles'; tr.src = e.subtitlesUrl; tr.default = true; tr.srclang = 'es';
      video.appendChild(tr);
    }

    // tiempo inicial
    let startAt = 0;
    if (resume) {
      const prog = Mem.getEpisodeProgress(e.id);
      if (prog && !prog.completed && prog.time > 5) startAt = prog.time;
    }
    state.initialStart = startAt;

    Mem.addToHistory(e);
    if (state.mode === 'series' && state.seriesId) Mem.saveSeriesState(state.seriesId, e.id, startAt);

    // theming opcional con bgColor
    if (e.bgColor) root.style.setProperty('--primary', e.bgColor);

    hideNextUp(); skipWrap.innerHTML = '';
    video.load();
    video.play().catch(() => {/* autoplay bloqueado, esperará gesto */});
  }

  /* ---------- API pública --------------------------------------------- */
  function open(mode, opts) {
    state.mode = mode;
    state.recommendations = (opts && opts.recommendations) || [];
    state.universalPool   = (opts && opts.episodes) || (opts && opts.recommendations) || [];
    root.classList.add('open');
    showControls();
    renderSide();
    renderFloating();
  }

  function handleErr(e) {
    console.warn('[Player] video error', e);
    // intentar fuente alternativa
    const cur = ep();
    if (cur && cur.mediaUrl2 && video.src !== cur.mediaUrl2) {
      video.src = cur.mediaUrl2; video.play().catch(()=>{});
      return;
    }
    showError('Error al reproducir el video.');
  }

  const Player = {
    /**
     * Reproduce un episodio puntual (modo "suelto" — como película).
     * Si el episodio pertenece a una serie, la ventana lateral muestra
     * los siguientes episodios de esa misma serie.
     */
    playEpisode(episode, { episodes = [], recommendations = [] } = {}) {
      if (!episode) return;
      let list;
      if (episode.seriesid) {
        // si es de una serie → lista lateral con esa serie ordenada por fecha
        const series = episodes
          .filter(x => x.seriesid === episode.seriesid)
          .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        const idx = series.findIndex(x => x.id === episode.id);
        if (idx >= 0) {
          // empezamos en ese índice, pero el resto queda detrás (anteriores no se autoplay-ean)
          list = series.slice(idx);
        } else list = [episode];
      } else {
        list = [episode];
      }
      state.episodes = list;
      state.index = 0;
      state.seriesId = null;          // ¡no es modo serie! reproducción suelta
      open('episode', { episodes, recommendations });
      loadCurrent({ resume: true });  // resume desde donde quedó este episodio si aplica
    },

    /**
     * Reproduce una serie completa: usa Memoria.decideForSeries para
     * determinar qué episodio toca y desde qué tiempo.
     */
    playSeries(series, { episodes = [], recommendations = [] } = {}) {
      if (!series || !series.seriesid) return;
      const list = episodes
        .filter(e => e.seriesid === series.seriesid)
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      if (!list.length) { showError('Esta serie no tiene episodios.'); return; }
      const decision = Mem.decideForSeries(series.seriesid, list);
      const startIdx = list.findIndex(e => e.id === decision.episode.id);
      state.episodes = list;
      state.index = startIdx >= 0 ? startIdx : 0;
      state.seriesId = series.seriesid;
      open('series', { episodes, recommendations });
      // si decisión fue "resume" usar startAt; si no, empezar desde 0
      if (decision.reason === 'resume') {
        state.initialStart = decision.startAt || 0;
        loadCurrent({ resume: false });   // ya pusimos startAt manualmente
        state.initialStart = decision.startAt || 0; // re-set por loadCurrent
      } else {
        // fresh / next / restart → desde 0, pero forzar guardar nuevo estado
        Mem.saveSeriesState(series.seriesid, decision.episode.id, 0);
        const e = ep();
        if (e) {
          // limpiar progreso previo solo del primer ep si es restart
          if (decision.reason === 'restart-after-exhausted') {
            const prev = Mem.getEpisodeProgress(e.id);
            if (prev) prev.time = 0;
          }
        }
        loadCurrent({ resume: false });
      }
    },

    /**
     * Reproduce una película (un único episodio sin seriesid).
     * Comportamiento: reanuda si quedó a medias, o desde 0 si ya estaba completada.
     */
    playMovie(movie, { recommendations = [] } = {}) {
      if (!movie) return;
      const prog = Mem.getEpisodeProgress(movie.id);
      state.episodes = [movie];
      state.index = 0;
      state.seriesId = null;
      open('movie', { episodes: recommendations, recommendations });
      // si está completada → empezar desde 0; si no → reanudar
      const resume = !(prog && prog.completed);
      loadCurrent({ resume });
    },

    close() {
      const e = ep();
      if (e) Mem.saveEpisodeProgress(e, video.currentTime, state.duration);
      try { video.pause(); } catch(_) {}
      if (document.pictureInPictureElement) document.exitPictureInPicture().catch(()=>{});
      if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
      root.classList.remove('open', 'side-open', 'controls-on');
      hideNextUp(); hideFloating();
      video.removeAttribute('src'); video.load();
    },

    /* utilidades */
    _state: state,
    _refreshSide: renderSide
  };

  global.Player = Player;
})(window);
