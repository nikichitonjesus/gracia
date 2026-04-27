/* =========================================================================
 *  memoria.js — Persistencia del Reproductor Universal (estilo Prime Video)
 *  -----------------------------------------------------------------------
 *  Guarda en localStorage:
 *    • Progreso por episodio (segundos vistos / completado)
 *    • Progreso por serie (último episodio + tiempo + si ya se agotó)
 *    • Historial cronológico de reproducciones
 *    • Última interacción global (para "Continuar viendo")
 *
 *  API expuesta como `window.Memoria`:
 *    Memoria.saveEpisodeProgress(episode, currentTime, duration)
 *    Memoria.getEpisodeProgress(episodeId)        -> {time, completed, ...}
 *    Memoria.markEpisodeCompleted(episode)
 *    Memoria.saveSeriesState(seriesId, episodeId, time)
 *    Memoria.getSeriesState(seriesId)             -> {episodeId, time, exhausted}
 *    Memoria.markSeriesExhausted(seriesId)
 *    Memoria.resetSeries(seriesId)
 *    Memoria.addToHistory(episode)
 *    Memoria.getHistory()                          -> []
 *    Memoria.clearHistory()
 *    Memoria.getLastWatched()                      -> {episodeId, ts} | null
 * ======================================================================= */
(function (global) {
  'use strict';

  const KEYS = {
    EPISODES: 'mem.episodes.v1',     // { [episodeId]: {time, duration, completed, lastSeen} }
    SERIES:   'mem.series.v1',       // { [seriesId]: {episodeId, time, exhausted, lastSeen} }
    HISTORY:  'mem.history.v1',      // [ {episodeId, seriesid, title, thumbnail, ts} ]
    LAST:     'mem.last.v1'          // {episodeId, seriesid, ts}
  };

  // Tiempo (en %) a partir del cual consideramos un episodio "visto"
  const COMPLETED_THRESHOLD = 0.95;

  /* ----------------- helpers ------------------------------------------ */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('[Memoria] read error', key, e);
      return fallback;
    }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.warn('[Memoria] write error', key, e); }
  }
  function now() { return new Date().toISOString(); }

  /* ----------------- EPISODIOS ---------------------------------------- */
  function saveEpisodeProgress(episode, currentTime, duration) {
    if (!episode || !episode.id) return;
    const all = read(KEYS.EPISODES, {});
    const completed = duration > 0 && currentTime / duration >= COMPLETED_THRESHOLD;
    all[episode.id] = {
      time: Math.max(0, currentTime || 0),
      duration: duration || 0,
      completed,
      lastSeen: now()
    };
    write(KEYS.EPISODES, all);

    // sincronizar con la serie si pertenece a una
    if (episode.seriesid) {
      saveSeriesState(episode.seriesid, episode.id, currentTime);
    }
    write(KEYS.LAST, { episodeId: episode.id, seriesid: episode.seriesid || null, ts: now() });
  }

  function getEpisodeProgress(episodeId) {
    const all = read(KEYS.EPISODES, {});
    return all[episodeId] || null;
  }

  function markEpisodeCompleted(episode) {
    if (!episode || !episode.id) return;
    const all = read(KEYS.EPISODES, {});
    const prev = all[episode.id] || {};
    all[episode.id] = { ...prev, completed: true, lastSeen: now() };
    write(KEYS.EPISODES, all);
  }

  /* ----------------- SERIES ------------------------------------------- */
  function saveSeriesState(seriesId, episodeId, time) {
    if (!seriesId) return;
    const all = read(KEYS.SERIES, {});
    const prev = all[seriesId] || {};
    all[seriesId] = {
      episodeId,
      time: Math.max(0, time || 0),
      exhausted: prev.exhausted || false,
      lastSeen: now()
    };
    write(KEYS.SERIES, all);
  }

  function getSeriesState(seriesId) {
    const all = read(KEYS.SERIES, {});
    return all[seriesId] || null;
  }

  function markSeriesExhausted(seriesId) {
    const all = read(KEYS.SERIES, {});
    const prev = all[seriesId] || {};
    all[seriesId] = { ...prev, exhausted: true, lastSeen: now() };
    write(KEYS.SERIES, all);
  }

  function resetSeries(seriesId) {
    const all = read(KEYS.SERIES, {});
    delete all[seriesId];
    write(KEYS.SERIES, all);
  }

  /* ----------------- HISTORIAL ---------------------------------------- */
  function addToHistory(episode) {
    if (!episode || !episode.id) return;
    const list = read(KEYS.HISTORY, []);
    // dedupe — mover al inicio si ya existe
    const filtered = list.filter(e => e.episodeId !== episode.id);
    filtered.unshift({
      episodeId: episode.id,
      seriesid: episode.seriesid || null,
      title: episode.title || '',
      thumbnail: episode.thumbnail || episode.thumbnail2 || '',
      ts: now()
    });
    write(KEYS.HISTORY, filtered.slice(0, 100));
  }

  function getHistory() { return read(KEYS.HISTORY, []); }
  function clearHistory() { write(KEYS.HISTORY, []); }

  function getLastWatched() { return read(KEYS.LAST, null); }

  /* ----------------- DECISIÓN: ¿qué episodio reproducir? --------------
   *  Modo "serie": pasamos seriesId y la lista de episodios de esa serie
   *                ordenada por fecha asc (antiguo → reciente).
   *                Devuelve {episode, startAt, reason}.
   * ------------------------------------------------------------------ */
  function decideForSeries(seriesId, seriesEpisodes) {
    if (!seriesEpisodes || !seriesEpisodes.length) return null;
    const sorted = [...seriesEpisodes].sort(
      (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
    );
    const state = getSeriesState(seriesId);

    // Sin estado previo → empieza el primero desde 0
    if (!state) {
      return { episode: sorted[0], startAt: 0, reason: 'fresh-start' };
    }

    // Serie agotada → reiniciar
    if (state.exhausted) {
      return { episode: sorted[0], startAt: 0, reason: 'restart-after-exhausted' };
    }

    const idx = sorted.findIndex(e => e.id === state.episodeId);
    if (idx === -1) {
      return { episode: sorted[0], startAt: 0, reason: 'last-episode-missing' };
    }

    const epProgress = getEpisodeProgress(state.episodeId);
    // Si el último episodio quedó marcado como completed → siguiente
    if (epProgress && epProgress.completed) {
      if (idx + 1 < sorted.length) {
        return { episode: sorted[idx + 1], startAt: 0, reason: 'next-after-completed' };
      }
      // era el último → marcar agotada y reiniciar
      markSeriesExhausted(seriesId);
      return { episode: sorted[0], startAt: 0, reason: 'restart-after-exhausted' };
    }

    // Reanudar exactamente donde quedó
    return {
      episode: sorted[idx],
      startAt: state.time || (epProgress ? epProgress.time : 0) || 0,
      reason: 'resume'
    };
  }

  /* ----------------- export ------------------------------------------- */
  global.Memoria = {
    KEYS,
    saveEpisodeProgress, getEpisodeProgress, markEpisodeCompleted,
    saveSeriesState, getSeriesState, markSeriesExhausted, resetSeries,
    addToHistory, getHistory, clearHistory, getLastWatched,
    decideForSeries
  };
})(window);
