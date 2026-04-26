// player.js - Reproductor profesional estilo Prime Video
(function() {
    // Elementos del DOM (se crearán dinámicamente, pero se inyectan al final)
    let player, video, controls, centerControls, playPauseBtn, seekBackBtn, seekForwardBtn,
        timeDisplay, progressBar, progress, progressHandle, progressTimeTooltip,
        volumeBtn, volumeSlider, volumePopup, volumeIndicator,
        speedBtn, speedSlider, speedPopup, speedIndicator,
        fullscreenBtn, closeBtn, episodesBtn, nextEpisodeBtn, prevEpisodeBtn,
        skipIntroBtn, skipRecapBtn, creditsContainer, nextEpisodePreview, cancelCreditsBtn,
        videoInfo, infoTitle, infoDescription, replayBtn, resumeBtn, nextEpisodeInfoBtn,
        episodeList, listContent, closeListBtn,
        recommendationsContainer, closeRecoBtn,
        timeIndicator, backdrop, errorMessage, loadingIndicator, loadingPercentage, loadingThumbnail,
        settingsBtn, settingsPopup, historyPlaylistBtn,
        initialSkipIndicator;

    let isPlaying = false;
    let controlsTimeout = null;
    let isDragging = false;
    let currentSpeed = 1;
    let currentVolume = 1;
    let episodeData = null;        // { tipo: 'serie', seriesId, episodios: [], indiceActual, etc }
    let currentMode = null;        // 'serie' o 'single'
    let currentSeriesId = null;
    let currentEpisodeId = null;
    let currentVideoUrl = null;
    let skipTimers = { intro: null, recap: null };
    let seekAccumulator = 0;
    let seekTimeout = null;
    let isMobile = false;
    let videoDuration = 0;

    // Inicialización
    function init() {
        crearEstructuraHTML();
        bindEvents();
        actualizarResponsive();
        window.addEventListener('resize', actualizarResponsive);
        // Exponer funciones globales
        window.playSerie = playSerie;
        window.playSingle = playSingle;
        window.cerrarPlayer = cerrarPlayer;
    }

    function crearEstructuraHTML() {
        // Crear contenedor principal si no existe
        if (document.getElementById('universal-video-player')) return;
        const div = document.createElement('div');
        div.id = 'universal-video-player';
        div.style.display = 'none';
        div.innerHTML = `
            <div class="backdrop"></div>
            <div id="video-title-container"><div id="video-title"></div></div>
            <button id="close-btn" class="control-btn" aria-label="Cerrar"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            <video id="player-video" poster=""></video>
            <div id="center-controls">
                <button id="seek-back-btn" class="center-btn"><img src="https://www.nikichitonjesus.com/web/image/438-deea748f/-10.webp" alt="-10"></button>
                <button id="play-pause-btn" class="center-btn play-pause"><img src="https://nikichitonjesus.odoo.com/web/image/715-d5d403f0/playvid.png" alt="Play"></button>
                <button id="seek-forward-btn" class="center-btn"><img src="https://www.nikichitonjesus.com/web/image/439-9448d521/%2B10.webp" alt="+10"></button>
            </div>
            <div id="video-controls">
                <div id="progress-bar"><div id="progress"><div id="progress-handle"></div><div id="progress-time-tooltip"></div></div></div>
                <div id="bottom-controls">
                    <div id="nav-controls">
                        <button id="prev-episode-btn" class="control-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"><polygon points="19 20 9 12 19 4 19 20"/><rect x="5" y="4" width="2" height="16"/></svg></button>
                        <button id="next-episode-btn" class="control-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="4" width="2" height="16"/></svg></button>
                        <span id="time-display">0:00 / 0:00</span>
                    </div>
                    <div id="right-controls">
                        <div class="slider-container">
                            <button id="speed-btn" class="control-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
                            <div class="slider-popup" id="speed-popup"><input type="range" id="speed-slider" min="0.25" max="2" step="0.25" value="1"><span id="speed-indicator">Normal</span></div>
                        </div>
                        <div class="slider-container">
                            <button id="volume-btn" class="control-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16.5 9.5c.97 1 .97 2 0 3"/></svg></button>
                            <div class="slider-popup" id="volume-popup"><input type="range" id="volume-slider" min="0" max="1" step="0.05" value="1"><span id="volume-indicator">100%</span></div>
                        </div>
                        <button id="episodes-btn" class="control-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg></button>
                        <div class="slider-container">
                            <button id="settings-btn" class="control-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.04.04A10 10 0 0 0 12 17.66a10 10 0 0 0 6.36-2.62z"/></svg></button>
                            <div class="settings-popup" id="settings-popup"><button id="history-playlist-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white"><path d="M3 12h2l3-9 3 18 3-9h2"/></svg> Historial</button><button id="pip-settings-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M15 12h5v5h-5z"/></svg> PiP</button></div>
                        </div>
                        <button id="fullscreen-btn" class="control-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg></button>
                    </div>
                </div>
            </div>
            <div id="time-indicator"></div>
            <div class="skip-buttons-container">
                <button id="skip-intro-btn" class="skip-button" style="display:none">Omitir Intro</button>
                <button id="skip-recap-btn" class="skip-button" style="display:none">Omitir Resumen</button>
            </div>
            <div class="credits-buttons-container" style="display:none">
                <button id="cancel-skip-credits" class="skip-button">Cancelar</button>
                <div id="next-episode-preview" class="next-episode-preview"><div class="play-button"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div><div class="progress-circle"></div></div>
            </div>
            <div id="video-info"><div id="video-info-content"><h1 id="info-title"></h1><p id="info-description"></p><button id="replay-btn">Ver desde inicio</button><button id="resume-btn">Continuar viendo</button><button id="next-episode-info-btn">Siguiente episodio</button></div><button id="hide-video-info-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cerrar</button></div>
            <div id="episode-list" class="side-panel"><h3>Episodios</h3><button id="close-list-btn" class="close-panel"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button><div id="list-content"></div></div>
            <div id="recommendations-panel" class="recommendations"><div class="reco-header"><span>Quizás te interese</span><button id="close-recommendations"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div id="recommendations-grid" class="reco-grid"></div></div>
            <div id="loading-indicator"><div class="spinner"></div><div class="percentage" id="loading-percentage">0%</div><div class="thumbnail" id="loading-thumbnail"></div></div>
            <div id="error-message"></div>
        `;
        document.body.appendChild(div);
        // Asignar referencias
        player = div;
        video = player.querySelector('#player-video');
        controls = player.querySelector('#video-controls');
        centerControls = player.querySelector('#center-controls');
        playPauseBtn = player.querySelector('#play-pause-btn');
        seekBackBtn = player.querySelector('#seek-back-btn');
        seekForwardBtn = player.querySelector('#seek-forward-btn');
        timeDisplay = player.querySelector('#time-display');
        progressBar = player.querySelector('#progress-bar');
        progress = player.querySelector('#progress');
        progressHandle = player.querySelector('#progress-handle');
        progressTimeTooltip = player.querySelector('#progress-time-tooltip');
        volumeBtn = player.querySelector('#volume-btn');
        volumeSlider = player.querySelector('#volume-slider');
        volumePopup = player.querySelector('#volume-popup');
        volumeIndicator = player.querySelector('#volume-indicator');
        speedBtn = player.querySelector('#speed-btn');
        speedSlider = player.querySelector('#speed-slider');
        speedPopup = player.querySelector('#speed-popup');
        speedIndicator = player.querySelector('#speed-indicator');
        fullscreenBtn = player.querySelector('#fullscreen-btn');
        closeBtn = player.querySelector('#close-btn');
        episodesBtn = player.querySelector('#episodes-btn');
        nextEpisodeBtn = player.querySelector('#next-episode-btn');
        prevEpisodeBtn = player.querySelector('#prev-episode-btn');
        skipIntroBtn = player.querySelector('#skip-intro-btn');
        skipRecapBtn = player.querySelector('#skip-recap-btn');
        creditsContainer = player.querySelector('.credits-buttons-container');
        nextEpisodePreview = player.querySelector('#next-episode-preview');
        cancelCreditsBtn = player.querySelector('#cancel-skip-credits');
        videoInfo = player.querySelector('#video-info');
        infoTitle = player.querySelector('#info-title');
        infoDescription = player.querySelector('#info-description');
        replayBtn = player.querySelector('#replay-btn');
        resumeBtn = player.querySelector('#resume-btn');
        nextEpisodeInfoBtn = player.querySelector('#next-episode-info-btn');
        episodeList = player.querySelector('#episode-list');
        listContent = player.querySelector('#list-content');
        closeListBtn = player.querySelector('#close-list-btn');
        recommendationsContainer = player.querySelector('#recommendations-panel');
        closeRecoBtn = player.querySelector('#close-recommendations');
        timeIndicator = player.querySelector('#time-indicator');
        backdrop = player.querySelector('.backdrop');
        errorMessage = player.querySelector('#error-message');
        loadingIndicator = player.querySelector('#loading-indicator');
        loadingPercentage = player.querySelector('#loading-percentage');
        loadingThumbnail = player.querySelector('#loading-thumbnail');
        settingsBtn = player.querySelector('#settings-btn');
        settingsPopup = player.querySelector('#settings-popup');
        historyPlaylistBtn = player.querySelector('#history-playlist-btn');
        initialSkipIndicator = player.querySelector('.skip-buttons-container'); // reutilizamos contenedor
    }

    function bindEvents() {
        video.addEventListener('click', () => togglePlay());
        video.addEventListener('dblclick', toggleFullscreen);
        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('ended', handleVideoEnd);
        video.addEventListener('waiting', showLoading);
        video.addEventListener('playing', hideLoading);
        video.addEventListener('progress', updateLoading);
        video.addEventListener('pause', () => guardarProgresoActual());
        playPauseBtn.addEventListener('click', togglePlay);
        seekBackBtn.addEventListener('click', () => seek(-10));
        seekForwardBtn.addEventListener('click', () => seek(10));
        prevEpisodeBtn.addEventListener('click', anteriorEpisodio);
        nextEpisodeBtn.addEventListener('click', siguienteEpisodio);
        closeBtn.addEventListener('click', cerrarPlayer);
        episodesBtn.addEventListener('click', toggleEpisodeList);
        closeListBtn.addEventListener('click', toggleEpisodeList);
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        volumeBtn.addEventListener('click', () => togglePopup(volumePopup));
        speedBtn.addEventListener('click', () => togglePopup(speedPopup));
        settingsBtn.addEventListener('click', () => togglePopup(settingsPopup));
        volumeSlider.addEventListener('input', (e) => { video.volume = e.target.value; volumeIndicator.innerText = Math.round(e.target.value*100)+'%'; });
        speedSlider.addEventListener('input', (e) => { video.playbackRate = e.target.value; speedIndicator.innerText = e.target.value+'x'; });
        historyPlaylistBtn.addEventListener('click', () => { alert("Historial: abre panel lateral con historial (pendiente de implementación)"); });
        player.querySelector('#pip-settings-btn').addEventListener('click', togglePictureInPicture);
        progressBar.addEventListener('mousedown', startSeek);
        progressBar.addEventListener('mousemove', showTooltip);
        progressBar.addEventListener('mouseleave', hideTooltip);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        progressHandle.addEventListener('mousedown', startDragHandle);
        skipIntroBtn.addEventListener('click', () => saltarSeccion('skipIntro'));
        skipRecapBtn.addEventListener('click', () => saltarSeccion('skipRecap'));
        cancelCreditsBtn.addEventListener('click', cancelSkipCredits);
        nextEpisodePreview.addEventListener('click', () => { siguienteEpisodio(); creditsContainer.style.display='none'; });
        replayBtn.addEventListener('click', () => reiniciarEpisodio());
        resumeBtn.addEventListener('click', () => reanudarEpisodio());
        nextEpisodeInfoBtn.addEventListener('click', () => { siguienteEpisodio(); ocultarInfo(); });
        backdrop.addEventListener('click', () => { if(videoInfo.style.display === 'flex') ocultarInfo(); else togglePlay(); });
        closeRecoBtn.addEventListener('click', cerrarRecomendaciones);
        // Scroll para recomendaciones flotantes
        player.addEventListener('wheel', manejarScrollRecomendaciones);
        // Teclado
        document.addEventListener('keydown', (e) => {
            if(player.style.display !== 'block') return;
            if(e.key === ' ' || e.key === 'Space') { e.preventDefault(); togglePlay(); }
            if(e.key === 'ArrowLeft') { e.preventDefault(); seek(-10); }
            if(e.key === 'ArrowRight') { e.preventDefault(); seek(10); }
            if(e.key === 'Escape') cerrarPlayer();
            if(e.key === 'f') toggleFullscreen();
            if(e.key === 'p') togglePictureInPicture();
        });
        // Mostrar controles al mover mouse
        player.addEventListener('mousemove', mostrarControles);
        player.addEventListener('mouseleave', () => { if(isPlaying) ocultarControles(); });
        // Touch para móvil
        video.addEventListener('touchstart', manejarToque);
    }

    // Funciones auxiliares
    function togglePopup(popup) {
        document.querySelectorAll('.slider-popup, .settings-popup').forEach(p => p.classList.remove('show'));
        popup.classList.toggle('show');
    }

    function mostrarControles() {
        player.classList.add('controls-visible');
        controls.style.opacity = '1';
        centerControls.style.opacity = '1';
        player.querySelector('#video-title-container').style.opacity = '1';
        closeBtn.style.opacity = '1';
        clearTimeout(controlsTimeout);
        if(isPlaying) controlsTimeout = setTimeout(ocultarControles, 2500);
    }
    function ocultarControles() {
        if(!player.classList.contains('controls-visible')) return;
        player.classList.remove('controls-visible');
        controls.style.opacity = '0';
        centerControls.style.opacity = '0';
        player.querySelector('#video-title-container').style.opacity = '0';
        closeBtn.style.opacity = '0';
    }

    function togglePlay() {
        if(video.paused) {
            video.play();
            playPauseBtn.querySelector('img').src = 'https://nikichitonjesus.odoo.com/web/image/716-c7a68f34/pausevid.png';
            isPlaying = true;
            ocultarInfo();
        } else {
            video.pause();
            playPauseBtn.querySelector('img').src = 'https://nikichitonjesus.odoo.com/web/image/715-d5d403f0/playvid.png';
            isPlaying = false;
            mostrarInfoTrasPausa();
        }
        mostrarControles();
    }

    function seek(segundos) {
        let nuevaPos = video.currentTime + segundos;
        if(nuevaPos < 0) nuevaPos = 0;
        if(nuevaPos > video.duration) nuevaPos = video.duration;
        video.currentTime = nuevaPos;
        // Acumulación para indicador
        seekAccumulator += segundos;
        if(seekTimeout) clearTimeout(seekTimeout);
        mostrarIndicadorSeek(seekAccumulator);
        seekTimeout = setTimeout(() => { seekAccumulator = 0; }, 800);
        mostrarControles();
    }

    function mostrarIndicadorSeek(acumulado) {
        const signo = acumulado > 0 ? '+' : '';
        timeIndicator.innerHTML = `${signo}${acumulado}s`;
        timeIndicator.style.display = 'block';
        timeIndicator.style.left = '50%';
        timeIndicator.style.top = '50%';
        timeIndicator.style.transform = 'translate(-50%, -50%)';
        setTimeout(() => { timeIndicator.style.display = 'none'; }, 600);
    }

    function updateProgress() {
        if(!video.duration) return;
        const percent = (video.currentTime / video.duration) * 100;
        progress.style.width = percent + '%';
        const current = formatTime(video.currentTime);
        const total = formatTime(video.duration);
        timeDisplay.innerText = `${current} / ${total}`;
        videoDuration = video.duration;
        // Mostrar skip si aplica
        if(episodeData && episodeData.tipo === 'serie' && episodeData.episodios[episodeData.indiceActual]) {
            const ep = episodeData.episodios[episodeData.indiceActual];
            if(ep.skipIntro && video.currentTime >= parseTime(ep.skipIntro.start) && video.currentTime <= parseTime(ep.skipIntro.end)) {
                skipIntroBtn.style.display = 'block';
            } else skipIntroBtn.style.display = 'none';
            if(ep.skipRecap && video.currentTime >= parseTime(ep.skipRecap.start) && video.currentTime <= parseTime(ep.skipRecap.end)) {
                skipRecapBtn.style.display = 'block';
            } else skipRecapBtn.style.display = 'none';
            if(ep.skipCredits && video.currentTime >= parseTime(ep.skipCredits.start) && video.currentTime <= parseTime(ep.skipCredits.end)) {
                creditsContainer.style.display = 'flex';
                iniciarCuentaRegresivaCredits();
            } else {
                creditsContainer.style.display = 'none';
                if(window.creditsTimeout) clearTimeout(window.creditsTimeout);
            }
        }
    }

    function saltarSeccion(tipo) {
        if(episodeData && episodeData.tipo === 'serie') {
            const ep = episodeData.episodios[episodeData.indiceActual];
            const end = parseTime(ep[tipo].end);
            video.currentTime = end;
            skipIntroBtn.style.display = 'none';
            skipRecapBtn.style.display = 'none';
        }
    }

    function iniciarCuentaRegresivaCredits() {
        if(window.creditsTimeout) clearTimeout(window.creditsTimeout);
        window.creditsTimeout = setTimeout(() => {
            siguienteEpisodio();
            creditsContainer.style.display = 'none';
        }, 10000);
        // animación circular
        const circle = nextEpisodePreview.querySelector('.progress-circle');
        circle.style.animation = 'none';
        circle.offsetHeight;
        circle.style.animation = 'progressCircle 10s linear forwards';
    }
    function cancelSkipCredits() {
        if(window.creditsTimeout) clearTimeout(window.creditsTimeout);
        creditsContainer.style.display = 'none';
    }

    function anteriorEpisodio() {
        if(!episodeData || episodeData.tipo !== 'serie') return;
        let nuevoIdx = episodeData.indiceActual - 1;
        if(nuevoIdx < 0) nuevoIdx = 0;
        cargarEpisodio(nuevoIdx);
    }
    function siguienteEpisodio() {
        if(!episodeData || episodeData.tipo !== 'serie') {
            // Modo single: buscar aleatorio
            buscarAleatorio();
            return;
        }
        let nuevoIdx = episodeData.indiceActual + 1;
        if(nuevoIdx >= episodeData.episodios.length) {
            // serie terminada, buscar aleatorio
            buscarAleatorio();
        } else {
            cargarEpisodio(nuevoIdx);
        }
    }

    async function buscarAleatorio() {
        // Por simplicidad, muestra mensaje o carga una serie de ejemplo
        alert("No hay más episodios. Implementar búsqueda aleatoria según tu catálogo.");
        cerrarPlayer();
    }

    function cargarEpisodio(indice) {
        if(!episodeData || episodeData.tipo !== 'serie') return;
        const ep = episodeData.episodios[indice];
        episodeData.indiceActual = indice;
        const progreso = Memoria.obtenerProgresoEpisodio(episodeData.seriesId, ep.id);
        video.src = ep.mediaUrl;
        video.poster = ep.thumbnail;
        document.getElementById('video-title').innerText = ep.title;
        video.currentTime = progreso;
        video.play();
        isPlaying = true;
        playPauseBtn.querySelector('img').src = 'https://nikichitonjesus.odoo.com/web/image/716-c7a68f34/pausevid.png';
        actualizarListaLateral();
        ocultarInfo();
        guardarProgresoActual();
        mostrarControles();
    }

    function actualizarListaLateral() {
        if(!episodeData || episodeData.tipo !== 'serie') return;
        listContent.innerHTML = '';
        episodeData.episodios.forEach((ep, idx) => {
            const item = document.createElement('div');
            item.className = `episode-item ${idx === episodeData.indiceActual ? 'active' : ''}`;
            item.innerHTML = `<div class="episode-thumbnail" style="background-image:url('${ep.thumbnail}')"></div><div><strong>${ep.title}</strong><br>${ep.date || ''}</div>`;
            item.addEventListener('click', () => {
                cargarEpisodio(idx);
                toggleEpisodeList();
            });
            listContent.appendChild(item);
        });
    }

    function toggleEpisodeList() {
        episodeList.classList.toggle('show');
        if(episodeList.classList.contains('show')) {
            player.style.setProperty('--panel-width', '320px');
            video.style.width = 'calc(100% - 320px)';
            video.style.transition = 'width 0.3s';
        } else {
            video.style.width = '100%';
        }
    }

    function guardarProgresoActual() {
        if(!video.duration) return;
        if(episodeData && episodeData.tipo === 'serie') {
            const ep = episodeData.episodios[episodeData.indiceActual];
            Memoria.guardarProgresoEpisodio(episodeData.seriesId, ep.id, video.currentTime, video.duration);
            if(video.currentTime >= video.duration * 0.95) {
                Memoria.marcarEpisodioCompletado(episodeData.seriesId, ep.id);
            }
        } else if(currentMode === 'single') {
            Memoria.guardarProgresoIndividual(currentEpisodeId, video.currentTime, video.duration, document.getElementById('video-title').innerText, '');
        }
    }

    function handleVideoEnd() {
        guardarProgresoActual();
        if(episodeData && episodeData.tipo === 'serie') {
            const proximo = episodeData.indiceActual + 1;
            if(proximo < episodeData.episodios.length) {
                cargarEpisodio(proximo);
            } else {
                mostrarInfoFinSerie();
            }
        } else {
            mostrarInfoFinIndividual();
        }
    }

    function mostrarInfoFinSerie() { mostrarInfo('¡Serie completada!', 'Has visto todos los episodios. ¿Buscas más contenido?'); }
    function mostrarInfoFinIndividual() { mostrarInfo('Finalizado', 'Reproducción terminada. Puedes ver otro contenido.'); }
    function mostrarInfo(titulo, desc) { infoTitle.innerText = titulo; infoDescription.innerText = desc; videoInfo.style.display = 'flex'; }

    function ocultarInfo() { videoInfo.style.display = 'none'; }
    function mostrarInfoTrasPausa() { setTimeout(() => { if(!isPlaying && videoInfo.style.display !== 'flex') videoInfo.style.display = 'flex'; }, 6000); }

    function reiniciarEpisodio() { video.currentTime = 0; video.play(); ocultarInfo(); }
    function reanudarEpisodio() { video.play(); ocultarInfo(); }

    function toggleFullscreen() {
        if(document.fullscreenElement) document.exitFullscreen();
        else player.requestFullscreen();
    }
    function togglePictureInPicture() {
        if(document.pictureInPictureElement) document.exitPictureInPicture();
        else video.requestPictureInPicture();
    }

    // Scroll para recomendaciones flotantes (aparecen al scroll up, desaparecen scroll down)
    let lastScrollY = 0;
    function manejarScrollRecomendaciones(e) {
        const delta = e.deltaY;
        if(delta < 0) { // scroll up
            recommendationsContainer.classList.add('show');
            cargarRecomendaciones();
        } else if(delta > 0) {
            recommendationsContainer.classList.remove('show');
        }
        lastScrollY = delta;
    }
    function cargarRecomendaciones() {
        const recoGrid = player.querySelector('#recommendations-grid');
        const recos = Memoria.obtenerRecomendados();
        recoGrid.innerHTML = '';
        recos.forEach(item => {
            const card = document.createElement('div');
            card.className = 'reco-card';
            card.innerHTML = `<img src="${item.miniatura}" alt=""><span>${item.titulo}</span>`;
            card.onclick = () => { alert(`Reproducir ${item.titulo} (implementar)`); };
            recoGrid.appendChild(card);
        });
    }
    function cerrarRecomendaciones() { recommendationsContainer.classList.remove('show'); }

    // Funciones de barra de progreso
    let dragging = false;
    function startSeek(e) { dragging = true; seekFromEvent(e); }
    function startDragHandle(e) { dragging = true; e.stopPropagation(); }
    function onDrag(e) { if(dragging) seekFromEvent(e); }
    function stopDrag() { dragging = false; }
    function seekFromEvent(e) {
        const rect = progressBar.getBoundingClientRect();
        let clientX = e.clientX;
        if(e.touches) clientX = e.touches[0].clientX;
        let x = clientX - rect.left;
        x = Math.min(rect.width, Math.max(0, x));
        const percent = x / rect.width;
        if(video.duration) video.currentTime = percent * video.duration;
        mostrarControles();
    }
    function showTooltip(e) {
        if(dragging) return;
        const rect = progressBar.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.min(rect.width, Math.max(0, x));
        const percent = x / rect.width;
        const time = percent * video.duration;
        progressTimeTooltip.innerText = formatTime(time);
        progressTimeTooltip.style.left = x + 'px';
        progressTimeTooltip.style.display = 'block';
    }
    function hideTooltip() { progressTimeTooltip.style.display = 'none'; }

    function formatTime(sec) {
        if(isNaN(sec)) return '0:00';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        if(h > 0) return `${h}:${m<10?'0'+m:m}:${s<10?'0'+s:s}`;
        return `${m}:${s<10?'0'+s:s}`;
    }
    function parseTime(str) {
        let parts = str.split(':').map(Number);
        if(parts.length === 2) return parts[0]*60 + parts[1];
        if(parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        return 0;
    }
    function showLoading() { loadingIndicator.style.display = 'block'; loadingThumbnail.style.backgroundImage = `url(${video.poster})`; }
    function hideLoading() { loadingIndicator.style.display = 'none'; }
    function updateLoading() { if(video.buffered.length) { let pct = (video.buffered.end(0)/video.duration)*100; loadingPercentage.innerText = Math.round(pct)+'%'; } }
    function cerrarPlayer() {
        if(document.fullscreenElement) document.exitFullscreen();
        guardarProgresoActual();
        video.pause();
        player.style.display = 'none';
        video.src = '';
        isPlaying = false;
    }
    function actualizarResponsive() { isMobile = window.innerWidth <= 768; }

    // --- API pública ---
    function playSerie(seriesId, episodiosArray) {
        if(!episodiosArray.length) return;
        // Ordenar por fecha (más antiguo primero)
        episodiosArray.sort((a,b) => new Date(a.date) - new Date(b.date));
        episodeData = {
            tipo: 'serie',
            seriesId,
            episodios: episodiosArray,
            indiceActual: 0
        };
        currentMode = 'serie';
        currentSeriesId = seriesId;
        // Buscar siguiente episodio no completado
        const idsOrdenados = episodiosArray.map(ep => ep.id);
        const siguienteId = Memoria.obtenerSiguienteEpisodio(seriesId, idsOrdenados);
        if(siguienteId) {
            const idx = episodiosArray.findIndex(ep => ep.id === siguienteId);
            if(idx !== -1) episodeData.indiceActual = idx;
        } else {
            // serie completada, empezar desde primero pero mostrar info
            episodeData.indiceActual = 0;
            mostrarInfo('Serie completada', '¿Quieres volver a verla desde el inicio?');
        }
        const ep = episodiosArray[episodeData.indiceActual];
        currentEpisodeId = ep.id;
        video.src = ep.mediaUrl;
        video.poster = ep.thumbnail;
        document.getElementById('video-title').innerText = ep.title;
        const progreso = Memoria.obtenerProgresoEpisodio(seriesId, ep.id);
        video.currentTime = progreso;
        player.style.display = 'block';
        video.play().catch(e => { errorMessage.innerText = 'Error al reproducir'; errorMessage.style.display='block'; setTimeout(()=>errorMessage.style.display='none',3000); });
        isPlaying = true;
        playPauseBtn.querySelector('img').src = 'https://nikichitonjesus.odoo.com/web/image/716-c7a68f34/pausevid.png';
        actualizarListaLateral();
        if(video.currentTime > 0 && !(video.currentTime >= video.duration*0.95)) ocultarInfo(); else if(video.currentTime===0) ocultarInfo();
        mostrarControles();
        // Cerrar panel lateral si estaba abierto
        episodeList.classList.remove('show');
        video.style.width = '100%';
    }

    function playSingle(episodio) {
        episodeData = null;
        currentMode = 'single';
        currentEpisodeId = episodio.id;
        video.src = episodio.mediaUrl;
        video.poster = episodio.thumbnail;
        document.getElementById('video-title').innerText = episodio.title;
        const progreso = Memoria.obtenerProgresoIndividual(episodio.id);
        video.currentTime = progreso;
        player.style.display = 'block';
        video.play();
        isPlaying = true;
        playPauseBtn.querySelector('img').src = 'https://nikichitonjesus.odoo.com/web/image/716-c7a68f34/pausevid.png';
        ocultarInfo();
        mostrarControles();
        // Limpiar panel lateral
        listContent.innerHTML = '<p>Sin episodios adicionales</p>';
    }

    window.playSerie = playSerie;
    window.playSingle = playSingle;
    window.cerrarPlayer = cerrarPlayer;

    init();
})();
