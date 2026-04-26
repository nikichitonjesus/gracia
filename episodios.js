/* ============================================================
 * episodios.js — Catálogo de SERIES y EPISODIOS
 *
 * Estructura de SERIE:
 *   { seriesid, portada_serie, titulo_serie, descripcion_serie, url_serie, bgColor }
 *
 * Estructura de EPISODIO (vale tanto para capítulo de serie como
 * para película/episodio individual; los campos son opcionales según el caso):
 *   {
 *     id, seriesid?, date, mediaUrl, mediaUrl2?, trailer?,
 *     thumbnail, thumbnail2?, title, description,
 *     season?, episode?, type, year, duration,
 *     utilidad?, allowDownload?, produccion?,
 *     skipIntro?:{start,end}, skipRecap?:{start,end}, skipCredits?:{start,end},
 *     detailUrl?, bgColor?, subtitlesUrl?, lang?, lang2?
 *   }
 *
 * Se exponen como variables globales que player.js consume:
 *   window.SERIES, window.EPISODES  ->  window.masEpisodios
 * ============================================================ */

window.SERIES = [
  {
    seriesid: 'jesucristo',
    portada_serie: 'https://balta.odoo.com/web/image/417-e2fd48e0/media.webp',
    titulo_serie: 'Jesucristo hombre',
    descripcion_serie: 'La historia más grande jamás contada, episodio a episodio.',
    url_serie: '/jesucristo-hombre',
    bgColor: '#1e40af',
  },
  {
    seriesid: 'navidad',
    portada_serie: 'https://i.pinimg.com/736x/4d/7a/3d/4d7a3d2716d81884f75813ddcc5a6b8c.jpg',
    titulo_serie: 'La historia de la Navidad',
    descripcion_serie: 'Serie navideña: el verdadero significado de la Navidad.',
    url_serie: '/historia-navidad',
    bgColor: '#7c2d12',
  },
];

