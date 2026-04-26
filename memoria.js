// memoria.js - Persistencia y gestión de historial
(function(window) {
    const STORAGE_KEY = 'reproductorUniversal';
    let datos = {
        historial: [],           // { id, tipo, titulo, timestamp, miniatura, completado, tiempo }
        progresoSeries: {},      // { seriesId: { ultimoEpisodioId, progresoPorEpisodio: { id: segundos }, completados: [] } }
        progresoIndividual: {}   // { videoId: segundos }
    };

    // Cargar datos guardados
    function cargar() {
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (guardado) {
            try {
                const parsed = JSON.parse(guardado);
                datos = { ...datos, ...parsed };
            } catch(e) {}
        }
    }
    cargar();

    function guardar() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
    }

    // Registrar visualización en historial
    function agregarHistorial(id, tipo, titulo, miniatura, completado = false, tiempo = 0) {
        const existente = datos.historial.findIndex(item => item.id === id);
        const nuevo = {
            id, tipo, titulo, miniatura,
            timestamp: new Date().toISOString(),
            completado, tiempo
        };
        if (existente >= 0) {
            datos.historial[existente] = nuevo;
        } else {
            datos.historial.unshift(nuevo);
        }
        // Mantener máximo 50 items
        if (datos.historial.length > 50) datos.historial.pop();
        guardar();
    }

    // --- Serie ---
    function obtenerProgresoSerie(seriesId) {
        if (!datos.progresoSeries[seriesId]) {
            datos.progresoSeries[seriesId] = {
                ultimoEpisodioId: null,
                progresoPorEpisodio: {},
                completados: []
            };
        }
        return datos.progresoSeries[seriesId];
    }

    function guardarProgresoEpisodio(seriesId, episodioId, segundos, duracion) {
        const serie = obtenerProgresoSerie(seriesId);
        serie.progresoPorEpisodio[episodioId] = segundos;
        // Si está completo (>95%)
        if (duracion && segundos >= duracion * 0.95) {
            if (!serie.completados.includes(episodioId)) {
                serie.completados.push(episodioId);
            }
        }
        serie.ultimoEpisodioId = episodioId;
        guardar();
    }

    function obtenerProgresoEpisodio(seriesId, episodioId) {
        const serie = obtenerProgresoSerie(seriesId);
        return serie.progresoPorEpisodio[episodioId] || 0;
    }

    function obtenerSiguienteEpisodio(seriesId, episodiosOrdenados) {
        const serie = obtenerProgresoSerie(seriesId);
        // Si ningún episodio completado, empezar por el primero
        if (serie.completados.length === 0) return episodiosOrdenados[0]?.id;

        // Buscar el primer no completado
        for (let ep of episodiosOrdenados) {
            if (!serie.completados.includes(ep.id)) {
                return ep.id;
            }
        }
        // Si todos completados, reiniciar? Mejor devolver null para iniciar desde el primero (pero se mostrará opción)
        return null; // serie completada
    }

    function marcarEpisodioCompletado(seriesId, episodioId) {
        const serie = obtenerProgresoSerie(seriesId);
        if (!serie.completados.includes(episodioId)) {
            serie.completados.push(episodioId);
        }
        guardar();
    }

    // --- Reproducción individual (película o episodio suelto) ---
    function obtenerProgresoIndividual(videoId) {
        return datos.progresoIndividual[videoId] || 0;
    }

    function guardarProgresoIndividual(videoId, segundos, duracion, titulo, miniatura) {
        datos.progresoIndividual[videoId] = segundos;
        const completado = duracion ? segundos >= duracion * 0.95 : false;
        agregarHistorial(videoId, 'individual', titulo, miniatura, completado, segundos);
        guardar();
    }

    // Obtener lista de recomendados (últimos 8 del historial)
    function obtenerRecomendados() {
        return datos.historial.slice(0, 8).map(item => ({
            id: item.id,
            titulo: item.titulo,
            miniatura: item.miniatura,
            tipo: item.tipo
        }));
    }

    // Exponer API global
    window.Memoria = {
        guardarProgresoEpisodio,
        obtenerProgresoEpisodio,
        obtenerSiguienteEpisodio,
        marcarEpisodioCompletado,
        obtenerProgresoIndividual,
        guardarProgresoIndividual,
        agregarHistorial,
        obtenerRecomendados,
        // Para depuración
        _getDatos: () => datos
    };
})(window);
