/*
 * Figures du Markov Bootcamp, reprises de assets/js/widgets-matiere.js du Labo (le chronomètre est déjà
 * dans widgets-graphes.js). Le graphe d'une chaîne s'appelle ici « chaine » pour ne pas écraser le
 * widget « graphe » du Labo Graphes :
 *   [[widget:chaine|n=machine]]      graphe d'une chaîne (machine, ascenseurs, deux-etats, tampon,
 *                                    gsi-exemple, naissance-mort, mm1, mm11, mminf, mm1k)
 *   [[widget:markov|modele=...]]     évolution pas à pas de π(t) (machine, ascenseurs, deux-etats) ;
 *                                    valeurs de départ réglables : modele=deux-etats;a=0.4;b=0.2
 *   [[widget:mm1|lambda=6;mu=10]]    file M/M/1 avec curseurs λ et μ (par heure)
 */
(function () {
  'use strict';

  var I = window.ICONS;
  var O = window.Widgets.outils;

  /* ------------------------------------------------------ Outils communs Markov */

  var COULEURS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c6)', 'var(--c7)'];

  function tex(t) { return window.Rendu.math(t, false); }

  /* Résout π (P - I) = 0 avec Σ π = 1 (Gauss avec pivot partiel). Renvoie null si le système est singulier. */
  function stationnaire(P) {
    var n = P.length, M = [], i, j, k;
    for (i = 0; i < n; i++) {
      M.push([]);
      for (j = 0; j < n; j++) M[i].push(P[j][i] - (i === j ? 1 : 0));
      M[i].push(0);
    }
    for (j = 0; j <= n; j++) M[n - 1][j] = 1;
    for (k = 0; k < n; k++) {
      var piv = k;
      for (i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
      if (Math.abs(M[piv][k]) < 1e-12) return null;
      var tmp = M[k]; M[k] = M[piv]; M[piv] = tmp;
      for (i = 0; i < n; i++) {
        if (i === k) continue;
        var f = M[i][k] / M[k][k];
        for (j = k; j <= n; j++) M[i][j] -= f * M[k][j];
      }
    }
    return M.map(function (l, r) { return l[n] / l[r]; });
  }

  function pasMatrice(pi, P) {
    return P[0].map(function (_, j) {
      return pi.reduce(function (a, v, i) { return a + v * P[i][j]; }, 0);
    });
  }

  /* ------------------------------------------------------ Graphe d'une chaîne
   * [[widget:chaine|n=machine]] : sommets, arcs courbés, boucles, étiquettes, légende KaTeX.
   */

  var R = 22;
  var GRAPHES = {
    'machine': {
      W: 560, H: 230,
      sommets: [['0', 80, 100], ['1', 280, 100], ['2', 480, 100]],
      arcs: [
        ['0', '0', 'p²', { boucle: 90 }], ['0', '1', '2p(1−p)', {}], ['1', '1', 'p', { boucle: 90 }],
        ['1', '2', '1−p', {}], ['2', '2', '1', { boucle: 90 }], ['0', '2', '(1−p)²', { courbe: -0.32 }]
      ],
      legende: 'État $0$ : les deux éléments fonctionnent. État $1$ : un seul fonctionne. État $2$ : les deux sont en panne (état absorbant).'
    },
    'ascenseurs': {
      W: 600, H: 330,
      sommets: [['0', 90, 165], ['1', 300, 60], ['2', 300, 270], ['3', 510, 165]],
      arcs: [
        ['0', '0', 'α', { boucle: 180 }], ['0', '1', 'β', { courbe: 0.14 }], ['1', '0', 'α', { courbe: 0.14 }],
        ['0', '2', 'q', {}], ['1', '1', 'β', { boucle: 90 }], ['1', '2', 'q', {}],
        ['2', '3', '1', { courbe: 0.14 }], ['3', '2', 'q', { courbe: 0.14 }],
        ['3', '0', 'α', {}], ['3', '1', 'β', {}]
      ],
      legende: '$0$ : inactive, $1$ : chantier A, $2$ : chantier B (1re semaine), $3$ : chantier B (2e semaine). $\\alpha = (1-p)(1-q)$, $\\beta = p(1-q)$.'
    },
    'deux-etats': {
      W: 560, H: 170,
      sommets: [['0', 170, 85], ['1', 390, 85]],
      arcs: [['0', '1', 'a', { courbe: 0.25 }], ['1', '0', 'b', { courbe: 0.25 }], ['0', '0', '1−a', { boucle: 180 }], ['1', '1', '1−b', { boucle: 0 }]],
      legende: '$P = \\begin{pmatrix} 1-a & a \\\\ b & 1-b \\end{pmatrix}$'
    },
    'tampon': {
      W: 620, H: 210,
      sommets: [['0', 60, 120], ['1', 200, 120], ['2', 340, 120], ['3', 480, 120], ['…', 590, 120]],
      arcs: [
        ['0', '0', '1−a', { boucle: 90 }], ['0', '1', 'a', { courbe: 0.28 }], ['1', '0', 'd', { courbe: 0.28 }],
        ['1', '1', 'r', { boucle: 90 }], ['1', '2', 'ap', { courbe: 0.28 }], ['2', '1', 'd', { courbe: 0.28 }],
        ['2', '2', 'r', { boucle: 90 }], ['2', '3', 'ap', { courbe: 0.28 }], ['3', '2', 'd', { courbe: 0.28 }],
        ['3', '3', 'r', { boucle: 90 }], ['3', '…', 'ap', { courbe: 0.28 }], ['…', '3', 'd', { courbe: 0.28 }]
      ],
      legende: 'L\'état est le nombre de paquets dans le tampon. $d = (1-a)(1-p)$, $r = (1-a)p + a(1-p)$.'
    },
    'gsi-exemple': {
      W: 560, H: 280,
      sommets: [['0', 100, 220], ['1', 280, 60], ['2', 460, 220]],
      arcs: [
        ['0', '1', '1', { courbe: 0.15 }], ['1', '0', '3', { courbe: 0.15 }], ['0', '2', '1', {}],
        ['1', '2', '2', { courbe: 0.15 }], ['2', '1', '1', { courbe: 0.15 }]
      ],
      legende: 'Les arcs portent des **taux** (par unité de temps), pas des probabilités : pas de boucle. $A = \\begin{pmatrix} -2 & 1 & 1 \\\\ 3 & -5 & 2 \\\\ 0 & 1 & -1 \\end{pmatrix}$'
    },
    'naissance-mort': {
      W: 600, H: 170,
      sommets: [['0', 60, 85], ['1', 180, 85], ['2', 300, 85], ['3', 420, 85], ['4', 540, 85]],
      arcs: [
        ['0', '1', 'λ₀', { courbe: 0.3 }], ['1', '0', 'μ₁', { courbe: 0.3 }],
        ['1', '2', 'λ₁', { courbe: 0.3 }], ['2', '1', 'μ₂', { courbe: 0.3 }],
        ['2', '3', 'λ₂', { courbe: 0.3 }], ['3', '2', 'μ₃', { courbe: 0.3 }],
        ['3', '4', 'λ₃', { courbe: 0.3 }], ['4', '3', 'μ₄', { courbe: 0.3 }]
      ],
      legende: 'Naissance (arrivée) $k \\to k+1$ au taux $\\lambda_k$, mort (départ) $k \\to k-1$ au taux $\\mu_k$.'
    },
    'mm1': {
      W: 600, H: 170,
      sommets: [['0', 60, 85], ['1', 180, 85], ['2', 300, 85], ['3', 420, 85], ['…', 540, 85]],
      arcs: [
        ['0', '1', 'λ', { courbe: 0.3 }], ['1', '0', 'μ', { courbe: 0.3 }],
        ['1', '2', 'λ', { courbe: 0.3 }], ['2', '1', 'μ', { courbe: 0.3 }],
        ['2', '3', 'λ', { courbe: 0.3 }], ['3', '2', 'μ', { courbe: 0.3 }],
        ['3', '…', 'λ', { courbe: 0.3 }], ['…', '3', 'μ', { courbe: 0.3 }]
      ],
      legende: 'File M/M/1 : l\'état est le nombre de clients dans le système, $\\lambda_k = \\lambda$ et $\\mu_k = \\mu$ pour tout $k$.'
    },
    'mm11': {
      W: 440, H: 170,
      sommets: [['0', 140, 85], ['1', 300, 85]],
      arcs: [['0', '1', 'λ', { courbe: 0.3 }], ['1', '0', 'μ', { courbe: 0.3 }]],
      legende: 'Routeur sans espace d\'attente (M/M/1/1) : $0$ libre, $1$ occupé. Un paquet qui arrive dans l\'état $1$ est perdu.'
    },
    'mminf': {
      W: 600, H: 170,
      sommets: [['0', 60, 85], ['1', 180, 85], ['2', 300, 85], ['3', 420, 85], ['…', 540, 85]],
      arcs: [
        ['0', '1', 'λ', { courbe: 0.3 }], ['1', '0', 'μ', { courbe: 0.3 }],
        ['1', '2', 'λ', { courbe: 0.3 }], ['2', '1', '2μ', { courbe: 0.3 }],
        ['2', '3', 'λ', { courbe: 0.3 }], ['3', '2', '3μ', { courbe: 0.3 }],
        ['3', '…', 'λ', { courbe: 0.3 }], ['…', '3', '4μ', { courbe: 0.3 }]
      ],
      legende: 'File M/M/$\\infty$ : chaque client a son serveur, il n\'y a jamais d\'attente. Avec $k$ clients, $k$ services sont en cours : $\\mu_k = k\\mu$.'
    },
    'mm1k': {
      W: 600, H: 170,
      sommets: [['0', 60, 85], ['1', 180, 85], ['2', 300, 85], ['…', 420, 85], ['N', 540, 85]],
      arcs: [
        ['0', '1', 'λ', { courbe: 0.3 }], ['1', '0', 'μ', { courbe: 0.3 }],
        ['1', '2', 'λ', { courbe: 0.3 }], ['2', '1', 'μ', { courbe: 0.3 }],
        ['2', '…', 'λ', { courbe: 0.3 }], ['…', '2', 'μ', { courbe: 0.3 }],
        ['…', 'N', 'λ', { courbe: 0.3 }], ['N', '…', 'μ', { courbe: 0.3 }]
      ],
      legende: 'File M/M/1/N : au plus $N$ clients dans le système. Dans l\'état $N$, un client qui arrive est perdu : il n\'y a pas d\'arc vers $N+1$.'
    }
  };

  window.Widgets.definir('chaine', function (hote, opts) {
    var G = GRAPHES[opts.n];
    if (!G) { hote.innerHTML = '<p class="widget-help">Graphe inconnu : ' + opts.n + '</p>'; return; }
    hote.classList.add('widget-graphe');
    hote.innerHTML = '<div class="gfig-wrap"></div>' + (G.legende ? '<p class="gfig-legende">' + window.Rendu.inline(G.legende) + '</p>' : '');
    var svg = O.el('svg', { viewBox: '0 0 ' + G.W + ' ' + G.H, class: 'gfig', role: 'img', 'aria-label': 'Graphe de la chaîne' }, hote.querySelector('.gfig-wrap'));
    svg.style.maxWidth = G.W + 'px';
    var idF = O.uid('fl');
    var defs = O.el('defs', null, svg);
    var mk = O.el('marker', { id: idF, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    O.el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'g-fleche' }, mk);
    var pos = {};
    G.sommets.forEach(function (s) { pos[s[0]] = { x: s[1], y: s[2], fantome: s[0] === '…' }; });
    var gA = O.el('g', null, svg), gL = O.el('g', null, svg), gS = O.el('g', null, svg);

    function etiquette(x, y, t) {
      var n = O.el('text', { x: x, y: y + 4, class: 'g-note', 'text-anchor': 'middle' }, gL);
      n.textContent = t;
    }

    G.arcs.forEach(function (a) {
      var A = pos[a[0]], B = pos[a[1]], o = a[3] || {};
      var g = O.el('g', { class: 'g-arete' }, gA);
      if (a[0] === a[1]) {
        var ang = (o.boucle === undefined ? 90 : o.boucle) * Math.PI / 180;
        var u = function (d) { return { x: Math.cos(ang + d), y: -Math.sin(ang + d) }; };
        var d1 = u(0.45), d2 = u(-0.45);
        var p1 = { x: A.x + d1.x * R, y: A.y + d1.y * R }, p2 = { x: A.x + d2.x * R, y: A.y + d2.y * R };
        var c1 = { x: A.x + u(0.6).x * R * 3, y: A.y + u(0.6).y * R * 3 }, c2 = { x: A.x + u(-0.6).x * R * 3, y: A.y + u(-0.6).y * R * 3 };
        O.el('path', { d: 'M' + p1.x + ' ' + p1.y + ' C' + c1.x + ' ' + c1.y + ' ' + c2.x + ' ' + c2.y + ' ' + p2.x + ' ' + p2.y, class: 'g-trait', 'marker-end': 'url(#' + idF + ')' }, g);
        var m = u(0);
        etiquette(A.x + m.x * (R * 2.55 + 12), A.y + m.y * (R * 2.55 + 8), a[2]);
        return;
      }
      var dx = B.x - A.x, dy = B.y - A.y, L = Math.sqrt(dx * dx + dy * dy);
      var nx = dy / L, ny = -dx / L, k = o.courbe || 0;
      var C = { x: (A.x + B.x) / 2 + nx * k * L, y: (A.y + B.y) / 2 + ny * k * L };
      function vers(P, Q, r) { var ux = Q.x - P.x, uy = Q.y - P.y, l = Math.sqrt(ux * ux + uy * uy); return { x: P.x + ux / l * r, y: P.y + uy / l * r }; }
      var rA = A.fantome ? 12 : R, rB = B.fantome ? 14 : R + 1;
      var S = vers(A, k ? C : B, rA), E = vers(B, k ? C : A, rB);
      O.el('path', { d: 'M' + S.x + ' ' + S.y + ' Q' + C.x + ' ' + C.y + ' ' + E.x + ' ' + E.y, class: 'g-trait', 'marker-end': 'url(#' + idF + ')' }, g);
      var mx = 0.25 * A.x + 0.5 * C.x + 0.25 * B.x, my = 0.25 * A.y + 0.5 * C.y + 0.25 * B.y;
      var sgn = k < 0 ? -1 : 1, dec = o.decalage || 13;
      etiquette(mx + nx * sgn * dec, my + ny * sgn * dec, a[2]);
    });

    G.sommets.forEach(function (s) {
      var P = pos[s[0]];
      var g = O.el('g', { class: 'g-sommet' }, gS);
      if (!P.fantome) O.el('circle', { cx: P.x, cy: P.y, r: R, class: 'g-forme' }, g);
      var t = O.el('text', { x: P.x, y: P.y + 5, class: 'g-nom', 'text-anchor': 'middle' }, g);
      t.textContent = s[0];
    });
  });

  /* ------------------------------------------------------ Chaîne pas à pas
   * [[widget:markov|modele=machine]] (ou ascenseurs, deux-etats) : π(t+1) = π(t) P et convergence.
   */

  var MODELES = {
    'machine': {
      titre: 'La machine à deux éléments, jour après jour',
      params: [{ cle: 'p', label: 'Fiabilité $p$', min: 0.05, max: 0.95, step: 0.05, value: 0.8 }],
      P: function (v) { var p = v.p; return [[p * p, 2 * p * (1 - p), (1 - p) * (1 - p)], [0, p, 1 - p], [0, 0, 1]]; }
    },
    'ascenseurs': {
      titre: 'L\'installateur d\'ascenseurs, semaine après semaine',
      params: [
        { cle: 'p', label: 'Demande A : $p$', min: 0.05, max: 0.95, step: 0.05, value: 0.5 },
        { cle: 'q', label: 'Demande B : $q$', min: 0.05, max: 0.95, step: 0.05, value: 0.6 }
      ],
      P: function (v) {
        var a = (1 - v.p) * (1 - v.q), b = v.p * (1 - v.q);
        return [[a, b, v.q, 0], [a, b, v.q, 0], [0, 0, 0, 1], [a, b, v.q, 0]];
      }
    },
    'deux-etats': {
      titre: 'Une chaîne à deux états',
      params: [
        { cle: 'a', label: '$P_{01} = a$', min: 0.05, max: 1, step: 0.05, value: 0.3 },
        { cle: 'b', label: '$P_{10} = b$', min: 0.05, max: 1, step: 0.05, value: 0.1 }
      ],
      P: function (v) { return [[1 - v.a, v.a], [v.b, 1 - v.b]]; }
    }
  };

  window.Widgets.definir('markov', function (hote, opts, signal) {
    var M = MODELES[opts.modele] || MODELES['deux-etats'];
    var v = {}, T = 15, t = 0, depart = 0;
    // Valeurs de départ : celles du modèle, ou celles passées dans le widget (ex. modele=deux-etats;a=0.4;b=0.2).
    M.params.forEach(function (p) {
      var x = Number(opts[p.cle]);
      v[p.cle] = opts[p.cle] !== undefined && isFinite(x) ? Math.min(p.max, Math.max(p.min, x)) : p.value;
    });
    var z = O.cadre(hote, M.titre, 'Chaque clic applique $\\pi(t+1) = \\pi(t) P$. Les pointillés marquent la distribution stationnaire, solution de $\\pi = \\pi P$.'.replace(/\$([^$]+)\$/g, function (_, m) { return tex(m); }));
    var W = 360, H = 230;
    var r = O.repere({ W: W, H: H, pad: 30, xmin: 0, xmax: T, ymin: 0, ymax: 1 });
    var svg = O.creerSvg(z.fig, W, H, 'Évolution des probabilités de chaque état');
    O.grille(svg, r, 5, 0.25);
    [0, 5, 10, 15].forEach(function (x) { O.texte(svg, r.sx(x), H - 10, 't = ' + x, 'lbl', 'middle'); });
    [0, 0.5, 1].forEach(function (y) { O.texte(svg, 4, r.sy(y) + 4, String(y).replace('.', ','), 'lbl'); });
    var n = M.P(v).length;
    var gStat = O.el('g', null, svg), gCourbes = O.el('g', null, svg);
    var marque = O.el('line', { class: 'helper', y1: r.sy(0), y2: r.sy(1) }, svg);
    var gPts = O.el('g', null, svg);

    var lignes = [];
    for (var i = 0; i < n; i++) {
      lignes.push({ cle: 'e' + i, label: tex('\\pi_' + i + '(t)') + ' <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + COULEURS[i] + '"></span>' });
    }
    var ctl = document.createElement('div');
    ctl.className = 'controls';
    z.side.appendChild(ctl);
    var info = document.createElement('p');
    info.className = 'widget-note';
    info.style.marginTop = '0';
    z.side.appendChild(info);
    var vals = O.lecture(z.side, lignes);
    var stat = document.createElement('p');
    stat.className = 'widget-note';
    z.side.appendChild(stat);
    var act = document.createElement('div');
    act.className = 'actions';
    act.style.marginTop = '10px';
    act.innerHTML = '<button type="button" class="btn btn-primary btn-small" data-c="pas">' + I.skipForward + '<span>Pas suivant</span></button>' +
      '<button type="button" class="btn btn-ghost btn-small" data-c="raz">' + I.arrowsClockwise + '<span>t = 0</span></button>';
    z.side.appendChild(act);

    M.params.forEach(function (p) {
      O.curseur(ctl, {
        label: p.label.replace(/\$([^$]+)\$/g, function (_, m) { return tex(m); }), min: p.min, max: p.max, step: p.step, value: v[p.cle], signal: signal,
        format: function (x) { return O.fmt(x, 2); },
        onInput: function (x) { v[p.cle] = x; tracer(); }
      });
    });
    O.selecteur(ctl, {
      label: 'État de départ', value: '0', signal: signal,
      options: Array.from({ length: n }, function (_, k) { return [String(k), 'État ' + k + ' à t = 0']; }),
      onChange: function (x) { depart = Number(x); t = 0; tracer(); }
    });

    function tracer() {
      var P = M.P(v);
      var hist = [Array.from({ length: n }, function (_, k) { return k === depart ? 1 : 0; })];
      for (var s = 1; s <= T; s++) hist.push(pasMatrice(hist[s - 1], P));
      var st = stationnaire(P);
      gStat.innerHTML = ''; gCourbes.innerHTML = ''; gPts.innerHTML = '';
      for (var k = 0; k < n; k++) {
        if (st) O.el('line', { x1: r.sx(0), x2: r.sx(T), y1: r.sy(st[k]), y2: r.sy(st[k]), stroke: COULEURS[k], 'stroke-width': 1.2, 'stroke-dasharray': '4 4', opacity: 0.8 }, gStat);
        var d = hist.map(function (h, s) { return (s ? 'L' : 'M') + r.sx(s).toFixed(1) + ' ' + r.sy(h[k]).toFixed(1); }).join('');
        O.el('path', { d: d, fill: 'none', stroke: COULEURS[k], 'stroke-width': 2, opacity: 0.35 }, gCourbes);
        var dv = hist.slice(0, t + 1).map(function (h, s) { return (s ? 'L' : 'M') + r.sx(s).toFixed(1) + ' ' + r.sy(h[k]).toFixed(1); }).join('');
        O.el('path', { d: dv, fill: 'none', stroke: COULEURS[k], 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, gCourbes);
        O.el('circle', { cx: r.sx(t), cy: r.sy(hist[t][k]), r: 4.5, fill: COULEURS[k], stroke: 'var(--bg)', 'stroke-width': 2 }, gPts);
        vals['e' + k].textContent = O.fmt(hist[t][k], 3);
      }
      marque.setAttribute('x1', r.sx(t)); marque.setAttribute('x2', r.sx(t));
      info.innerHTML = 'Instant ' + tex('t = ' + t);
      stat.textContent = st ? 'Distribution stationnaire : π = (' + st.map(function (x) { return O.fmt(x, 3); }).join(' ; ') + ')' : 'Pas de distribution stationnaire unique pour ces valeurs.';
    }

    act.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      t = b.getAttribute('data-c') === 'pas' ? Math.min(T, t + 1) : 0;
      tracer();
    }, { signal: signal });
    tracer();
  });

  /* ------------------------------------------------------ File M/M/1
   * [[widget:mm1]] : curseurs λ et μ (par heure), histogramme des π_k, a, E(L), E(Lq), E(T), E(Tq) (notations du cours).
   */

  window.Widgets.definir('mm1', function (hote, opts, signal) {
    var lam = Number(opts.lambda) || 10, mu = Number(opts.mu) || 20, N = 10;
    var z = O.cadre(hote, 'La file M/M/1', 'Règle $\\lambda$ (arrivées par heure) et $\\mu$ (services par heure). Les barres donnent $\\pi_k = (1-a)a^k$, la probabilité d\'avoir $k$ clients dans le système.'.replace(/\$([^$]+)\$/g, function (_, m) { return tex(m); }));
    var W = 360, H = 220;
    var r = O.repere({ W: W, H: H, pad: 30, xmin: -0.6, xmax: N + 0.6, ymin: 0, ymax: 1 });
    var svg = O.creerSvg(z.fig, W, H, 'Probabilités stationnaires de la file M/M/1');
    O.el('line', { x1: r.sx(-0.6), x2: r.sx(N + 0.6), y1: r.sy(0), y2: r.sy(0), class: 'axis' }, svg);
    for (var k = 0; k <= N; k += 2) O.texte(svg, r.sx(k), H - 10, String(k), 'lbl', 'middle');
    O.texte(svg, W - 6, H - 10, 'k', 'lbl', 'end');
    var gB = O.el('g', null, svg);
    var alerte = O.texte(svg, W / 2, H / 2, '', 'lbl-review', 'middle');
    var ctl = document.createElement('div');
    ctl.className = 'controls';
    z.side.appendChild(ctl);
    O.curseur(ctl, { label: tex('\\lambda') + ' (clients/h)', min: 1, max: 40, step: 1, value: lam, signal: signal, onInput: function (x) { lam = x; maj(); } });
    O.curseur(ctl, { label: tex('\\mu') + ' (services/h)', min: 1, max: 40, step: 1, value: mu, signal: signal, onInput: function (x) { mu = x; maj(); } });
    var vals = O.lecture(z.side, [
      { cle: 'rho', label: tex('a = \\lambda / \\mu') + ' (trafic offert)', classe: 'accent' },
      { cle: 'p0', label: tex('\\pi_0') + ' (serveur libre)' },
      { cle: 'L', label: tex('E(L)') + ' (clients dans le système)' },
      { cle: 'Lq', label: tex('E(L_q)') + ' (clients en attente)' },
      { cle: 'W', label: tex('E(T)') + ' (temps de séjour)' },
      { cle: 'Wq', label: tex('E(T_q)') + ' (attente)' }
    ]);
    function minutes(h) { return O.fmt(h * 60, 1) + ' min'; }
    function maj() {
      var rho = lam / mu;
      gB.innerHTML = '';
      vals.rho.textContent = O.fmt(rho, 2);
      if (rho >= 1) {
        alerte.textContent = 'a ≥ 1 : pas de régime stationnaire, la file grandit sans fin';
        ['p0', 'L', 'Lq', 'W', 'Wq'].forEach(function (c) { vals[c].textContent = '∞'; });
        vals.p0.textContent = '0';
        return;
      }
      alerte.textContent = '';
      var pis = [];
      for (var n = 0; n <= N; n++) pis.push((1 - rho) * Math.pow(rho, n));
      var ymax = Math.max(0.2, pis[0] * 1.1);
      var bw = (r.sx(1) - r.sx(0)) * 0.7;
      pis.forEach(function (p, n) {
        var y = r.sy(p / ymax);
        O.el('rect', { x: r.sx(n) - bw / 2, y: y, width: bw, height: Math.max(0, r.sy(0) - y), rx: 3, class: n === 0 ? 'rect-neg' : 'rect' }, gB);
      });
      O.texte(gB, r.sx(0), r.sy(pis[0] / ymax) - 6, O.fmt(pis[0], 2), 'lbl', 'middle');
      var L = rho / (1 - rho), Lq = rho * rho / (1 - rho), Wh = 1 / (mu - lam), Wqh = rho / (mu - lam);
      vals.p0.textContent = O.fmt(1 - rho, 3);
      vals.L.textContent = O.fmt(L, 2);
      vals.Lq.textContent = O.fmt(Lq, 2);
      vals.W.textContent = minutes(Wh);
      vals.Wq.textContent = minutes(Wqh);
    }
    maj();
  });
})();