window.EPISODES = [
  /* ---------- Episodio individual / película ---------- */
  {
    id: 'la-vida-de-jesucristo',
    date: '2025-11-28',
    mediaUrl: 'https://archive.org/download/la-vida-de-jesus-en-ixil-trailer/la%20vida%20de%20Jes%C3%BAs.mp4',
    mediaUrl2: 'https://archive.org/download/la-vida-de-jesus-en-espanol-trailer/la%20vida%20de%20Jes%C3%BAs.mp4',
    trailer: 'https://archive.org/download/la-vida-de-jesus-en-ixil-trailer/la%20vida%20de%20Jes%C3%BAs.mp4',
    thumbnail: 'https://nikichitonjesus1.odoo.com/web/image/465-4e045826/Min-jesus.webp',
    thumbnail2: 'https://video.nikichitonjesus.org/web/image/438-44d31586/6.webp',
    title: 'Jesucristo sobre la tierra',
    description: 'Esta es la historia más grande jamás contada.',
    type: 'Película',
    year: '2025',
    duration: 6000,
    utilidad: '18 años, gracia, amor, fe, vida, compasión, vida cristiana, acción, drama',
    allowDownload: false,
    produccion: 'Niki Chiton Jesus',
    seriesid: 'jesucristo-pelicula', // sin serie real -> single
    lang: 'Ixil',
    lang2: 'Español',
    skipIntro:   { start: '00:00', end: '00:30' },
    skipRecap:   { start: '01:20', end: '03:00' },
    skipCredits: { start: '50:00', end: '50:10' },
    detailUrl: '/la-vida-de-jesucristo',
    bgColor: '#46210a',
    subtitlesUrl: '',
  },

  /* ---------- Capítulos de la serie "navidad" ---------- */
  {
    id: 'navidad-001', seriesid: 'navidad',
    url: 'https://archive.org/download/la-historia-de-la-navidad-en-ixil/Navidad001.mp4',
    title: '¿Qué se celebra en la Navidad?',
    season: 'Temporada 2', episode: 'Episodio 1',
    type: 'Episodio', year: '2025',
    thumbnail: 'https://i.pinimg.com/736x/4d/7a/3d/4d7a3d2716d81884f75813ddcc5a6b8c.jpg',
    duration: 117,
    description: 'Explora el significado de la Navidad. Es una celebración celebrada en todo el mundo, pero poco entendida.',
    skipIntro:{start:'00:00',end:'00:00'}, skipRecap:{start:'00:00',end:'00:00'}, skipCredits:{start:'01:47',end:'01:57'},
  },
  {
    id: 'navidad-002', seriesid: 'navidad',
    url: 'https://archive.org/download/la-historia-de-la-navidad-en-ixil/Navidad002.mp4',
    title: 'La restauración futura',
    season: 'Temporada 2', episode: 'Episodio 2',
    type: 'Episodio', year: '2025',
    thumbnail: 'https://i.pinimg.com/474x/04/fe/f0/04fef0734a08f27da54b2e354a21ac17.jpg',
    duration: 138,
    description: 'El Mesías tenía que ser herido, pero el enemigo iba a ser derrotado.',
    skipCredits:{start:'02:08',end:'02:18'},
  },
  {
    id: 'navidad-003', seriesid: 'navidad',
    url: 'https://archive.org/download/la-historia-de-la-navidad-en-ixil/Navidad003.mp4',
    title: 'Nacerá de una virgen',
    season: 'Temporada 2', episode: 'Episodio 3',
    type: 'Episodio', year: '2025',
    thumbnail: 'https://i.pinimg.com/474x/3d/77/bc/3d77bc8fc217784fc5e451c961f5d01d.jpg',
    duration: 105,
    description: 'Dios dijo que el Mesías sería descendiente de la mujer. Más tarde, el profeta Isaías dijo que nacería de una virgen.',
    skipCredits:{start:'01:35',end:'01:45'},
  },
  {
    id: 'navidad-004', seriesid: 'navidad',
    url: 'https://archive.org/download/la-historia-de-la-navidad-en-ixil/Navidad004.mp4',
    title: 'Señales constantes',
    season: 'Temporada 2', episode: 'Episodio 4',
    type: 'Episodio', year: '2025',
    thumbnail: 'https://i.pinimg.com/474x/6b/ec/50/6bec509c229d208652d6dcbb56a37f3b.jpg',
    duration: 138,
    description: 'Dios dijo que vendría y lo representó de muchas formas en todo el Antiguo Testamento.',
    skipCredits:{start:'02:08',end:'02:18'},
  },
  {
    id: 'navidad-005', seriesid: 'navidad',
    url: 'https://archive.org/download/la-historia-de-la-navidad-en-ixil/Navidad005.mp4',
    title: 'El heraldo del mesías',
    season: 'Temporada 2', episode: 'Episodio 5',
    type: 'Episodio', year: '2025',
    thumbnail: 'https://i.pinimg.com/474x/66/7a/6b/667a6b86c60988292262aee6603d852b.jpg',
    duration: 115,
    description: 'Juan, hijo de Zacarías, fue el heraldo del Mesías. Profetizado por los profetas, su llamado se cumplió.',
    skipCredits:{start:'01:45',end:'01:55'},
  },
  {
    id: 'navidad-006', seriesid: 'navidad',
    url: 'https://archive.org/download/la-historia-de-la-navidad-en-ixil/Navidad006.mp4',
    title: 'Los padres de Jesús',
    season: 'Temporada 2', episode: 'Episodio 6',
    type: 'Episodio', year: '2025',
    thumbnail: 'https://i.pinimg.com/474x/6b/ec/50/6bec509c229d208652d6dcbb56a37f3b.jpg',
    duration: 150,
    description: 'María y José: el linaje, la fe y la obediencia frente a la promesa.',
    skipCredits:{start:'02:20',end:'02:30'},
  },
  {
    id: 'navidad-007', seriesid: 'navidad',
    url: 'https://archive.org/download/la-historia-de-la-navidad-en-ixil/Navidad007.mp4',
    title: 'El censo en Judea',
    season: 'Temporada 2', episode: 'Episodio 7',
    type: 'Episodio', year: '2025',
    thumbnail: 'https://i.pinimg.com/474x/8d/2c/41/8d2c417e332dd9c9eb199eb303d3fd9c.jpg',
    duration: 26,
    description: 'El censo en Judea ordenado por Augusto César.',
    skipCredits:{start:'00:16',end:'00:26'},
  },
  {
    id: 'navidad-008', seriesid: 'navidad',
    url: 'https://archive.org/download/la-historia-de-la-navidad-en-ixil/Navidad008.mp4',
    title: 'El acontecimiento más grande',
    season: 'Temporada 2', episode: 'Episodio 8',
    type: 'Episodio', year: '2025',
    thumbnail: 'https://i.pinimg.com/474x/0e/5b/65/0e5b6587ce16c3bfc116b890b1769233.jpg',
    duration: 92,
    description: 'El nacimiento del Mesías: la victoria silenciosa que cambió la historia.',
    skipCredits:{start:'01:13',end:'01:32'},
  },
  {
    id: 'navidad-redencion', seriesid: 'navidad',
    url: 'https://archive.org/download/la-historia-de-la-navidad-en-ixil/Redenci%C3%B3n.mp4',
    title: 'Episodio completo · Redención',
    season: 'Temporada 2', episode: 'Especial',
    type: 'Episodio', year: '2025',
    thumbnail: 'https://i.pinimg.com/736x/84/e5/16/84e5161f55c7ecbfb24f9122a69b5625.jpg',
    duration: 947,
    description: 'Compilación completa: el Mesías herido, el enemigo derrotado.',
    skipIntro:{start:'00:22',end:'01:57'}, skipCredits:{start:'15:37',end:'15:47'},
  },
];
