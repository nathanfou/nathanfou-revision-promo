/*
 * Géométrie des figures de graphes, sans dépendance au navigateur.
 * Calcule une « scène » : positions en pixels, tracés des arêtes (courbes de Bézier
 * quadratiques rognées au bord des sommets), flèches, étiquettes et emplacement des notes.
 * Utilisé par le rendu SVG (graphe.js) et par le vérificateur (collisions).
 */
(function (racine) {
  'use strict';

  var A = racine.Algos;
  var UNITE = 80;          // pixels par unité de grille
  var R = 17;              // rayon d'un sommet
  var FLECHE = 10.5;       // longueur de la pointe
  var FLECHE_L = 4.7;      // demi-largeur de la pointe
  var ECART = 7;           // distance minimale entre une arête et un sommet qu'elle ne touche pas
  var NOTE_D = R + 12;     // distance centre du sommet -> note

  /* ------------------------------------------------------------ Outils */

  function dist(p, q) { return Math.hypot(p[0] - q[0], p[1] - q[1]); }
  function norm(v) { var l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }

  function bez(p0, c, p2, t) {
    var u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1]];
  }
  function bezD(p0, c, p2, t) {
    return [2 * ((1 - t) * (c[0] - p0[0]) + t * (p2[0] - c[0])), 2 * ((1 - t) * (c[1] - p0[1]) + t * (p2[1] - c[1]))];
  }
  function sousCourbe(p0, c, p2, a, b) {
    var pa = bez(p0, c, p2, a), pb = bez(p0, c, p2, b), d = bezD(p0, c, p2, a);
    return [pa, [pa[0] + (b - a) / 2 * d[0], pa[1] + (b - a) / 2 * d[1]], pb];
  }
  function cub(p0, c1, c2, p3, t) {
    var u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1]
    ];
  }

  /* Cherche la frontière d'un prédicat vrai en a et faux en b. */
  function bissection(f, a, b) {
    for (var i = 0; i < 32; i++) {
      var m = (a + b) / 2;
      if (f(m)) a = m; else b = m;
    }
    return (a + b) / 2;
  }

  function r1(v) { return Math.round(v * 10) / 10; }
  function pt(p) { return r1(p[0]) + ' ' + r1(p[1]); }

  /* ------------------------------------------------------------ Sommets */

  function formeSommet(G, x) {
    var t = String(A.nom(G, x));
    var len = Array.from(t).length;
    if (len <= 2) return { type: 'cercle', r: R };
    var h = 2 * R - 2;
    return { type: 'pilule', w: Math.max(2 * R + 4, Math.round(14 + 7.4 * len)), h: h, r: h / 2 };
  }

  /* Distance signée d'un point au bord d'un sommet (négative à l'intérieur). */
  function distForme(forme, c, p) {
    var dx = p[0] - c[0], dy = p[1] - c[1];
    if (forme.type === 'cercle') return Math.hypot(dx, dy) - forme.r;
    var demi = forme.w / 2 - forme.h / 2;
    var qx = Math.max(-demi, Math.min(demi, dx));
    return Math.hypot(dx - qx, dy) - forme.h / 2;
  }

  /* ------------------------------------------------------------ Dispositions */

  function dispositionNiveaux(G, niveaux, opts) {
    opts = opts || {};
    var dx = opts.dx || 1.75, dy = opts.dy || 1.1;
    var pos = {};
    niveaux.forEach(function (N, k) {
      var tri = N.slice();
      if (k > 0) {
        tri.sort(function (a, b) {
          function bary(x) {
            var ps = G.pred[x].filter(function (p) { return pos[p]; });
            if (!ps.length) return 0;
            return ps.reduce(function (s, p) { return s + pos[p][1]; }, 0) / ps.length;
          }
          return bary(a) - bary(b) || A.comparer(a, b);
        });
      }
      tri.forEach(function (x, i) { pos[x] = [k * dx, (i - (tri.length - 1) / 2) * dy]; });
    });
    return pos;
  }

  /* Forêt d'un parcours en profondeur : racines à gauche, premier fils sur la même ligne. */
  function dispositionForet(G, trace, opts) {
    opts = opts || {};
    var dx = opts.dx || 1.3, dy = opts.dy || 0.95;
    var enfants = {};
    G.sommets.forEach(function (x) { enfants[x] = []; });
    Object.keys(trace.parent).forEach(function (y) { enfants[trace.parent[y]].push(y); });
    Object.keys(enfants).forEach(function (x) { enfants[x].sort(function (a, b) { return trace.d[a] - trace.d[b]; }); });
    var ligne = 0, pos = {};
    trace.arbres.forEach(function (arbre) {
      (function placer(x, prof) {
        pos[x] = [prof * dx, ligne * dy];
        enfants[x].forEach(function (y, i) {
          if (i > 0) ligne++;
          placer(y, prof + 1);
        });
      })(arbre[0], 0);
      ligne++;
    });
    return pos;
  }

  /* Graphe réduit : un sommet par composante, disposé par niveaux. */
  function grapheReduit(G, comps) {
    var red = A.reduit(G, comps);
    var ids = red.comps.map(function (c, i) { return 'C' + (i + 1); });
    var etiq = {};
    red.comps.forEach(function (c, i) { etiq[ids[i]] = '{' + c.map(function (x) { return A.nom(G, x); }).join(',') + '}'; });
    var def = {
      oriente: true,
      sommets: ids.map(function (id) { return id + ':0,0'; }).join(' '),
      aretes: red.arcs.map(function (p) { return ids[p[0]] + '>' + ids[p[1]]; }).join(' '),
      etiquettes: etiq,
      ordre: ids.join(' ')
    };
    var Gr = A.construire(def, G.id + '-reduit');
    var niv = A.partitionNiveaux(Gr);
    var pos = dispositionNiveaux(Gr, niv.niveaux, { dx: 2.1, dy: 1.15 });
    Gr.sommets.forEach(function (x) { Gr.pos[x] = pos[x] || [0, 0]; });
    Gr.niveaux = niv.niveaux;
    Gr.comps = red.comps;
    return Gr;
  }

  /* ------------------------------------------------------------ Scène */

  function cleParallele(e) {
    return A.comparer(e.u, e.v) <= 0 ? e.u + '|' + e.v : e.v + '|' + e.u;
  }

  function collisions(courbe, e, S) {
    var pire = Infinity;
    for (var i = 1; i < 24; i++) {
      var p = bez(courbe[0], courbe[1], courbe[2], i / 24);
      for (var k = 0; k < S.ids.length; k++) {
        var z = S.ids[k];
        if (z === e.u || z === e.v) continue;
        var d = distForme(S.formes[z], S.pos[z], p);
        if (d < pire) pire = d;
      }
    }
    return pire;
  }

  function mise(G, opts) {
    opts = opts || {};
    var positions = opts.positions || G.pos;
    var ech = (opts.echelle || G.def.echelle || 1) * UNITE;
    var S = { ids: G.sommets.slice(), pos: {}, formes: {}, aretes: [], notes: {}, avertissements: [] };
    G.sommets.forEach(function (x) {
      var p = positions[x] || [0, 0];
      S.pos[x] = [p[0] * ech, p[1] * ech];
      S.formes[x] = formeSommet(G, x);
    });

    var masquees = opts.masquer || {};
    var aretes = G.aretes.filter(function (e) { return !masquees[e.id]; });

    // Groupes d'arêtes parallèles (y compris arcs opposés).
    var groupes = {};
    aretes.forEach(function (e) {
      if (e.u === e.v) return;
      var k = cleParallele(e);
      (groupes[k] = groupes[k] || []).push(e);
    });

    aretes.forEach(function (e) {
      if (e.u === e.v) { S.aretes.push(boucle(G, e, S)); return; }
      var p0 = S.pos[e.u], p2 = S.pos[e.v];
      var L = dist(p0, p2);
      var groupe = groupes[cleParallele(e)];
      var dev = 0, auto = false;
      if (e.bend !== null) {
        dev = e.bend * L;
      } else if (groupe.length > 1) {
        var i = groupe.indexOf(e);
        var pas = Math.max(16, Math.min(30, 0.16 * L));
        var signe = A.comparer(e.u, e.v) <= 0 ? 1 : -1;
        dev = (i - (groupe.length - 1) / 2) * pas * signe;
      }
      var courbe = [p0, controle(p0, p2, dev), p2];
      var marge = collisions(courbe, e, S);
      if (marge < ECART && e.bend === null && groupe.length === 1) {
        var meilleur = { marge: marge, courbe: courbe, dev: dev };
        [0.12, -0.12, 0.18, -0.18, 0.25, -0.25, 0.33, -0.33, 0.42, -0.42].some(function (b) {
          var c2 = [p0, controle(p0, p2, b * L), p2];
          var m2 = collisions(c2, e, S);
          if (m2 > meilleur.marge) meilleur = { marge: m2, courbe: c2, dev: b * L };
          return m2 >= ECART;
        });
        courbe = meilleur.courbe;
        marge = meilleur.marge;
        dev = meilleur.dev;
        auto = true;
      }
      var geo = rogner(G, e, S, courbe);
      geo.auto = auto;
      geo.marge = marge;
      geo.dev = dev;
      S.aretes.push(geo);
    });

    placerEtiquettes(G, S, opts || {});
    placerNotes(G, S, opts);
    cadrer(S, opts);
    return S;
  }

  function controle(p0, p2, dev) {
    var dx = p2[0] - p0[0], dy = p2[1] - p0[1], L = Math.hypot(dx, dy) || 1;
    var nx = -dy / L, ny = dx / L;
    return [(p0[0] + p2[0]) / 2 + nx * 2 * dev, (p0[1] + p2[1]) / 2 + ny * 2 * dev];
  }

  function rogner(G, e, S, courbe) {
    var p0 = courbe[0], c = courbe[1], p2 = courbe[2];
    var fu = S.formes[e.u], fv = S.formes[e.v];
    var t0 = bissection(function (t) { return distForme(fu, p0, bez(p0, c, p2, t)) <= 1; }, 0, 0.5);
    var geo = { id: e.id, u: e.u, v: e.v, courbe: courbe, label: null };
    if (G.oriente) {
      var t1 = bissection(function (t) { return distForme(fv, p2, bez(p0, c, p2, t)) <= 2; }, 1, 0.5);
      var pointe = bez(p0, c, p2, t1);
      var tb = bissection(function (t) { return dist(bez(p0, c, p2, t), pointe) < FLECHE; }, t1, t0);
      var tn = bissection(function (t) { return dist(bez(p0, c, p2, t), pointe) < FLECHE * 0.7; }, t1, t0);
      var base = bez(p0, c, p2, tb);
      var dir = norm([pointe[0] - base[0], pointe[1] - base[1]]);
      var b = [pointe[0] - dir[0] * FLECHE, pointe[1] - dir[1] * FLECHE];
      var creux = [pointe[0] - dir[0] * FLECHE * 0.72, pointe[1] - dir[1] * FLECHE * 0.72];
      var perp = [-dir[1], dir[0]];
      geo.fleche = 'M' + pt(pointe) + 'L' + pt([b[0] + perp[0] * FLECHE_L, b[1] + perp[1] * FLECHE_L]) +
        'L' + pt(creux) + 'L' + pt([b[0] - perp[0] * FLECHE_L, b[1] - perp[1] * FLECHE_L]) + 'Z';
      var sc = sousCourbe(p0, c, p2, t0, tn);
      geo.trait = 'M' + pt(sc[0]) + 'Q' + pt(sc[1]) + ' ' + pt(sc[2]);
    } else {
      var t2 = bissection(function (t) { return distForme(fv, p2, bez(p0, c, p2, t)) <= 1; }, 1, 0.5);
      var sc2 = sousCourbe(p0, c, p2, t0, t2);
      geo.trait = 'M' + pt(sc2[0]) + 'Q' + pt(sc2[1]) + ' ' + pt(sc2[2]);
      geo.fleche = null;
    }
    geo.echantillons = [];
    for (var i = 0; i <= 20; i++) geo.echantillons.push(bez(p0, c, p2, i / 20));
    return geo;
  }

  function directionsSortantes(G, S, x) {
    var dirs = [];
    S.aretes.forEach(function (g) {
      if (g.boucle) { if (g.u === x) dirs.push(g.angle); return; }
      if (g.u !== x && g.v !== x) return;
      var c = g.courbe[1], p = S.pos[x];
      var v = [c[0] - p[0], c[1] - p[1]];
      if (Math.hypot(v[0], v[1]) < 1e-6) {
        var autre = g.u === x ? S.pos[g.v] : S.pos[g.u];
        v = [autre[0] - p[0], autre[1] - p[1]];
      }
      dirs.push(Math.atan2(v[1], v[0]));
    });
    return dirs;
  }

  function ecartAngulaire(a, b) {
    var d = Math.abs(a - b) % (2 * Math.PI);
    return d > Math.PI ? 2 * Math.PI - d : d;
  }

  function boucle(G, e, S) {
    var p = S.pos[e.u], f = S.formes[e.u];
    var dirs = directionsSortantes(G, S, e.u);
    var cands = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4];
    var a = cands.reduce(function (best, c) {
      var s = dirs.length ? Math.min.apply(null, dirs.map(function (d) { return ecartAngulaire(c, d); })) : Math.PI;
      return s > best.s + 1e-6 ? { a: c, s: s } : best;
    }, { a: cands[0], s: -1 }).a;
    var rr = f.type === 'cercle' ? f.r : f.h / 2;
    var s0 = [p[0] + (rr + 1) * Math.cos(a - 0.5), p[1] + (rr + 1) * Math.sin(a - 0.5)];
    var s1 = [p[0] + (rr + 2) * Math.cos(a + 0.5), p[1] + (rr + 2) * Math.sin(a + 0.5)];
    var c1 = [p[0] + rr * 3.3 * Math.cos(a - 0.62), p[1] + rr * 3.3 * Math.sin(a - 0.62)];
    var c2 = [p[0] + rr * 3.3 * Math.cos(a + 0.62), p[1] + rr * 3.3 * Math.sin(a + 0.62)];
    var geo = { id: e.id, u: e.u, v: e.v, boucle: true, angle: a, label: null, courbe: [p, [p[0] + rr * 2.6 * Math.cos(a), p[1] + rr * 2.6 * Math.sin(a)], p] };
    if (G.oriente) {
      var tn = bissection(function (t) { return dist(cub(s0, c1, c2, s1, t), s1) < FLECHE * 0.7; }, 1, 0);
      var tb = bissection(function (t) { return dist(cub(s0, c1, c2, s1, t), s1) < FLECHE; }, 1, 0);
      var base = cub(s0, c1, c2, s1, tb);
      var dir = norm([s1[0] - base[0], s1[1] - base[1]]);
      var b = [s1[0] - dir[0] * FLECHE, s1[1] - dir[1] * FLECHE];
      var creux = [s1[0] - dir[0] * FLECHE * 0.72, s1[1] - dir[1] * FLECHE * 0.72];
      var perp = [-dir[1], dir[0]];
      geo.fleche = 'M' + pt(s1) + 'L' + pt([b[0] + perp[0] * FLECHE_L, b[1] + perp[1] * FLECHE_L]) + 'L' + pt(creux) + 'L' + pt([b[0] - perp[0] * FLECHE_L, b[1] - perp[1] * FLECHE_L]) + 'Z';
      // Sous-courbe [0, tn] par l'algorithme de de Casteljau.
      var lerp = function (p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
      var p01 = lerp(s0, c1, tn), p12 = lerp(c1, c2, tn), p23 = lerp(c2, s1, tn);
      var p012 = lerp(p01, p12, tn), p123 = lerp(p12, p23, tn);
      var fin = lerp(p012, p123, tn);
      geo.trait = 'M' + pt(s0) + 'C' + pt(p01) + ' ' + pt(p012) + ' ' + pt(fin);
    } else {
      geo.trait = 'M' + pt(s0) + 'C' + pt(c1) + ' ' + pt(c2) + ' ' + pt(s1);
      geo.fleche = null;
    }
    geo.echantillons = [];
    for (var i = 0; i <= 12; i++) geo.echantillons.push(cub(s0, c1, c2, s1, i / 12));
    return geo;
  }

  function boite(cx, cy, w, h) { return { x: cx - w / 2, y: cy - h / 2, w: w, h: h }; }
  function chevauche(a, b, m) {
    m = m || 0;
    return a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
  }

  /* Texte d'une étiquette d'arc : le poids, ou « flux(capacité) » sur un réseau de transport. */
  function texteArc(G, e, opts) {
    if (G.flot) return opts && opts.capacites ? '(' + e.w + ')' : (G.flot[e.id] || 0) + '(' + e.w + ')';
    return String(e.w).replace('.', ',');
  }
  function largeurEtiquette(txt) { return Math.round(9 + 7.6 * txt.length); }

  function placerEtiquettes(G, S, opts) {
    var poses = [];
    S.aretes.forEach(function (g) {
      var e = G.parId[g.id];
      if (!e || e.w === null || e.w === undefined) return;
      var txt = texteArc(G, e, opts);
      // Sur un réseau, la place est réservée pour le flux le plus long possible (le flux change pendant l'animation).
      var w = largeurEtiquette(G.flot && !(opts && opts.capacites) ? e.w + '(' + e.w + ')' : txt), h = 18;
      var essais = e.lt !== null ? [e.lt] : [0.5, 0.42, 0.58, 0.35, 0.65, 0.3, 0.7];
      var choix = null, meilleurScore = -Infinity;
      essais.forEach(function (t) {
        var p = g.boucle ? g.courbe[1] : bez(g.courbe[0], g.courbe[1], g.courbe[2], t);
        var bx = boite(p[0], p[1], w, h);
        var score = 0;
        S.ids.forEach(function (z) {
          var dz = distForme(S.formes[z], S.pos[z], [Math.max(bx.x, Math.min(S.pos[z][0], bx.x + bx.w)), Math.max(bx.y, Math.min(S.pos[z][1], bx.y + bx.h))]);
          if (dz < 3) score -= 10;
        });
        poses.forEach(function (o) { if (chevauche(bx, o, 3)) score -= 10; });
        S.aretes.forEach(function (o) {
          if (o === g) return;
          o.echantillons.forEach(function (q) {
            if (q[0] > bx.x - 2 && q[0] < bx.x + bx.w + 2 && q[1] > bx.y - 2 && q[1] < bx.y + bx.h + 2) score -= 1;
          });
        });
        score -= Math.abs(t - 0.5) * 2;
        if (score > meilleurScore) { meilleurScore = score; choix = { x: p[0], y: p[1], w: w, h: h, txt: txt, boite: bx }; }
      });
      g.label = choix;
      g.labelScore = meilleurScore;
      poses.push(choix.boite);
    });
  }

  var DIRECTIONS = {
    n: -Math.PI / 2, ne: -Math.PI / 4, e: 0, se: Math.PI / 4, s: Math.PI / 2, so: 3 * Math.PI / 4, o: Math.PI, no: -3 * Math.PI / 4
  };

  function placerNotes(G, S, opts) {
    var ordre = ['n', 'ne', 'no', 'e', 'o', 'se', 'so', 's'];
    var largeurNote = opts.largeurNote || 34;
    S.ids.forEach(function (x) {
      var dirs = directionsSortantes(G, S, x);
      var p = S.pos[x], f = S.formes[x];
      var rayon = f.type === 'cercle' ? NOTE_D : f.h / 2 + 12;
      var force = G.notesPos[x];
      var meilleur = null;
      ordre.forEach(function (cle, rang) {
        var a = DIRECTIONS[cle];
        var ext = f.type === 'pilule' ? Math.abs(Math.cos(a)) * (f.w / 2 - f.h / 2) : 0;
        var c = [p[0] + (rayon + ext) * Math.cos(a), p[1] + rayon * Math.sin(a)];
        var s = dirs.length ? Math.min.apply(null, dirs.map(function (d) { return ecartAngulaire(a, d); })) : Math.PI;
        var bx = boite(c[0] + (Math.cos(a) > 0.3 ? largeurNote / 2 : Math.cos(a) < -0.3 ? -largeurNote / 2 : 0), c[1], largeurNote, 14);
        S.ids.forEach(function (z) {
          if (z === x) return;
          if (dist(S.pos[z], [bx.x + bx.w / 2, bx.y + bx.h / 2]) < R + 16) s -= 2;
        });
        S.aretes.forEach(function (g) {
          if (g.label && chevauche(bx, g.label.boite, 2)) s -= 1.5;
          if (g.u === x || g.v === x) return;
          g.echantillons.forEach(function (q) {
            if (q[0] > bx.x && q[0] < bx.x + bx.w && q[1] > bx.y && q[1] < bx.y + bx.h) s -= 0.6;
          });
        });
        s -= rang * 0.01;
        if (force) s = cle === force ? 100 : -100;
        if (!meilleur || s > meilleur.s) meilleur = { s: s, cle: cle, c: c, a: a };
      });
      var cos = Math.cos(meilleur.a), sin = Math.sin(meilleur.a);
      S.notes[x] = {
        x: r1(meilleur.c[0]),
        y: r1(meilleur.c[1] + (sin > 0.3 ? 9 : sin < -0.3 ? 0 : 4.5)),
        ancre: cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle',
        dir: meilleur.cle
      };
    });
  }

  function cadrer(S, opts) {
    var xs = [], ys = [];
    S.ids.forEach(function (x) {
      var p = S.pos[x], f = S.formes[x];
      var hw = f.type === 'cercle' ? f.r : f.w / 2, hh = f.type === 'cercle' ? f.r : f.h / 2;
      xs.push(p[0] - hw - 3, p[0] + hw + 3);
      ys.push(p[1] - hh - 3, p[1] + hh + 3);
      if (opts.notes !== false) {
        var n = S.notes[x];
        var lw = opts.largeurNote || 34;
        var gx = n.ancre === 'start' ? [n.x, n.x + lw] : n.ancre === 'end' ? [n.x - lw, n.x] : [n.x - lw / 2, n.x + lw / 2];
        xs.push(gx[0], gx[1]);
        ys.push(n.y - 13, n.y + 4);
      }
    });
    S.aretes.forEach(function (g) {
      g.echantillons.forEach(function (q) { xs.push(q[0] - 3, q[0] + 3); ys.push(q[1] - 3, q[1] + 3); });
      if (g.label) { xs.push(g.label.boite.x, g.label.boite.x + g.label.boite.w); ys.push(g.label.boite.y, g.label.boite.y + g.label.boite.h); }
    });
    var m = 8;
    var x0 = Math.min.apply(null, xs) - m, x1 = Math.max.apply(null, xs) + m;
    var y0 = Math.min.apply(null, ys) - m, y1 = Math.max.apply(null, ys) + m;
    S.vb = [r1(x0), r1(y0), r1(x1 - x0), r1(y1 - y0)];
    S.W = Math.ceil(x1 - x0);
    S.H = Math.ceil(y1 - y0);
  }

  /* Contrôle qualité d'une scène (vérificateur). */
  function controler(G, S) {
    var pbs = [];
    for (var i = 0; i < S.ids.length; i++) {
      for (var j = i + 1; j < S.ids.length; j++) {
        var a = S.ids[i], b = S.ids[j];
        var d = dist(S.pos[a], S.pos[b]);
        var ra = S.formes[a].type === 'cercle' ? S.formes[a].r : S.formes[a].w / 2;
        var rb = S.formes[b].type === 'cercle' ? S.formes[b].r : S.formes[b].w / 2;
        if (d < ra + rb + 14) pbs.push('sommets ' + a + ' et ' + b + ' trop proches');
      }
    }
    S.aretes.forEach(function (g) {
      if (g.boucle) return;
      if (g.marge < ECART - 0.5) pbs.push('l\'arête ' + g.id + ' frôle ou traverse un sommet (marge ' + g.marge.toFixed(1) + ' px)');
      if (g.label && g.labelScore <= -9) pbs.push('l\'étiquette de ' + g.id + ' chevauche un sommet ou une autre étiquette');
    });
    return pbs;
  }

  racine.GrapheGeo = {
    UNITE: UNITE,
    R: R,
    mise: mise,
    controler: controler,
    dispositionNiveaux: dispositionNiveaux,
    dispositionForet: dispositionForet,
    grapheReduit: grapheReduit,
    formeSommet: formeSommet,
    distForme: distForme
  };
})(typeof window !== 'undefined' ? window : globalThis);
