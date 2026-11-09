/*
 * Algorithmes de graphes, sans dépendance au navigateur.
 * Chargé par l'appli (window.Algos) et par les outils Node (vérificateur, tests).
 *
 * Format d'un graphe (ML.graphe(id, def)) :
 *   oriente : true pour un graphe orienté
 *   sommets : 'A:0,0 B:2,0 C:1,1.5'   positions en unités de grille (y vers le bas)
 *   aretes  : 'A>B:3 B>C~0.3 C-D@0.4'  a>b arc, a-b arête, :poids, ~courbure, @position de l'étiquette
 *   etiquettes : { A: '{1,2}' }        texte affiché à la place de l'identifiant (facultatif)
 *   ordre   : 'C A B'                  ordre d'examen imposé (sinon croissant ou alphabétique)
 *
 * Chaque algorithme « pas à pas » renvoie { etapes, resultat }. Une étape est un instantané :
 *   { texte, sommets: {id: {etat, note, couleur}}, aretes: {id: etat}, panneaux: [...] }
 */
(function (racine) {
  'use strict';

  /* ================================================================ Outils */

  function comparer(a, b) {
    var na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
    if (na && nb) return Number(a) - Number(b);
    if (na !== nb) return na ? -1 : 1;
    var c = a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
    if (c) return c;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function trier(liste, ordre) {
    var copie = liste.slice();
    if (ordre) {
      var rang = {};
      ordre.forEach(function (x, i) { rang[x] = i; });
      return copie.sort(function (a, b) { return (rang[a] === undefined ? 1e9 : rang[a]) - (rang[b] === undefined ? 1e9 : rang[b]) || comparer(a, b); });
    }
    return copie.sort(comparer);
  }

  function ensemble(liste, ordre) {
    return '\\{' + trier(liste, ordre).map(texId).join(', ') + '\\}';
  }

  /* Identifiant de sommet prêt pour KaTeX (les lettres restent droites comme dans le cours). */
  function texId(x) {
    if (x === 'α') return '\\alpha';
    if (x === 'ω') return '\\omega';
    return /^[A-Za-z]$/.test(x) ? '\\text{' + x + '}' : String(x).replace(/'/g, '\'');
  }

  function brut(x) { return String(x); }

  function unique(liste) {
    var vu = {};
    return liste.filter(function (x) { if (vu[x]) return false; vu[x] = true; return true; });
  }

  /* ============================================================ Construction */

  var RE_ARETE = /^([^\s>:~@-]+)([>-])([^\s>:~@-]+)(?::(-?\d+(?:[.,]\d+)?))?(?:~(-?\d*\.?\d+))?(?:@(\d*\.?\d+))?$/;

  function construire(def, id) {
    if (!def || typeof def !== 'object') throw new Error('Graphe ' + id + ' : définition absente');
    var G = {
      id: id || def.id || '',
      oriente: !!def.oriente,
      sommets: [],
      pos: {},
      lab: Object.assign({}, def.etiquettes || {}),
      notesPos: Object.assign({}, def.notes || {}),
      aretes: [],
      succ: {},
      pred: {},
      voisins: {},
      parCle: {},
      pondere: false,
      ordre: null,
      def: def
    };

    var brutsSommets = def.sommets || '';
    if (typeof brutsSommets === 'string') {
      brutsSommets.trim().split(/\s+/).filter(Boolean).forEach(function (tok) {
        var m = tok.match(/^([^:\s]+):(-?\d*\.?\d+),(-?\d*\.?\d+)$/);
        if (!m) throw new Error('Graphe ' + G.id + ' : sommet mal écrit "' + tok + '"');
        if (G.pos[m[1]]) throw new Error('Graphe ' + G.id + ' : sommet en double "' + m[1] + '"');
        G.sommets.push(m[1]);
        G.pos[m[1]] = [Number(m[2]), Number(m[3])];
      });
    } else {
      Object.keys(brutsSommets).forEach(function (k) {
        G.sommets.push(k);
        G.pos[k] = brutsSommets[k].slice(0, 2).map(Number);
      });
    }
    if (!G.sommets.length) throw new Error('Graphe ' + G.id + ' : aucun sommet');

    G.sommets.forEach(function (x) { G.succ[x] = []; G.pred[x] = []; G.voisins[x] = []; });

    var compteur = {};
    (def.aretes || '').trim().split(/\s+/).filter(Boolean).forEach(function (tok, rang) {
      var m = tok.match(RE_ARETE);
      if (!m) throw new Error('Graphe ' + G.id + ' : arête mal écrite "' + tok + '"');
      var u = m[1], v = m[3], fleche = m[2] === '>';
      if (fleche !== G.oriente) throw new Error('Graphe ' + G.id + ' : "' + tok + '" utilise ' + (fleche ? '>' : '-') + ' dans un graphe ' + (G.oriente ? 'orienté' : 'non orienté'));
      if (!G.pos[u] || !G.pos[v]) throw new Error('Graphe ' + G.id + ' : "' + tok + '" relie un sommet inconnu');
      var base = u + (fleche ? '>' : '-') + v;
      compteur[base] = (compteur[base] || 0) + 1;
      var a = {
        id: compteur[base] > 1 ? base + '#' + compteur[base] : base,
        u: u, v: v,
        w: m[4] !== undefined ? Number(m[4].replace(',', '.')) : null,
        bend: m[5] !== undefined ? Number(m[5]) : null,
        lt: m[6] !== undefined ? Number(m[6]) : null,
        rang: rang
      };
      if (a.w !== null) G.pondere = true;
      G.aretes.push(a);
      G.succ[u].push(v);
      G.pred[v].push(u);
      if (!G.oriente) { G.succ[v].push(u); G.pred[u].push(v); }
      if (!G.parCle[u + '>' + v]) G.parCle[u + '>' + v] = a.id;
      if (!G.oriente && !G.parCle[v + '>' + u]) G.parCle[v + '>' + u] = a.id;
    });

    if (def.ordre) {
      G.ordre = def.ordre.trim().split(/\s+/);
      G.ordre.forEach(function (x) { if (!G.pos[x]) throw new Error('Graphe ' + G.id + ' : ordre avec sommet inconnu "' + x + '"'); });
    }

    G.sommets = trier(G.sommets, G.ordre);
    G.sommets.forEach(function (x) {
      G.succ[x] = trier(unique(G.succ[x]), G.ordre);
      G.pred[x] = trier(unique(G.pred[x]), G.ordre);
      G.voisins[x] = trier(unique(G.succ[x].concat(G.pred[x])), G.ordre);
    });
    G.parId = {};
    G.aretes.forEach(function (a) { G.parId[a.id] = a; });

    // Réseau de transport : flot initial 's>A:2 s>D:3' (0 sur les arcs absents), capacités = poids.
    if (def.flot !== undefined) {
      if (!G.oriente) throw new Error('Graphe ' + G.id + ' : un réseau de transport doit être orienté');
      G.flot = {};
      G.aretes.forEach(function (a) {
        if (a.w === null || a.w < 0) throw new Error('Graphe ' + G.id + ' : capacité absente ou négative sur ' + a.id);
        G.flot[a.id] = 0;
      });
      String(def.flot).trim().split(/\s+/).filter(Boolean).forEach(function (tok) {
        var m = tok.match(/^(.+):(-?\d+(?:\.\d+)?)$/);
        if (!m || !G.parId[m[1]]) throw new Error('Graphe ' + G.id + ' : flux mal écrit "' + tok + '"');
        G.flot[m[1]] = Number(m[2]);
      });
      G.source = def.source || G.sommets.filter(function (x) { return !G.pred[x].length; })[0];
      G.puits = def.puits || G.sommets.filter(function (x) { return !G.succ[x].length; })[0];
      if (!G.source || !G.puits) throw new Error('Graphe ' + G.id + ' : entrée ou sortie introuvable');
    }
    return G;
  }

  function areteEntre(G, x, y) {
    return G.parCle[x + '>' + y] || null;
  }

  function nom(G, x) {
    return G.lab[x] !== undefined ? G.lab[x] : x;
  }

  function degres(G) {
    var r = {};
    G.sommets.forEach(function (x) { r[x] = { plus: 0, moins: 0, total: 0 }; });
    G.aretes.forEach(function (a) {
      if (G.oriente) {
        r[a.u].plus++; r[a.v].moins++;
        r[a.u].total++; r[a.v].total++;
      } else {
        r[a.u].total++; r[a.v].total++;
      }
    });
    return r;
  }

  /* ============================================================ Accessibilité */

  function atteignables(G, x, sens) {
    var liste = sens === 'pred' ? G.pred : G.succ;
    var vu = {}; vu[x] = true;
    var file = [x], res = [x];
    while (file.length) {
      var s = file.shift();
      liste[s].forEach(function (y) {
        if (!vu[y]) { vu[y] = true; res.push(y); file.push(y); }
      });
    }
    return trier(res, G.ordre);
  }

  function descendants(G, x) { return atteignables(G, x, 'succ'); }
  function ascendants(G, x) { return atteignables(G, x, 'pred'); }

  /* Composantes fortement connexes par D(x) ∩ A(x) (propriété du cours). */
  function cfc(G) {
    var place = {}, comps = [];
    G.sommets.forEach(function (x) {
      if (place[x]) return;
      var d = descendants(G, x), a = {};
      ascendants(G, x).forEach(function (y) { a[y] = true; });
      var c = d.filter(function (y) { return a[y]; });
      c.forEach(function (y) { place[y] = true; });
      comps.push(trier(c, G.ordre));
    });
    return comps;
  }

  /* Composantes connexes (orientation ignorée). */
  function composantesConnexes(G) {
    var vu = {}, comps = [];
    G.sommets.forEach(function (x) {
      if (vu[x]) return;
      var c = [x], file = [x];
      vu[x] = true;
      while (file.length) {
        var s = file.shift();
        G.voisins[s].forEach(function (y) { if (!vu[y]) { vu[y] = true; c.push(y); file.push(y); } });
      }
      comps.push(trier(c, G.ordre));
    });
    return comps;
  }

  function estConnexe(G) { return composantesConnexes(G).length === 1; }

  /* Graphe réduit : un sommet par composante f-connexe. */
  function reduit(G, comps) {
    comps = comps || cfc(G);
    var compDe = {};
    comps.forEach(function (c, i) { c.forEach(function (x) { compDe[x] = i; }); });
    var arcs = {}, liste = [];
    G.aretes.forEach(function (a) {
      var i = compDe[a.u], j = compDe[a.v];
      if (i === j) return;
      var cle = i + '>' + j;
      if (!arcs[cle]) { arcs[cle] = true; liste.push([i, j]); }
    });
    return { comps: comps, compDe: compDe, arcs: liste };
  }

  /* Nombre minimal d'arcs à ajouter pour rendre le graphe f-connexe : max(sources, puits) du graphe réduit. */
  function arcsPourFConnexe(G) {
    var r = reduit(G);
    if (r.comps.length === 1) return { minimum: 0, sources: [], puits: [] };
    var entree = r.comps.map(function () { return 0; }), sortie = r.comps.map(function () { return 0; });
    r.arcs.forEach(function (p) { sortie[p[0]]++; entree[p[1]]++; });
    var sources = [], puits = [];
    r.comps.forEach(function (c, i) {
      if (!entree[i]) sources.push(c);
      if (!sortie[i]) puits.push(c);
    });
    return { minimum: Math.max(sources.length, puits.length), sources: sources, puits: puits };
  }

  /* Partition en niveaux (méthode du cours, via les prédécesseurs). */
  function partitionNiveaux(G) {
    var restants = {}, n = 0;
    G.sommets.forEach(function (x) { restants[x] = true; n++; });
    var niveaux = [];
    while (n > 0) {
      var N = G.sommets.filter(function (x) {
        return restants[x] && G.pred[x].every(function (p) { return !restants[p]; });
      });
      if (!N.length) break;
      N.forEach(function (x) { delete restants[x]; n--; });
      niveaux.push(N);
    }
    var reste = G.sommets.filter(function (x) { return restants[x]; });
    return { niveaux: niveaux, reste: reste, sansCircuit: reste.length === 0 };
  }

  /* Un circuit parmi des sommets qui ont tous un prédécesseur dans l'ensemble. */
  function trouverCircuit(G, ensembleSommets) {
    var dans = {};
    ensembleSommets.forEach(function (x) { dans[x] = true; });
    if (!ensembleSommets.length) return [];
    var x = ensembleSommets[0], chemin = [], pos = {};
    while (pos[x] === undefined) {
      pos[x] = chemin.length;
      chemin.push(x);
      var p = G.pred[x].filter(function (y) { return dans[y]; });
      if (!p.length) return [];
      x = p[0];
    }
    return chemin.slice(pos[x]).reverse();
  }

  function fermetureTransitive(G) {
    var M = {};
    G.sommets.forEach(function (x) {
      M[x] = {};
      var vu = {}, file = G.succ[x].slice();
      file.forEach(function (y) { vu[y] = true; });
      while (file.length) {
        var s = file.shift();
        G.succ[s].forEach(function (y) { if (!vu[y]) { vu[y] = true; file.push(y); } });
      }
      G.sommets.forEach(function (y) { M[x][y] = vu[y] ? 1 : 0; });
    });
    return M;
  }

  /* ============================================================ Non orienté */

  function adjacents(G, x, y) {
    return G.voisins[x].indexOf(y) !== -1;
  }

  function cliqueMax(G) {
    var meilleure = [];
    function bk(R, P, X) {
      if (!P.length && !X.length) {
        if (R.length > meilleure.length) meilleure = R.slice();
        return;
      }
      if (R.length + P.length <= meilleure.length) return;
      P.slice().forEach(function (v) {
        var Nv = G.voisins[v].filter(function (y) { return y !== v; });
        bk(R.concat([v]), P.filter(function (y) { return Nv.indexOf(y) !== -1; }), X.filter(function (y) { return Nv.indexOf(y) !== -1; }));
        P = P.filter(function (y) { return y !== v; });
        X = X.concat([v]);
      });
    }
    bk([], G.sommets.slice(), []);
    return trier(meilleure, G.ordre);
  }

  function stableMax(G) {
    var meilleur = [];
    var S = G.sommets;
    function rec(i, courant) {
      if (courant.length + (S.length - i) <= meilleur.length) return;
      if (i === S.length) { meilleur = courant.slice(); return; }
      var x = S[i];
      if (G.voisins[x].indexOf(x) === -1 && courant.every(function (y) { return !adjacents(G, x, y); })) {
        rec(i + 1, courant.concat([x]));
      }
      rec(i + 1, courant);
    }
    rec(0, []);
    return trier(meilleur, G.ordre);
  }

  function colorationValide(G, couleurs) {
    for (var i = 0; i < G.aretes.length; i++) {
      var a = G.aretes[i];
      if (couleurs[a.u] === undefined || couleurs[a.v] === undefined) return { ok: false, raison: 'sommet sans couleur' };
      if (couleurs[a.u] === couleurs[a.v]) return { ok: false, raison: a.u + ' et ' + a.v + ' ont la même couleur' };
    }
    var manquant = G.sommets.filter(function (x) { return couleurs[x] === undefined; });
    if (manquant.length) return { ok: false, raison: 'sans couleur : ' + manquant.join(', ') };
    return { ok: true };
  }

  function nombreChromatique(G) {
    var S = G.sommets.slice().sort(function (a, b) { return G.voisins[b].length - G.voisins[a].length || comparer(a, b); });
    if (G.aretes.some(function (a) { return a.u === a.v; })) return Infinity;
    for (var k = 1; k <= S.length; k++) {
      var col = {};
      var ok = (function essai(i) {
        if (i === S.length) return true;
        var x = S[i];
        for (var c = 1; c <= k; c++) {
          if (G.voisins[x].every(function (y) { return col[y] !== c; })) {
            col[x] = c;
            if (essai(i + 1)) return true;
            delete col[x];
          }
        }
        return false;
      })(0);
      if (ok) return k;
    }
    return S.length;
  }

  /* Nombre d'arbres couvrants (théorème de Kirchhoff, déterminant exact par Bareiss). */
  function nombreArbresCouvrants(G) {
    var S = G.sommets, n = S.length;
    if (n === 1) return 1;
    var idx = {};
    S.forEach(function (x, i) { idx[x] = i; });
    var L = [];
    for (var i = 0; i < n; i++) { L.push([]); for (var j = 0; j < n; j++) L[i].push(0n); }
    G.aretes.forEach(function (a) {
      if (a.u === a.v) return;
      var i = idx[a.u], j = idx[a.v];
      L[i][i] += 1n; L[j][j] += 1n; L[i][j] -= 1n; L[j][i] -= 1n;
    });
    var M = L.slice(1).map(function (ligne) { return ligne.slice(1); });
    var m = n - 1, prec = 1n, signe = 1n;
    for (var k = 0; k < m - 1; k++) {
      if (M[k][k] === 0n) {
        var p = k + 1;
        while (p < m && M[p][k] === 0n) p++;
        if (p === m) return 0;
        var t = M[k]; M[k] = M[p]; M[p] = t; signe = -signe;
      }
      for (var i2 = k + 1; i2 < m; i2++) {
        for (var j2 = k + 1; j2 < m; j2++) {
          M[i2][j2] = (M[i2][j2] * M[k][k] - M[i2][k] * M[k][j2]) / prec;
        }
      }
      prec = M[k][k];
    }
    return Number(signe * M[m - 1][m - 1]);
  }

  function euler(G) {
    var d = degres(G);
    var impairs = G.sommets.filter(function (x) { return d[x].total % 2 === 1; });
    var actifs = G.sommets.filter(function (x) { return d[x].total > 0; });
    var connexe = true;
    if (actifs.length) {
      var vu = {}, file = [actifs[0]];
      vu[actifs[0]] = true;
      while (file.length) {
        var s = file.shift();
        G.voisins[s].forEach(function (y) { if (!vu[y]) { vu[y] = true; file.push(y); } });
      }
      connexe = actifs.every(function (x) { return vu[x]; });
    }
    var type = !connexe ? 'aucun' : impairs.length === 0 ? 'cycle' : impairs.length === 2 ? 'chaine' : 'aucun';
    return { impairs: impairs, connexe: connexe, type: type, degres: d };
  }

  /* Tracé eulérien (Hierholzer) : suite de sommets et d'arêtes. */
  function traceEulerien(G, depart) {
    var e = euler(G);
    if (e.type === 'aucun') return null;
    var libre = {};
    G.aretes.forEach(function (a) { libre[a.id] = true; });
    var incid = {};
    G.sommets.forEach(function (x) { incid[x] = []; });
    G.aretes.forEach(function (a) { incid[a.u].push(a); if (a.v !== a.u) incid[a.v].push(a); });
    var s0 = depart || (e.type === 'chaine' ? e.impairs[0] : G.sommets.find(function (x) { return incid[x].length; }));
    var pile = [{ x: s0, a: null }], circuit = [];
    while (pile.length) {
      var haut = pile[pile.length - 1];
      var suivante = incid[haut.x].filter(function (a) { return libre[a.id]; }).sort(function (p, q) {
        var yp = p.u === haut.x ? p.v : p.u, yq = q.u === haut.x ? q.v : q.u;
        return comparer(yp, yq) || p.rang - q.rang;
      })[0];
      if (suivante) {
        libre[suivante.id] = false;
        pile.push({ x: suivante.u === haut.x ? suivante.v : suivante.u, a: suivante.id });
      } else {
        circuit.push(pile.pop());
      }
    }
    circuit.reverse();
    return { sommets: circuit.map(function (c) { return c.x; }), aretes: circuit.slice(1).map(function (c) { return c.a; }) };
  }

  /* Noyaux : stables absorbants (tout sommet hors du noyau a un successeur dedans). */
  function noyaux(G) {
    var S = G.sommets, n = S.length, res = [];
    if (n > 18) throw new Error('noyaux : graphe trop grand');
    for (var masque = 0; masque < (1 << n); masque++) {
      var N = S.filter(function (x, i) { return masque & (1 << i); });
      var dans = {};
      N.forEach(function (x) { dans[x] = true; });
      var stable = N.every(function (x) { return G.succ[x].every(function (y) { return !dans[y]; }); });
      if (!stable) continue;
      var absorbant = S.every(function (x) { return dans[x] || G.succ[x].some(function (y) { return dans[y]; }); });
      if (absorbant) res.push(N);
    }
    return res;
  }

  /* ============================================================ Arbres couvrants */

  function unionFind(S) {
    var p = {};
    S.forEach(function (x) { p[x] = x; });
    function f(x) { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; }
    return { trouver: f, unir: function (a, b) { p[f(a)] = f(b); } };
  }

  function cheminDansForet(aretesChoisies, G, a, b) {
    var adj = {};
    G.sommets.forEach(function (x) { adj[x] = []; });
    aretesChoisies.forEach(function (id) {
      var e = G.parId[id];
      adj[e.u].push({ y: e.v, id: id });
      adj[e.v].push({ y: e.u, id: id });
    });
    var prec = {}; prec[a] = null;
    var file = [a];
    while (file.length) {
      var s = file.shift();
      if (s === b) break;
      adj[s].forEach(function (t) { if (prec[t.y] === undefined) { prec[t.y] = { x: s, id: t.id }; file.push(t.y); } });
    }
    if (prec[b] === undefined) return null;
    var ids = [], sommets = [b], x = b;
    while (prec[x]) { ids.push(prec[x].id); x = prec[x].x; sommets.push(x); }
    return { aretes: ids, sommets: sommets.reverse() };
  }

  function trierAretes(G, decroissant) {
    return G.aretes.slice().sort(function (a, b) { return (decroissant ? b.w - a.w : a.w - b.w) || a.rang - b.rang; });
  }

  function acpmPoids(G) {
    var uf = unionFind(G.sommets), total = 0, choisies = [];
    trierAretes(G).forEach(function (a) {
      if (uf.trouver(a.u) !== uf.trouver(a.v)) { uf.unir(a.u, a.v); total += a.w; choisies.push(a.id); }
    });
    return { poids: total, aretes: choisies, couvrant: choisies.length === G.sommets.length - 1 };
  }

  /* Nombre d'ACPM distincts (énumération, graphes de taille d'examen). */
  function nombreACPM(G) {
    var min = acpmPoids(G).poids, n = G.sommets.length, E = G.aretes, compte = 0;
    if (E.length > 22) throw new Error('nombreACPM : trop d\'arêtes');
    (function rec(i, choix, poids) {
      if (poids > min + 1e-9) return;
      if (choix.length === n - 1) {
        var uf = unionFind(G.sommets);
        for (var k = 0; k < choix.length; k++) {
          var a = choix[k];
          if (uf.trouver(a.u) === uf.trouver(a.v)) return;
          uf.unir(a.u, a.v);
        }
        if (Math.abs(poids - min) < 1e-9) compte++;
        return;
      }
      if (i === E.length || choix.length + (E.length - i) < n - 1) return;
      rec(i + 1, choix.concat([E[i]]), poids + E[i].w);
      rec(i + 1, choix, poids);
    })(0, [], 0);
    return compte;
  }

  /* ======================================================= Étapes : outils */

  function Etat(G) {
    this.G = G;
    this.s = {};
    this.a = {};
    this.etapes = [];
  }
  Etat.prototype.sommet = function (x, o) { this.s[x] = Object.assign({}, this.s[x] || {}, o); };
  Etat.prototype.arete = function (id, etat) { if (id) this.a[id] = etat; };
  Etat.prototype.capture = function (texte, panneaux, extra) {
    var copieS = {}, copieA = {}, self = this;
    Object.keys(this.s).forEach(function (k) { copieS[k] = Object.assign({}, self.s[k]); });
    Object.keys(this.a).forEach(function (k) { copieA[k] = self.a[k]; });
    var e = { texte: texte, sommets: copieS, aretes: copieA, panneaux: panneaux || [] };
    if (this.labels) e.labels = Object.assign({}, this.labels);
    this.etapes.push(Object.assign(e, extra || {}));
  };

  function puces(titre, items, vide) {
    return { type: 'puces', titre: titre, items: items, vide: vide || 'vide' };
  }

  function tableau(titre, cols, lignes, extra) {
    return Object.assign({ type: 'table', titre: titre, cols: cols, lignes: lignes }, extra || {});
  }

  function note(titre, txt) {
    return { type: 'note', titre: titre, txt: txt };
  }

  /* ================================================== Parcours en profondeur */

  /*
   * opts : depart (sommet de départ), recommencer (true par défaut), sens ('succ' ou 'pred'),
   *        ordreDeparts (liste imposée pour les relances), phase (préfixe de texte).
   */
  function traceProfondeur(G, opts) {
    opts = opts || {};
    var voisinsDe = opts.sens === 'pred' ? G.pred : G.succ;
    var ordreRelance = opts.ordreDeparts || G.sommets;
    var departs = opts.depart ? [opts.depart].concat(opts.recommencer === false ? [] : ordreRelance) : ordreRelance;
    var t = 0, d = {}, f = {}, parent = {}, evts = [], arbres = [];
    departs.forEach(function (r) {
      if (d[r] !== undefined) return;
      var arbre = [r];
      arbres.push(arbre);
      evts.push({ type: arbres.length === 1 ? 'depart' : 'relance', x: r });
      d[r] = ++t;
      evts.push({ type: 'decouverte', x: r, t: t, racine: true });
      var pile = [{ x: r, i: 0 }];
      while (pile.length) {
        var haut = pile[pile.length - 1];
        var vs = voisinsDe[haut.x];
        if (haut.i < vs.length) {
          var y = vs[haut.i++];
          var idA = opts.sens === 'pred' ? areteEntre(G, y, haut.x) : areteEntre(G, haut.x, y);
          if (d[y] === undefined) {
            parent[y] = haut.x;
            d[y] = ++t;
            arbre.push(y);
            evts.push({ type: 'descente', x: haut.x, y: y, arete: idA });
            evts.push({ type: 'decouverte', x: y, t: t });
            pile.push({ x: y, i: 0 });
          } else {
            evts.push({ type: 'dejaVu', x: haut.x, y: y, arete: idA, fini: f[y] !== undefined });
          }
        } else {
          f[haut.x] = ++t;
          evts.push({ type: 'fin', x: haut.x, t: t });
          pile.pop();
        }
      }
    });
    var prefixe = G.sommets.slice().filter(function (x) { return d[x] !== undefined; }).sort(function (a, b) { return d[a] - d[b]; });
    var suffixe = prefixe.slice().sort(function (a, b) { return f[a] - f[b]; });
    return { d: d, f: f, parent: parent, evts: evts, arbres: arbres, prefixe: prefixe, suffixe: suffixe };
  }

  function etapesProfondeur(G, opts, trace, E, contexte) {
    opts = opts || {};
    contexte = contexte || {};
    var enPred = opts.sens === 'pred';
    var pile = [];
    var dates = {};
    var fleche = enPred ? '\\leftarrow' : '\\to';
    var mot = enPred ? 'prédécesseurs' : G.oriente ? 'successeurs' : 'voisins';
    var Mot = enPred ? 'Prédécesseur ' : G.oriente ? 'Successeur ' : 'Voisin ';
    function panneauxDFS() {
      var lignesDates = [
        ['$d(x)$'].concat(G.sommets.map(function (x) { return dates[x] && dates[x].d ? String(dates[x].d) : ''; })),
        ['$f(x)$'].concat(G.sommets.map(function (x) { return dates[x] && dates[x].f ? String(dates[x].f) : ''; }))
      ];
      var p = [
        puces(enPred ? 'Pile (on remonte les arcs)' : 'Pile (chemin en cours)', pile.map(function (x, i) { return { txt: nom(G, x), etat: i === pile.length - 1 ? 'haut' : '' }; }), 'vide'),
        tableau('Dates de pré-visite et post-visite', ['$x$'].concat(G.sommets.map(function (x) { return nom(G, x); })), lignesDates, { compact: true })
      ];
      return (contexte.panneauxAvant || []).concat(p, contexte.panneauxApres ? contexte.panneauxApres() : []);
    }
    trace.evts.forEach(function (ev) {
      var X = ev.x !== undefined ? '$' + texId(nom(G, ev.x)) + '$' : '';
      var Y = ev.y !== undefined ? '$' + texId(nom(G, ev.y)) + '$' : '';
      switch (ev.type) {
        case 'depart':
          E.capture((contexte.prefixe || '') + 'Départ depuis ' + X + '. ' + (enPred ? 'On suit les arcs à l\'envers (prédécesseurs).' : 'On examine les ' + mot + ' dans l\'ordre imposé (croissant ou alphabétique).'), panneauxDFS());
          break;
        case 'relance':
          E.capture((contexte.prefixe || '') + 'Tous les sommets atteignables sont terminés. ' + X + ' n\'est pas encore atteint : on relance un parcours depuis lui (premier sommet non atteint dans l\'ordre).', panneauxDFS(), { relance: true });
          break;
        case 'decouverte':
          dates[ev.x] = { d: ev.t };
          pile.push(ev.x);
          E.sommet(ev.x, { etat: 'courant', note: ev.t + '/' });
          if (contexte.couleurArbre) E.sommet(ev.x, { couleur: contexte.couleurArbre() });
          pile.slice(0, -1).forEach(function (z) { E.sommet(z, { etat: 'pile' }); });
          E.capture('On découvre ' + X + ' : date de pré-visite $d(' + texId(nom(G, ev.x)) + ') = ' + ev.t + '$.', panneauxDFS());
          break;
        case 'descente':
          E.arete(ev.arete, 'examen');
          E.capture(enPred
            ? 'Prédécesseur ' + Y + ' de ' + X + ' (arc $' + texId(nom(G, ev.y)) + ' \\to ' + texId(nom(G, ev.x)) + '$) : pas encore visité, on y va.'
            : Mot + Y + ' de ' + X + ' : pas encore visité, on descend (' + (G.oriente ? 'arc' : 'arête') + ' $' + texId(nom(G, ev.x)) + (G.oriente ? fleche : ' - ') + texId(nom(G, ev.y)) + '$).', panneauxDFS());
          E.arete(ev.arete, 'arbre');
          break;
        case 'dejaVu':
          var avant = E.a[ev.arete];
          E.arete(ev.arete, 'refus');
          E.capture(Mot + Y + ' de ' + X + ' : déjà visité, on l\'ignore.', panneauxDFS());
          E.arete(ev.arete, avant === 'arbre' ? 'arbre' : 'ignore');
          break;
        case 'fin':
          dates[ev.x].f = ev.t;
          pile.pop();
          E.sommet(ev.x, { etat: 'fini', note: dates[ev.x].d + '/' + ev.t });
          if (pile.length) E.sommet(pile[pile.length - 1], { etat: 'courant' });
          E.capture('Tous les ' + mot + ' de ' + X + ' sont vus : fin de ' + X + ', date de post-visite $f(' + texId(nom(G, ev.x)) + ') = ' + ev.t + '$.' + (pile.length ? ' On remonte à $' + texId(nom(G, pile[pile.length - 1])) + '$.' : ''), panneauxDFS());
          break;
      }
    });
    return dates;
  }

  function profondeur(G, opts) {
    opts = opts || {};
    var depart = opts.depart || G.sommets[0];
    var trace = traceProfondeur(G, { depart: depart, recommencer: opts.recommencer !== false });
    var E = new Etat(G);
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    etapesProfondeur(G, {}, trace, E);
    var ordre = trace.prefixe.map(function (x) { return nom(G, x); }).join(', ');
    G.sommets.forEach(function (x) { E.sommet(x, { etat: trace.d[x] !== undefined ? 'fini' : 'neutre' }); });
    G.aretes.forEach(function (a) { if (E.a[a.id] !== 'arbre') E.arete(a.id, 'attenue'); });
    E.capture('Parcours terminé. Ordre de découverte : ' + ordre + '. Les arcs en couleur forment ' + (trace.arbres.length > 1 ? 'la forêt' : 'l\'arborescence') + ' du parcours.', E.etapes.length ? E.etapes[E.etapes.length - 1].panneaux : []);
    return { etapes: E.etapes, resultat: trace };
  }

  /* ==================================================== Parcours en largeur */

  function largeur(G, opts) {
    opts = opts || {};
    var i0 = opts.depart || G.sommets[0];
    var ouvert = [i0], ferme = [], pere = {}, ordre = [], arbre = [];
    var E = new Etat(G);
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    E.sommet(i0, { etat: 'attente' });
    function panneaux(courant) {
      return [
        puces('OUVERT (file : on sort par la gauche)', ouvert.map(function (x) { return { txt: nom(G, x), etat: x === courant ? 'haut' : '' }; }), 'vide'),
        puces('FERMÉ (sommets traités)', ferme.map(function (x) { return { txt: nom(G, x) }; }), 'vide')
      ];
    }
    E.capture('Initialisation : OUVERT = (' + nom(G, i0) + '), FERMÉ = ().', panneaux());
    var rang = 0;
    while (ouvert.length) {
      var i = ouvert[0];
      var X = '$' + texId(nom(G, i)) + '$';
      if (ferme.indexOf(i) === -1) {
        var ajoutes = [], dejaOuvert = [], dejaFerme = [];
        G.succ[i].forEach(function (y) {
          if (ferme.indexOf(y) !== -1 || y === i) { dejaFerme.push(y); return; }
          if (ouvert.indexOf(y) !== -1) { dejaOuvert.push(y); return; }
          ouvert.push(y);
          pere[y] = i;
          ajoutes.push(y);
          arbre.push(areteEntre(G, i, y));
        });
        rang++;
        ordre.push(i);
        E.sommet(i, { etat: 'courant', note: String(rang) });
        ajoutes.forEach(function (y) { E.sommet(y, { etat: 'attente' }); E.arete(areteEntre(G, i, y), 'arbre'); });
        var morceaux = [];
        if (ajoutes.length) morceaux.push('on ajoute en fin d\'OUVERT ' + ajoutes.map(function (y) { return '$' + texId(nom(G, y)) + '$'; }).join(', ') + ' (père : ' + X + ')');
        if (dejaOuvert.length) morceaux.push(dejaOuvert.map(function (y) { return '$' + texId(nom(G, y)) + '$'; }).join(', ') + ' déjà dans OUVERT');
        if (dejaFerme.length) morceaux.push(dejaFerme.map(function (y) { return '$' + texId(nom(G, y)) + '$'; }).join(', ') + ' déjà traité' + (dejaFerme.length > 1 ? 's' : ''));
        if (!G.succ[i].length) morceaux.push('aucun successeur');
        ouvert.shift();
        ferme.push(i);
        E.capture('On traite ' + X + ' (rang ' + rang + ') : ' + morceaux.join(', ') + '. Puis ' + X + ' passe dans FERMÉ.', panneaux());
        E.sommet(i, { etat: 'fini' });
      } else {
        ouvert.shift();
      }
    }
    G.aretes.forEach(function (a) { if (E.a[a.id] !== 'arbre') E.arete(a.id, 'attenue'); });
    var nonAtteints = G.sommets.filter(function (x) { return ferme.indexOf(x) === -1; });
    E.capture('OUVERT est vide : fin. Ordre de traitement : ' + ordre.map(function (x) { return nom(G, x); }).join(', ') + '.' + (nonAtteints.length ? ' Non atteints depuis ' + nom(G, i0) + ' : ' + nonAtteints.map(function (x) { return nom(G, x); }).join(', ') + '.' : ''), panneaux());
    return { etapes: E.etapes, resultat: { ordre: ordre, pere: pere, arbre: arbre, nonAtteints: nonAtteints } };
  }

  /* ================================================================ Kosaraju */

  function kosaraju(G, opts) {
    opts = opts || {};
    var E = new Etat(G);
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    var t1 = traceProfondeur(G, { depart: opts.depart || G.sommets[0], recommencer: true });
    etapesProfondeur(G, {}, t1, E, { prefixe: 'Étape 1, parcours en profondeur sur $G$. ' });
    var ordre = G.sommets.slice().sort(function (a, b) { return t1.f[b] - t1.f[a]; });
    var listeOrdre = ordre.map(function (x) { return nom(G, x); }).join(', ');
    G.aretes.forEach(function (a) { E.arete(a.id, 'neutre'); });
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: String(t1.f[x]) }); });
    var pOrdre = puces('Ordre des post-visites décroissantes', ordre.map(function (x) { return { txt: nom(G, x) + ' (' + t1.f[x] + ')' }; }));
    E.capture('Fin de l\'étape 1. On classe les sommets par date de post-visite décroissante : ' + listeOrdre + '.', [pOrdre]);

    var t2 = traceProfondeur(G, { sens: 'pred', ordreDeparts: ordre, recommencer: true });
    var numComp = 0;
    var compsTexte = [];
    function pComps() {
      return puces('Composantes f-connexes trouvées', compsTexte.map(function (c, i) { return { txt: c, couleur: i + 1 }; }), 'aucune pour l\'instant');
    }
    var evts2 = t2.evts;
    var decoupe = [];
    evts2.forEach(function (ev) {
      if (ev.type === 'depart' || ev.type === 'relance') decoupe.push([]);
      decoupe[decoupe.length - 1].push(ev);
    });
    decoupe.forEach(function (bloc) {
      numComp++;
      var racineX = bloc[0].x;
      E.capture('Étape 2. Premier sommet non visité dans l\'ordre ' + listeOrdre + ' : $' + texId(nom(G, racineX)) + '$. On lance un parcours en profondeur qui remonte les arcs (prédécesseurs).', [pOrdre, pComps()]);
      var sousTrace = { evts: bloc.slice(1) };
      var membres = [];
      sousTrace.evts.forEach(function (ev) {
        var X = '$' + texId(nom(G, ev.x)) + '$';
        var Y = ev.y !== undefined ? '$' + texId(nom(G, ev.y)) + '$' : '';
        if (ev.type === 'decouverte') {
          membres.push(ev.x);
          E.sommet(ev.x, { etat: 'courant', couleur: numComp });
          E.capture(X + ' rejoint la composante n° ' + numComp + '.', [pOrdre, pComps()]);
          E.sommet(ev.x, { etat: 'fini' });
        } else if (ev.type === 'descente') {
          E.arete(ev.arete, 'arbre');
          E.capture('Arc $' + texId(nom(G, ev.y)) + ' \\to ' + texId(nom(G, ev.x)) + '$ : ' + Y + ' est un prédécesseur de ' + X + ' pas encore visité.', [pOrdre, pComps()]);
        } else if (ev.type === 'dejaVu') {
          var avant = E.a[ev.arete];
          E.arete(ev.arete, 'refus');
          E.capture('Arc $' + texId(nom(G, ev.y)) + ' \\to ' + texId(nom(G, ev.x)) + '$ : ' + Y + ' est déjà visité, on l\'ignore.', [pOrdre, pComps()]);
          E.arete(ev.arete, avant === 'arbre' ? 'arbre' : 'neutre');
        }
      });
      compsTexte.push('{' + trier(membres, G.ordre).map(function (x) { return nom(G, x); }).join(', ') + '}');
      E.capture('Le parcours depuis $' + texId(nom(G, racineX)) + '$ est terminé : composante n° ' + numComp + ' = ' + compsTexte[compsTexte.length - 1] + '.', [pOrdre, pComps()]);
    });
    var comps = t2.arbres.map(function (a) { return trier(a, G.ordre); });
    E.capture('Fin : ' + comps.length + ' composante' + (comps.length > 1 ? 's' : '') + ' fortement connexe' + (comps.length > 1 ? 's' : '') + ' : ' + compsTexte.join(', ') + '.', [pOrdre, pComps()]);
    return { etapes: E.etapes, resultat: { passe1: t1, ordre: ordre, comps: comps } };
  }

  /* ========================================================= Mise en niveaux */

  function niveaux(G) {
    var E = new Etat(G);
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    var places = {};
    function tablePred(courants) {
      courants = courants || [];
      return tableau('Dictionnaire des prédécesseurs, sommets placés barrés', ['$x$'].concat(G.sommets.map(function (x) { return nom(G, x); })), [
        ['$\\Gamma^-(x)$'].concat(G.sommets.map(function (x) {
          var preds = G.pred[x].map(function (p) { return places[p] !== undefined ? '~~' + nom(G, p) + '~~' : nom(G, p); });
          return preds.length ? preds.join(', ') : '(aucun)';
        })),
        ['niveau'].concat(G.sommets.map(function (x) { return places[x] !== undefined ? 'N' + places[x] : ''; }))
      ], { compact: true, colonnes: courants.map(function (x) { return G.sommets.indexOf(x) + 1; }) });
    }
    var res = partitionNiveaux(G);
    E.capture('On part du dictionnaire des prédécesseurs. Un sommet entre dans un niveau quand tous ses prédécesseurs sont déjà placés.', [tablePred()]);
    res.niveaux.forEach(function (N, k) {
      N.forEach(function (x) { E.sommet(x, { etat: 'courant', note: 'N' + k }); });
      var txt = k === 0
        ? 'Niveau 0 : les sources (aucun prédécesseur) : ' + N.map(function (x) { return nom(G, x); }).join(', ') + '.'
        : 'Niveau ' + k + ' : sommets dont tous les prédécesseurs sont dans les niveaux 0 à ' + (k - 1) + ' : ' + N.map(function (x) { return nom(G, x); }).join(', ') + '.';
      E.capture(txt, [tablePred(N)]);
      N.forEach(function (x) { places[x] = k; E.sommet(x, { etat: 'retire' }); });
      G.aretes.forEach(function (a) { if (places[a.u] !== undefined) E.arete(a.id, 'attenue'); });
    });
    if (res.reste.length) {
      var circuit = trouverCircuit(G, res.reste);
      res.reste.forEach(function (x) { E.sommet(x, { etat: 'bloque' }); });
      for (var i = 0; i < circuit.length; i++) {
        var a = areteEntre(G, circuit[i], circuit[(i + 1) % circuit.length]);
        E.arete(a, 'cycle');
      }
      E.capture('Blocage : les sommets restants ' + res.reste.map(function (x) { return nom(G, x); }).join(', ') + ' ont tous encore un prédécesseur non placé. Le graphe contient donc un circuit, par exemple ' + circuit.concat([circuit[0]]).map(function (x) { return nom(G, x); }).join(' → ') + '. Mise en niveaux impossible.', [tablePred()]);
    } else {
      G.sommets.forEach(function (x) { E.sommet(x, { etat: 'fini' }); });
      G.aretes.forEach(function (a) { E.arete(a.id, 'neutre'); });
      E.capture('Tous les sommets sont placés : ' + res.niveaux.length + ' niveaux (N0 à N' + (res.niveaux.length - 1) + '). Le graphe est sans circuit.', [tablePred(), puces('Niveaux', res.niveaux.map(function (N, k) { return { txt: 'N' + k + ' = {' + N.map(function (x) { return nom(G, x); }).join(', ') + '}' }; }))], { vueNiveaux: true });
    }
    return { etapes: E.etapes, resultat: res };
  }

  /* ================================================================= Kruskal */

  function kruskal(G, opts) {
    opts = opts || {};
    var E = new Etat(G);
    var n = G.sommets.length;
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    var triees = trierAretes(G, false);
    var statut = {};
    var uf = unionFind(G.sommets);
    var choisies = [], total = 0;
    function lignes(courante) {
      return triees.map(function (a) {
        var s = statut[a.id];
        return [nom(G, a.u) + '-' + nom(G, a.v), String(a.w), s === 'ok' ? 'gardée' : s === 'non' ? 'rejetée (cycle)' : s === 'inutile' ? 'non examinée' : a.id === courante ? 'examen...' : ''];
      });
    }
    function panneaux(courante) {
      return [
        tableau('Arêtes triées par poids croissant', ['Arête', 'Poids', 'Décision'], lignes(courante), { surligne: courante ? [triees.findIndex(function (a) { return a.id === courante; })] : [] }),
        note('Poids de l\'arbre', total + ' (' + choisies.length + '/' + (n - 1) + ' arêtes)')
      ];
    }
    E.capture('On trie les arêtes par poids croissant, puis on les examine une par une. Il faudra garder $n - 1 = ' + (n - 1) + '$ arêtes.', panneaux());
    for (var i = 0; i < triees.length; i++) {
      var a = triees[i];
      var lib = '$' + texId(nom(G, a.u)) + ' - ' + texId(nom(G, a.v)) + '$ (poids ' + a.w + ')';
      if (choisies.length === n - 1) {
        for (var j = i; j < triees.length; j++) statut[triees[j].id] = 'inutile';
        break;
      }
      E.arete(a.id, 'examen');
      if (uf.trouver(a.u) !== uf.trouver(a.v)) {
        uf.unir(a.u, a.v);
        choisies.push(a.id);
        total += a.w;
        statut[a.id] = 'ok';
        E.arete(a.id, 'arbre');
        E.sommet(a.u, { etat: 'fini' });
        E.sommet(a.v, { etat: 'fini' });
        E.capture('Arête ' + lib + ' : ses extrémités ne sont pas encore reliées, elle ne crée pas de cycle. On la garde.', panneaux(a.id));
      } else {
        var ch = cheminDansForet(choisies, G, a.u, a.v);
        statut[a.id] = 'non';
        ch.aretes.forEach(function (id) { E.arete(id, 'cycleArbre'); });
        E.arete(a.id, 'rejet');
        E.capture('Arête ' + lib + ' : ' + nom(G, a.u) + ' et ' + nom(G, a.v) + ' sont déjà reliés par ' + ch.sommets.map(function (x) { return nom(G, x); }).join('-') + '. Elle fermerait un cycle : on la rejette.', panneaux(a.id));
        ch.aretes.forEach(function (id) { E.arete(id, 'arbre'); });
        E.arete(a.id, 'attenue');
      }
    }
    triees.forEach(function (a) { if (!statut[a.id]) statut[a.id] = 'inutile'; if (statut[a.id] === 'inutile') E.arete(a.id, 'attenue'); });
    var complet = choisies.length === n - 1;
    E.capture(complet
      ? 'On a ' + (n - 1) + ' arêtes : c\'est un arbre couvrant de poids minimum (ACPM), de poids total ' + total + '.'
      : 'Toutes les arêtes sont examinées mais il n\'y a que ' + choisies.length + ' arêtes : le graphe n\'est pas connexe, pas d\'arbre couvrant.', panneaux());
    return { etapes: E.etapes, resultat: { aretes: choisies, poids: total, couvrant: complet } };
  }

  function kruskalDecroissant(G) {
    var E = new Etat(G);
    var n = G.sommets.length;
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    var triees = trierAretes(G, true);
    var presentes = {};
    G.aretes.forEach(function (a) { presentes[a.id] = true; });
    var nbPresentes = G.aretes.length;
    var statut = {};
    function connexeSans(idRetire) {
      var adj = {};
      G.sommets.forEach(function (x) { adj[x] = []; });
      G.aretes.forEach(function (a) {
        if (!presentes[a.id] || a.id === idRetire) return;
        adj[a.u].push(a.v); adj[a.v].push(a.u);
      });
      var vu = {}, file = [G.sommets[0]];
      vu[G.sommets[0]] = true;
      while (file.length) {
        var s = file.shift();
        adj[s].forEach(function (y) { if (!vu[y]) { vu[y] = true; file.push(y); } });
      }
      return G.sommets.every(function (x) { return vu[x]; });
    }
    function panneaux(courante) {
      var total = 0;
      G.aretes.forEach(function (a) { if (presentes[a.id]) total += a.w; });
      return [
        tableau('Arêtes triées par poids décroissant', ['Arête', 'Poids', 'Décision'], triees.map(function (a) {
          var s = statut[a.id];
          return [nom(G, a.u) + '-' + nom(G, a.v), String(a.w), s === 'sup' ? 'supprimée' : s === 'garde' ? 'gardée (sinon on déconnecte)' : s === 'inutile' ? 'non examinée' : ''];
        }), { surligne: courante ? [triees.findIndex(function (a) { return a.id === courante; })] : [] }),
        note('Poids restant', total + ' (' + nbPresentes + ' arêtes, objectif ' + (n - 1) + ')')
      ];
    }
    E.capture('Kruskal décroissant : on examine les arêtes de la plus lourde à la plus légère et on supprime chaque arête dont le retrait laisse le graphe connexe.', panneaux());
    for (var i = 0; i < triees.length; i++) {
      var a = triees[i];
      if (nbPresentes === n - 1) {
        for (var j = i; j < triees.length; j++) statut[triees[j].id] = 'inutile';
        break;
      }
      var lib = '$' + texId(nom(G, a.u)) + ' - ' + texId(nom(G, a.v)) + '$ (poids ' + a.w + ')';
      E.arete(a.id, 'examen');
      if (connexeSans(a.id)) {
        presentes[a.id] = false;
        nbPresentes--;
        statut[a.id] = 'sup';
        E.arete(a.id, 'rejet');
        E.capture('Arête ' + lib + ' : sans elle, le graphe reste connexe (elle est sur un cycle). On la supprime.', panneaux(a.id));
        E.arete(a.id, 'efface');
      } else {
        statut[a.id] = 'garde';
        E.arete(a.id, 'arbre');
        E.capture('Arête ' + lib + ' : la retirer déconnecterait le graphe. On la garde.', panneaux(a.id));
      }
    }
    G.aretes.forEach(function (a) { if (presentes[a.id]) E.arete(a.id, 'arbre'); });
    var total = 0;
    G.aretes.forEach(function (a) { if (presentes[a.id]) total += a.w; });
    E.capture('Il reste ' + (n - 1) + ' arêtes, le graphe est connexe : c\'est un ACPM de poids ' + total + '.', panneaux());
    return { etapes: E.etapes, resultat: { aretes: G.aretes.filter(function (a) { return presentes[a.id]; }).map(function (a) { return a.id; }), poids: total } };
  }

  /* =================================================================== Prim */

  function prim(G, opts) {
    opts = opts || {};
    var E = new Etat(G);
    var x0 = opts.depart || G.sommets[0];
    var dans = {}; dans[x0] = true;
    var choisies = [], total = 0;
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    E.sommet(x0, { etat: 'fini' });
    function panneaux() {
      return [
        puces('Sommets déjà reliés', G.sommets.filter(function (x) { return dans[x]; }).map(function (x) { return { txt: nom(G, x) }; })),
        note('Poids de l\'arbre', String(total))
      ];
    }
    E.capture('Prim : on part de $' + texId(nom(G, x0)) + '$ et on fait grossir l\'arbre en ajoutant à chaque fois l\'arête la plus légère qui sort de l\'arbre.', panneaux());
    while (choisies.length < G.sommets.length - 1) {
      var candidates = G.aretes.filter(function (a) { return !!dans[a.u] !== !!dans[a.v]; });
      if (!candidates.length) break;
      candidates.sort(function (a, b) { return a.w - b.w || a.rang - b.rang; });
      var a = candidates[0];
      candidates.forEach(function (c) { E.arete(c.id, 'examen'); });
      E.arete(a.id, 'arbre');
      var nouveau = dans[a.u] ? a.v : a.u;
      dans[nouveau] = true;
      choisies.push(a.id);
      total += a.w;
      E.sommet(nouveau, { etat: 'courant' });
      E.capture('Arêtes candidates en pointillés. La plus légère est $' + texId(nom(G, a.u)) + ' - ' + texId(nom(G, a.v)) + '$ (poids ' + a.w + ') : on ajoute $' + texId(nom(G, nouveau)) + '$.', panneaux());
      candidates.forEach(function (c) { if (c.id !== a.id) E.arete(c.id, 'neutre'); });
      E.sommet(nouveau, { etat: 'fini' });
    }
    G.aretes.forEach(function (b) { if (choisies.indexOf(b.id) === -1) E.arete(b.id, 'attenue'); });
    E.capture('Arbre complet : ACPM de poids ' + total + '.', panneaux());
    return { etapes: E.etapes, resultat: { aretes: choisies, poids: total } };
  }

  /* ============================================================ Coloration */

  function ordreWelshPowell(G) {
    var d = degres(G);
    return G.sommets.slice().sort(function (a, b) { return d[b].total - d[a].total || comparer(a, b); });
  }

  function welshPowell(G) {
    var E = new Etat(G);
    var d = degres(G);
    var ordre = ordreWelshPowell(G);
    var couleur = {};
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: 'd=' + d[x].total }); });
    function panneaux(k) {
      return [
        tableau('Sommets par degré décroissant', ['Sommet', 'Degré', 'Couleur'], ordre.map(function (x) { return [nom(G, x), String(d[x].total), couleur[x] ? String(couleur[x]) : '']; }), { surligne: k !== undefined ? [k] : [], couleurs: ordre.map(function (x) { return couleur[x] || 0; }) })
      ];
    }
    E.capture('Welsh-Powell : on range les sommets par degré décroissant. Puis, couleur par couleur, on parcourt la liste et on colorie chaque sommet non colorié qui n\'est voisin d\'aucun sommet déjà peint de cette couleur.', panneaux());
    var c = 0;
    while (ordre.some(function (x) { return !couleur[x]; })) {
      c++;
      var peints = [];
      for (var k = 0; k < ordre.length; k++) {
        var x = ordre[k];
        if (couleur[x]) continue;
        var conflit = peints.filter(function (y) { return adjacents(G, x, y); });
        if (!conflit.length) {
          couleur[x] = c;
          peints.push(x);
          E.sommet(x, { etat: 'colore', couleur: c, note: 'c' + c });
          E.capture('Couleur ' + c + ' : $' + texId(nom(G, x)) + '$ n\'est voisin d\'aucun sommet de couleur ' + c + ', on le peint.', panneaux(k));
        } else {
          E.sommet(x, { etat: 'refuse' });
          E.capture('Couleur ' + c + ' : $' + texId(nom(G, x)) + '$ est voisin de ' + conflit.map(function (y) { return nom(G, y); }).join(', ') + ' (déjà en couleur ' + c + '), on le saute.', panneaux(k));
          E.sommet(x, { etat: 'neutre' });
        }
      }
    }
    E.capture('Tous les sommets sont coloriés avec ' + c + ' couleurs. Attention : c\'est une majoration du nombre chromatique, $\\chi(G) \\le ' + c + '$.', panneaux());
    return { etapes: E.etapes, resultat: { couleurs: couleur, nb: c, ordre: ordre } };
  }

  function colorationGloutonne(G, opts) {
    opts = opts || {};
    var ordre = opts.ordre ? String(opts.ordre).split(/[\s,]+/).filter(Boolean) : G.sommets.slice();
    var E = new Etat(G);
    var couleur = {};
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    function panneaux() {
      return [puces('Ordre de traitement', ordre.map(function (x) { return { txt: nom(G, x) + (couleur[x] ? ' : ' + couleur[x] : ''), couleur: couleur[x] || 0 }; }))];
    }
    E.capture('Coloration gloutonne : on prend les sommets dans l\'ordre ' + ordre.map(function (x) { return nom(G, x); }).join(', ') + ' et on donne à chacun la plus petite couleur non utilisée par ses voisins déjà coloriés.', panneaux());
    ordre.forEach(function (x) {
      var interdites = G.voisins[x].map(function (y) { return couleur[y]; }).filter(Boolean);
      var c = 1;
      while (interdites.indexOf(c) !== -1) c++;
      couleur[x] = c;
      E.sommet(x, { etat: 'colore', couleur: c, note: 'c' + c });
      E.capture('$' + texId(nom(G, x)) + '$ : couleurs déjà prises par ses voisins : ' + (interdites.length ? unique(interdites).sort(function (a, b) { return a - b; }).join(', ') : 'aucune') + '. On lui donne la couleur ' + c + '.', panneaux());
    });
    var nb = Math.max.apply(null, G.sommets.map(function (x) { return couleur[x]; }));
    E.capture('Coloration obtenue avec ' + nb + ' couleurs : $\\chi(G) \\le ' + nb + '$.', panneaux());
    return { etapes: E.etapes, resultat: { couleurs: couleur, nb: nb } };
  }

  /* ================================================================ Euler */

  function tracerEuler(G, opts) {
    opts = opts || {};
    var e = euler(G);
    var E = new Etat(G);
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: 'd=' + e.degres[x].total }); });
    e.impairs.forEach(function (x) { E.sommet(x, { etat: 'impair' }); });
    var bilan = e.impairs.length === 0 ? 'Aucun sommet de degré impair.' : e.impairs.length + ' sommet' + (e.impairs.length > 1 ? 's' : '') + ' de degré impair : ' + e.impairs.map(function (x) { return nom(G, x); }).join(', ') + '.';
    E.capture('On compte les degrés. ' + bilan + (e.type === 'aucun' ? ' Pas de chaîne eulérienne (il faudrait 0 ou 2 sommets impairs' + (e.connexe ? '' : ', et un graphe connexe') + ').' : e.type === 'cycle' ? ' Il existe un cycle eulérien (départ et arrivée au même sommet).' : ' Il existe une chaîne eulérienne, qui part d\'un sommet impair et finit à l\'autre.'), []);
    if (e.type !== 'aucun') {
      var tr = traceEulerien(G, opts.depart);
      E.sommet(tr.sommets[0], { etat: 'courant' });
      E.capture('Tracé : on part de $' + texId(nom(G, tr.sommets[0])) + '$.', [puces('Chaîne', [{ txt: nom(G, tr.sommets[0]) }])]);
      for (var i = 0; i < tr.aretes.length; i++) {
        E.arete(tr.aretes[i], 'arbre');
        E.sommet(tr.sommets[i], { etat: 'fini' });
        E.sommet(tr.sommets[i + 1], { etat: 'courant' });
        E.capture('Arête ' + (i + 1) + ' : $' + texId(nom(G, tr.sommets[i])) + ' - ' + texId(nom(G, tr.sommets[i + 1])) + '$.', [puces('Chaîne', tr.sommets.slice(0, i + 2).map(function (x) { return { txt: nom(G, x) }; }))]);
      }
      E.capture('Toutes les arêtes sont parcourues une seule fois.', [puces('Chaîne', tr.sommets.map(function (x) { return { txt: nom(G, x) }; }))]);
    }
    return { etapes: E.etapes, resultat: e };
  }

  /* ================================================================== Noyau */

  function noyauSansCircuit(G) {
    var E = new Etat(G);
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    var statut = {};
    var restants = G.sommets.slice();
    function panneaux() {
      return [
        puces('Dans le noyau', G.sommets.filter(function (x) { return statut[x] === 'in'; }).map(function (x) { return { txt: nom(G, x) }; }), 'vide'),
        puces('Hors du noyau', G.sommets.filter(function (x) { return statut[x] === 'out'; }).map(function (x) { return { txt: nom(G, x) }; }), 'vide')
      ];
    }
    E.capture('Méthode pour un graphe sans circuit : un puits est forcément dans le noyau, et tout prédécesseur d\'un sommet du noyau est forcément dehors. On recommence sur ce qui reste.', panneaux());
    var garde = 0;
    while (restants.length && garde++ < 50) {
      var ajoutes = restants.filter(function (x) {
        return G.succ[x].every(function (y) { return statut[y] === 'out'; });
      });
      if (!ajoutes.length) {
        E.capture('Blocage : plus aucun sommet dont tous les successeurs sont hors du noyau. Le graphe a un circuit, la méthode ne s\'applique pas.', panneaux());
        break;
      }
      ajoutes.forEach(function (x) { statut[x] = 'in'; E.sommet(x, { etat: 'noyau' }); });
      E.capture('Sommets dont tous les successeurs sont hors du noyau (ou sans successeur) : ' + ajoutes.map(function (x) { return nom(G, x); }).join(', ') + '. Ils entrent dans le noyau.', panneaux());
      var exclus = [];
      restants.forEach(function (x) {
        if (statut[x]) return;
        if (G.succ[x].some(function (y) { return statut[y] === 'in'; })) { statut[x] = 'out'; exclus.push(x); }
      });
      exclus.forEach(function (x) { E.sommet(x, { etat: 'retire' }); });
      if (exclus.length) E.capture('Leurs prédécesseurs ' + exclus.map(function (x) { return nom(G, x); }).join(', ') + ' ont un successeur dans le noyau : ils sont dehors.', panneaux());
      restants = restants.filter(function (x) { return !statut[x]; });
    }
    var N = G.sommets.filter(function (x) { return statut[x] === 'in'; });
    E.capture('Noyau : {' + N.map(function (x) { return nom(G, x); }).join(', ') + '}.', panneaux());
    return { etapes: E.etapes, resultat: { noyau: N } };
  }

  /* =================================================== Plus courts chemins */

  function fmtVal(v) { return v === Infinity ? '∞' : v === -Infinity ? '-∞' : String(v); }
  function texVal(v) { return v === Infinity ? '\\infty' : v === -Infinity ? '-\\infty' : String(v); }
  /* « a + w » pour une formule, avec un poids négatif écrit « a - |w| ». */
  function texSomme(a, w) {
    if (a === Infinity || a === -Infinity) return texVal(a);
    return texVal(a) + (w < 0 ? ' - ' + (-w) : ' + ' + w);
  }
  function rangDe(G, x) { return G.sommets.indexOf(x); }
  function L(G, x) { return '$' + texId(nom(G, x)) + '$'; }

  /* Arcs sortants et entrants avec leur poids (une arête compte dans les deux sens). */
  function arcsSortants(G, x) {
    var r = [];
    G.aretes.forEach(function (a) {
      if (a.u === x) r.push({ y: a.v, w: a.w, id: a.id });
      else if (!G.oriente && a.v === x) r.push({ y: a.u, w: a.w, id: a.id });
    });
    return r.sort(function (p, q) { return rangDe(G, p.y) - rangDe(G, q.y) || p.w - q.w; });
  }
  function arcsEntrants(G, y) {
    var r = [];
    G.aretes.forEach(function (a) {
      if (a.v === y) r.push({ x: a.u, w: a.w, id: a.id });
      else if (!G.oriente && a.u === y) r.push({ x: a.v, w: a.w, id: a.id });
    });
    return r.sort(function (p, q) { return rangDe(G, p.x) - rangDe(G, q.x) || p.w - q.w; });
  }

  /* ------------------------------------------------------------ Dijkstra */

  function dijkstra(G, opts) {
    opts = opts || {};
    var i0 = opts.depart || G.sommets[0];
    var E = new Etat(G);
    var lam = {}, pere = {}, arcPere = {}, S = {}, ordre = [];
    var lignes = [], premiereLigne = {}, entoure = {};
    G.sommets.forEach(function (x) { lam[x] = Infinity; E.sommet(x, { etat: 'neutre', note: '∞' }); });
    lam[i0] = 0;
    premiereLigne[i0] = 0;
    E.sommet(i0, { note: '0' });
    var negatif = G.aretes.filter(function (a) { return a.w < 0; });

    function ligne(titre) {
      lignes.push([titre].concat(G.sommets.map(function (x) { return S[x] ? '/' : fmtVal(lam[x]); })));
    }
    function lignesAffichees() {
      return lignes.map(function (l, r) {
        return l.map(function (c, j) { return j > 0 && entoure[r + ':' + G.sommets[j - 1]] ? '==' + c + '==' : c; });
      });
    }
    function panneaux() {
      return [tableau('Tableau du cours (valeur définitive surlignée sur la ligne où elle apparaît)', ['Sélection'].concat(G.sommets.map(function (x) { return nom(G, x); })), lignesAffichees(), { surligne: [lignes.length - 1] })];
    }

    ligne('Init.');
    E.capture('Initialisation : $\\lambda_{' + texId(nom(G, i0)) + '} = 0$ et $\\lambda = \\infty$ pour tous les autres sommets. $S$ (sommets définitifs) est vide.' +
      (negatif.length ? ' Attention : le graphe a des poids négatifs, Dijkstra ne garantit plus le résultat.' : ''), panneaux());

    while (ordre.length < G.sommets.length) {
      var i = null;
      G.sommets.forEach(function (x) { if (!S[x] && (i === null || lam[x] < lam[i])) i = x; });
      if (lam[i] === Infinity) {
        var rest = G.sommets.filter(function (x) { return !S[x]; });
        rest.forEach(function (x) { E.sommet(x, { etat: 'bloque' }); });
        E.capture('Les sommets restants ' + rest.map(function (x) { return nom(G, x); }).join(', ') + ' gardent $\\lambda = \\infty$ : ils ne sont pas descendants de ' + L(G, i0) + '.', panneaux());
        break;
      }
      S[i] = true;
      ordre.push(i);
      entoure[premiereLigne[i] + ':' + i] = true;
      ordre.slice(0, -1).forEach(function (z) { E.sommet(z, { etat: 'fini' }); });
      E.sommet(i, { etat: 'courant', note: fmtVal(lam[i]) });
      if (arcPere[i]) E.arete(arcPere[i], 'arbre');
      E.capture('On sélectionne ' + L(G, i) + ' : $\\lambda_{' + texId(nom(G, i)) + '} = ' + texVal(lam[i]) + '$ est le plus petit $\\lambda$ hors de $S$. Valeur définitive' +
        (pere[i] ? ', obtenue depuis ' + L(G, pere[i]) + ' : l\'arc $(' + texId(nom(G, pere[i])) + ', ' + texId(nom(G, i)) + ')$ entre dans l\'arborescence.' : ' (c\'est la racine).'), panneaux());

      var morceaux = [];
      arcsSortants(G, i).forEach(function (s) {
        if (S[s.y]) { if (E.a[s.id] !== 'arbre') E.arete(s.id, 'attenue'); return; }
        var cand = lam[i] + s.w;
        var J = texId(nom(G, s.y));
        if (cand < lam[s.y]) {
          morceaux.push('$\\lambda_{' + J + '} = \\min(' + texVal(lam[s.y]) + ',\\ ' + texSomme(lam[i], s.w) + ') = ' + cand + '$ (mis à jour)');
          if (arcPere[s.y]) E.arete(arcPere[s.y], 'attenue');
          lam[s.y] = cand;
          pere[s.y] = i;
          arcPere[s.y] = s.id;
          premiereLigne[s.y] = lignes.length;
          E.arete(s.id, 'examen');
          E.sommet(s.y, { note: String(cand), etat: 'attente' });
        } else {
          morceaux.push('$\\lambda_{' + J + '}$ reste ' + texVal(lam[s.y]) + ' ($' + texSomme(lam[i], s.w) + ' = ' + cand + '$ n\'est pas plus petit)');
          if (E.a[s.id] !== 'examen') E.arete(s.id, 'attenue');
        }
      });
      ligne(nom(G, i));
      if (ordre.length < G.sommets.length) {
        E.capture('Ajustement des successeurs de ' + L(G, i) + ' hors de $S$ : ' + (morceaux.length ? morceaux.join(' ; ') + '.' : 'aucun, rien ne change.'), panneaux());
      }
    }
    G.sommets.forEach(function (x) { E.sommet(x, { etat: S[x] ? 'fini' : 'bloque' }); });
    G.aretes.forEach(function (a) { if (E.a[a.id] !== 'arbre') E.arete(a.id, 'attenue'); });
    var arcs = Object.keys(arcPere).map(function (y) { return arcPere[y]; });
    E.capture('Fin : tous les sommets atteignables sont définitifs. Les ' + (G.oriente ? 'arcs' : 'arêtes') + ' en couleur forment l\'arborescence des ' + (G.oriente ? 'chemins' : 'chaînes') + ' $' + texId(nom(G, i0)) + 'i$-minimaux ; la note de chaque sommet est sa distance.', panneaux());
    return { etapes: E.etapes, resultat: { lambda: lam, pere: pere, arcs: arcs, ordre: ordre, lignes: lignesAffichees() } };
  }

  /* ----------------------------------------------------- Bellman-Kalaba */

  function bellmanKalaba(G, opts) {
    opts = opts || {};
    var max = opts.mode === 'max';
    var i0 = opts.depart || G.sommets[0];
    var n = G.sommets.length;
    var pire = max ? -Infinity : Infinity;
    var mieux = function (a, b) { return max ? a > b : a < b; };
    var MIN = max ? '\\max' : '\\min';
    var E = new Etat(G);
    var lam = [{}], pere = [{}], arcP = [{}];
    G.sommets.forEach(function (x) { lam[0][x] = pire; pere[0][x] = null; E.sommet(x, { etat: 'neutre', note: fmtVal(pire) }); });
    lam[0][i0] = 0; pere[0][i0] = i0;
    E.sommet(i0, { note: '0', etat: 'fini' });

    function cellule(k, x) {
      var v = lam[k][x];
      if (v === pire) return fmtVal(v);
      return v + '/' + nom(G, pere[k][x]);
    }
    function panneaux(k, changes) {
      var lignes = [];
      for (var r = 0; r <= k; r++) lignes.push([String(r), '$\\lambda_{' + r + '}$'].concat(G.sommets.map(function (x) { return cellule(r, x); })));
      return [tableau('Valeur/père à chaque étape (arc fictif $(' + texId(nom(G, i0)) + ', ' + texId(nom(G, i0)) + ')$ de poids 0)', ['$k$', ''].concat(G.sommets.map(function (x) { return nom(G, x); })), lignes,
        { surligne: [k], colonnes: (changes || []).map(function (x) { return rangDe(G, x) + 2; }) })];
    }

    E.capture('Initialisation : $\\lambda_0(' + texId(nom(G, i0)) + ') = 0$, les autres valent $' + texVal(pire) + '$. On cherche les chemins ' + (max ? 'maximaux' : 'minimaux') +
      ' : à l\'étape $k$, $\\lambda_k(j) = ' + MIN + '_{i \\in \\Gamma^-(j)} (\\lambda_{k-1}(i) + p_{ij})$.', panneaux(0));

    var k, stable = false;
    for (k = 1; k <= n; k++) {
      lam[k] = {}; pere[k] = {}; arcP[k] = {};
      var changes = [], textes = [];
      G.sommets.forEach(function (j) {
        var cands = arcsEntrants(G, j).map(function (e) { return { i: e.x, id: e.id, w: e.w, v: lam[k - 1][e.x] === pire ? pire : lam[k - 1][e.x] + e.w }; });
        if (j === i0) cands.unshift({ i: i0, id: null, w: 0, v: lam[k - 1][i0], fictif: true });
        var best = pire, choix = null;
        cands.forEach(function (c) { if (mieux(c.v, best)) { best = c.v; choix = c; } });
        // À égalité, on garde le père de l'étape précédente s'il réalise aussi l'optimum (arborescence stable).
        var garde = cands.filter(function (c) { return c.v === best && best !== pire && c.i === pere[k - 1][j]; })[0];
        if (garde) choix = garde;
        lam[k][j] = best;
        pere[k][j] = choix ? choix.i : null;
        arcP[k][j] = choix ? choix.id : null;
        if (best !== lam[k - 1][j]) {
          changes.push(j);
          var J = texId(nom(G, j));
          textes.push('$\\lambda_{' + k + '}(' + J + ') = ' + MIN + '(' + cands.map(function (c) { return c.fictif ? texVal(c.v) : texSomme(lam[k - 1][c.i], c.w); }).join(',\\ ') + ') = ' + texVal(best) + '$');
        }
      });
      G.sommets.forEach(function (x) {
        E.sommet(x, { note: fmtVal(lam[k][x]), etat: changes.indexOf(x) !== -1 ? 'courant' : lam[k][x] === pire ? 'neutre' : 'fini' });
      });
      G.aretes.forEach(function (a) { E.arete(a.id, 'neutre'); });
      G.sommets.forEach(function (x) { if (arcP[k][x]) E.arete(arcP[k][x], changes.indexOf(x) !== -1 ? 'examen' : 'arbre'); });
      if (!changes.length) {
        stable = true;
        E.capture('Étape $k = ' + k + '$ : aucune valeur ne change, $\\lambda_{' + k + '} = \\lambda_{' + (k - 1) + '}$. STOP.', panneaux(k));
        break;
      }
      E.capture('Étape $k = ' + k + '$ (chemins d\'au plus ' + k + ' arc' + (k > 1 ? 's' : '') + ') : ' + textes.join(' ; ') + '. Les autres valeurs ne changent pas.', panneaux(k, changes));
    }
    var dernier = Math.min(k, n);
    var circuit = null;
    if (!stable) {
      // On remonte les pères depuis un sommet modifié à l'étape n : on finit dans un circuit absorbant.
      var x = G.sommets.filter(function (z) { return lam[n][z] !== lam[n - 1][z]; })[0];
      var p = pere[n];
      for (var t = 0; t < n && x; t++) x = p[x];
      if (x) {
        var c = [x], y = p[x], garde2 = 0;
        while (y && y !== x && garde2++ < n) { c.unshift(y); y = p[y]; }
        if (y === x) circuit = c;
      }
      G.aretes.forEach(function (a) { E.arete(a.id, 'attenue'); });
      if (circuit) for (var q = 0; q < circuit.length; q++) E.arete(areteEntre(G, circuit[q], circuit[(q + 1) % circuit.length]), 'cycle');
      var poidsC = 0;
      if (circuit) for (var q2 = 0; q2 < circuit.length; q2++) poidsC += G.parId[areteEntre(G, circuit[q2], circuit[(q2 + 1) % circuit.length])].w;
      E.capture('Après $k = n = ' + n + '$ étapes, les valeurs changent encore ($\\lambda_{' + n + '} \\neq \\lambda_{' + (n - 1) + '}$) : $k$ atteint $n + 1$, le graphe a un circuit ' + (max ? 'de poids positif' : 'absorbant (poids négatif)') +
        (circuit ? ', par exemple ' + circuit.concat([circuit[0]]).map(function (z) { return nom(G, z); }).join(' → ') + ' de poids ' + poidsC : '') + '. Pas de chemin ' + (max ? 'maximal' : 'minimal') + '.', panneaux(n));
    } else {
      G.aretes.forEach(function (a) { if (E.a[a.id] !== 'arbre') E.arete(a.id, 'attenue'); });
      G.sommets.forEach(function (x) { E.sommet(x, { etat: lam[dernier][x] === pire ? 'bloque' : 'fini' }); });
      E.capture('Résultat : chaque valeur est la longueur d\'un chemin ' + nom(G, i0) + '$j$-' + (max ? 'maximal' : 'minimal') + '. Les pères donnent l\'arborescence (arcs en couleur).', panneaux(dernier));
    }
    var arcs = [];
    if (stable) G.sommets.forEach(function (x) { if (arcP[dernier][x]) arcs.push(arcP[dernier][x]); });
    return { etapes: E.etapes, resultat: { lambda: lam[dernier], pere: pere[dernier], arcs: arcs, stop: stable ? dernier : null, circuit: !stable, cycle: circuit, tableau: lam } };
  }

  /* -------------------------------------------- Bellman sans circuit */

  function bellmanSansCircuit(G, opts) {
    opts = opts || {};
    var max = opts.mode === 'max';
    var i0 = opts.depart || G.sommets[0];
    var pire = max ? -Infinity : Infinity;
    var mieux = function (a, b) { return max ? a > b : a < b; };
    var MIN = max ? '\\max' : '\\min';
    var E = new Etat(G);
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    var niv = partitionNiveaux(G);
    if (!niv.sansCircuit) {
      E.capture('La mise en niveaux bloque : le graphe a un circuit. Bellman pour graphes sans circuit ne s\'applique pas (utilise Bellman-Kalaba).', []);
      return { etapes: E.etapes, resultat: { circuit: true } };
    }
    var ordre = [];
    niv.niveaux.forEach(function (N, k) { N.forEach(function (x) { ordre.push(x); E.sommet(x, { note: 'N' + k }); }); });
    var lam = {}, pere = {}, arcs = [];
    G.sommets.forEach(function (x) { lam[x] = pire; });
    function panneaux(courant) {
      return [
        puces('Ordre des niveaux (tri topologique)', ordre.map(function (x) { return { txt: nom(G, x), etat: x === courant ? 'haut' : '' }; })),
        tableau('Valeurs $\\lambda$', ['$x$'].concat(ordre.map(function (x) { return nom(G, x); })), [['$\\lambda(x)$'].concat(ordre.map(function (x) { return lam[x] === pire && ordre.indexOf(x) > ordre.indexOf(courant) ? '' : fmtVal(lam[x]); }))], { compact: true, colonnes: courant ? [ordre.indexOf(courant) + 1] : [] })
      ];
    }
    E.capture('Le graphe est sans circuit : on le met en niveaux et on traite les sommets dans cet ordre. Quand on arrive sur un sommet, tous ses prédécesseurs sont déjà calculés : une seule passe suffit.', panneaux(null));
    ordre.forEach(function (j) {
      var J = texId(nom(G, j));
      if (j === i0) {
        lam[j] = 0;
        E.sommet(j, { etat: 'fini', note: '0' });
        E.capture('Départ : $\\lambda(' + J + ') = 0$.', panneaux(j));
        return;
      }
      var cands = arcsEntrants(G, j).map(function (e) { return { i: e.x, id: e.id, w: e.w, v: lam[e.x] === pire ? pire : lam[e.x] + e.w }; });
      var best = pire, choix = null;
      cands.forEach(function (c) { if (mieux(c.v, best)) { best = c.v; choix = c; } });
      lam[j] = best;
      if (choix) { pere[j] = choix.i; arcs.push(choix.id); E.arete(choix.id, 'arbre'); }
      cands.forEach(function (c) { if (!choix || c.id !== choix.id) E.arete(c.id, 'attenue'); });
      E.sommet(j, { etat: best === pire ? 'bloque' : 'fini', note: fmtVal(best) });
      E.capture(cands.length
        ? '$\\lambda(' + J + ') = ' + MIN + '(' + cands.map(function (c) { return texSomme(lam[c.i], c.w); }).join(',\\ ') + ') = ' + texVal(best) + '$' + (choix ? ', obtenu depuis ' + L(G, choix.i) + '.' : ' : ' + L(G, j) + ' n\'est pas atteignable.')
        : L(G, j) + ' n\'a pas de prédécesseur : $\\lambda(' + J + ') = ' + texVal(pire) + '$, il n\'est pas atteignable depuis ' + L(G, i0) + '.', panneaux(j));
    });
    G.aretes.forEach(function (a) { if (arcs.indexOf(a.id) === -1) E.arete(a.id, 'attenue'); });
    E.capture('Fin en une seule passe ($O(m)$). Les arcs en couleur forment l\'arborescence des chemins ' + (max ? 'maximaux' : 'minimaux') + '.', panneaux(null));
    return { etapes: E.etapes, resultat: { lambda: lam, pere: pere, arcs: arcs, ordre: ordre } };
  }

  /* Résultats bruts (sans étapes) pour les tableaux et le vérificateur. */
  function plusCourts(G, depart, methode, mode) {
    if (methode === 'bellman') return bellmanKalaba(G, { depart: depart, mode: mode }).resultat;
    if (methode === 'bellman-sc') return bellmanSansCircuit(G, { depart: depart, mode: mode }).resultat;
    return dijkstra(G, { depart: depart }).resultat;
  }

  /*
   * Matrices des poids et de routage. racines : liste de sommets dont on connaît l'arborescence
   * (pré-remplissage du cours), ou null pour la matrice complète (un calcul depuis chaque sommet).
   * Renvoie { lambda[x][y], m[x][y] } avec null pour une case inconnue.
   */
  function matrices(G, racines, methode) {
    var lamM = {}, mM = {};
    G.sommets.forEach(function (x) { lamM[x] = {}; mM[x] = {}; G.sommets.forEach(function (y) { lamM[x][y] = null; mM[x][y] = null; }); });
    var negatif = G.aretes.some(function (a) { return a.w < 0; });
    var meth = methode || (negatif ? 'bellman' : 'dijkstra');
    var sources = racines && racines.length ? racines : G.sommets;
    sources.forEach(function (r) {
      var res = plusCourts(G, r, meth);
      if (res.circuit) return;
      // Chemin de r à y dans l'arborescence, puis toutes ses sous-chaînes (principe de Bellman).
      G.sommets.forEach(function (y) {
        if (y === r || res.lambda[y] === Infinity) return;
        var ch = [y];
        while (ch[0] !== r) ch.unshift(res.pere[ch[0]]);
        for (var a = 0; a < ch.length; a++) {
          for (var b = a + 1; b < ch.length; b++) {
            var d = res.lambda[ch[b]] - res.lambda[ch[a]];
            lamM[ch[a]][ch[b]] = d;
            mM[ch[a]][ch[b]] = ch[a + 1];
            if (!G.oriente) { lamM[ch[b]][ch[a]] = d; mM[ch[b]][ch[a]] = ch[b - 1]; }
          }
        }
      });
    });
    return { lambda: lamM, m: mM };
  }

  /* ========================================================= Ordonnancement */

  /* Durée de chaque sommet d'un graphe potentiels-tâches (poids de ses arcs sortants, 0 pour ω). */
  function dureesTaches(G) {
    var d = {};
    if (G.def.durees) return Object.assign({}, G.def.durees);
    G.sommets.forEach(function (x) {
      var s = G.aretes.filter(function (a) { return a.u === x; });
      d[x] = s.length ? s[0].w : 0;
    });
    return d;
  }

  function calculOrdo(G) {
    var niv = partitionNiveaux(G);
    if (!niv.sansCircuit) throw new Error('ordonnancement impossible : circuit');
    var ordre = [];
    niv.niveaux.forEach(function (N) { N.forEach(function (x) { ordre.push(x); }); });
    var d = dureesTaches(G);
    var t = {}, ts = {}, f = {}, MT = {}, ml = {};
    ordre.forEach(function (v) {
      t[v] = G.pred[v].length ? Math.max.apply(null, G.pred[v].map(function (x) { return t[x] + d[x]; })) : 0;
    });
    var fin = ordre[ordre.length - 1];
    var duree = Math.max.apply(null, ordre.map(function (v) { return t[v] + d[v]; }));
    ordre.slice().reverse().forEach(function (v) {
      ts[v] = G.succ[v].length ? Math.min.apply(null, G.succ[v].map(function (x) { return ts[x]; })) - d[v] : duree - d[v];
    });
    ordre.forEach(function (v) {
      f[v] = t[v] + d[v];
      MT[v] = ts[v] - t[v];
      ml[v] = G.succ[v].length ? Math.min.apply(null, G.succ[v].map(function (x) { return t[x]; })) - f[v] : duree - f[v];
    });
    var critiques = ordre.filter(function (v) { return MT[v] === 0; });
    var arcsCritiques = G.aretes.filter(function (a) { return MT[a.u] === 0 && MT[a.v] === 0 && t[a.v] === t[a.u] + d[a.u]; }).map(function (a) { return a.id; });
    return { ordre: ordre, d: d, t: t, ts: ts, f: f, MT: MT, ml: ml, duree: duree, fin: fin, critiques: critiques, arcsCritiques: arcsCritiques };
  }

  function ordonnancement(G) {
    var E = new Etat(G);
    var R = calculOrdo(G);
    var o = R.ordre;
    var vu = { t: {}, ts: {}, f: {}, MT: {}, ml: {} };
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    function cell(k, v) { return vu[k][v] ? String(R[k][v]) : ''; }
    // Colonnes dans l'ordre de l'énoncé (α, tâches, ω), calculs dans l'ordre des niveaux.
    var cols = G.sommets;
    function panneaux(courant) {
      return [tableau('Tableau récapitulatif', ['Tâche $v$'].concat(cols.map(function (v) { return nom(G, v); })), [
        ['durée'].concat(cols.map(function (v) { return String(R.d[v]); })),
        ['$t_v$ (début au plus tôt)'].concat(cols.map(function (v) { return cell('t', v); })),
        ['$t^*_v$ (début au plus tard)'].concat(cols.map(function (v) { return cell('ts', v); })),
        ['$f_v = t_v + d_v$'].concat(cols.map(function (v) { return cell('f', v); })),
        ['$MT_v = t^*_v - t_v$'].concat(cols.map(function (v) { return cell('MT', v); })),
        ['$ml_v$'].concat(cols.map(function (v) { return cell('ml', v); }))
      ], { compact: true, colonnes: courant ? [cols.indexOf(courant) + 1] : [] })];
    }
    function V(v) { return texId(nom(G, v)); }
    E.capture('Graphe potentiels-tâches : un sommet par tâche, plus $\\alpha$ (début) et $\\omega$ (fin). L\'arc $(x, y)$ porte la durée de $x$. On traite les sommets dans l\'ordre des niveaux.', panneaux(null));

    o.forEach(function (v) {
      vu.t[v] = true;
      var preds = G.pred[v];
      E.sommet(v, { etat: 'courant', note: 't=' + R.t[v] });
      preds.forEach(function (x) { E.arete(areteEntre(G, x, v), 'examen'); });
      E.capture(preds.length
        ? 'Au plus tôt : $t_{' + V(v) + '} = \\max(' + preds.map(function (x) { return 't_{' + V(x) + '} + ' + R.d[x]; }).join(',\\ ') + ') = \\max(' + preds.map(function (x) { return R.t[x] + R.d[x]; }).join(',\\ ') + ') = ' + R.t[v] + '$.'
        : 'Au plus tôt : ' + L(G, v) + ' commence à la date $t_{' + V(v) + '} = 0$.', panneaux(v));
      preds.forEach(function (x) { E.arete(areteEntre(G, x, v), 'neutre'); });
      E.sommet(v, { etat: 'fini' });
    });
    E.capture('Durée minimale du projet : $t_{\\omega} = ' + R.duree + '$ (plus long chemin de $\\alpha$ à $\\omega$). On repart maintenant de $\\omega$ en remontant (graphe transposé) pour les dates au plus tard.', panneaux(null));

    o.slice().reverse().forEach(function (v) {
      vu.ts[v] = true;
      var succ = G.succ[v];
      E.sommet(v, { etat: 'courant', note: R.t[v] + ' | ' + R.ts[v] });
      succ.forEach(function (x) { E.arete(areteEntre(G, v, x), 'examen'); });
      E.capture(succ.length
        ? 'Au plus tard : $t^*_{' + V(v) + '} = \\min(' + succ.map(function (x) { return 't^*_{' + V(x) + '}'; }).join(',\\ ') + ') - ' + R.d[v] + ' = ' + (R.ts[v] + R.d[v]) + ' - ' + R.d[v] + ' = ' + R.ts[v] + '$.'
        : 'Au plus tard : $t^*_{' + V(v) + '} = t_{' + V(v) + '} = ' + R.ts[v] + '$ (on ne retarde pas la fin du projet).', panneaux(v));
      succ.forEach(function (x) { E.arete(areteEntre(G, v, x), 'neutre'); });
      E.sommet(v, { etat: 'fini' });
    });

    o.forEach(function (v) { vu.f[v] = true; vu.MT[v] = true; vu.ml[v] = true; });
    o.forEach(function (v) { E.sommet(v, { etat: R.MT[v] === 0 ? 'marque' : 'fini' }); });
    G.aretes.forEach(function (a) { E.arete(a.id, R.arcsCritiques.indexOf(a.id) !== -1 ? 'arbre' : 'attenue'); });
    var crit = R.critiques.filter(function (v) { return G.def.taches ? G.def.taches.indexOf(v) !== -1 : true; });
    var diff = o.filter(function (v) { return R.ml[v] !== R.MT[v]; });
    E.capture('Marges : $MT_v = t^*_v - t_v$ et $ml_v = \\min_{x \\in \\Gamma^+(v)} t_x - f_v$. Tâches critiques (marge totale nulle) : ' + crit.map(function (v) { return nom(G, v); }).join(', ') + '. Le chemin critique est en couleur, de longueur ' + R.duree + '.' +
      (diff.length ? ' Marge libre différente de la marge totale pour ' + diff.map(function (v) { return nom(G, v); }).join(', ') + '.' : ''), panneaux(null));
    return { etapes: E.etapes, resultat: R };
  }

  /* ================================================================= Flots */

  function valeurFlot(G, phi) {
    var v = 0;
    G.aretes.forEach(function (a) { if (a.u === G.source) v += phi[a.id]; if (a.v === G.source) v -= phi[a.id]; });
    return v;
  }

  /* Le vecteur est-il un flot compatible ? Renvoie { ok, raison }. */
  function flotCompatible(G, phi) {
    for (var i = 0; i < G.aretes.length; i++) {
      var a = G.aretes[i];
      if (phi[a.id] < 0 || phi[a.id] > a.w) return { ok: false, raison: 'capacité non respectée sur ' + a.id };
    }
    for (var j = 0; j < G.sommets.length; j++) {
      var x = G.sommets[j];
      if (x === G.source || x === G.puits) continue;
      var ent = 0, sor = 0;
      G.aretes.forEach(function (a) { if (a.v === x) ent += phi[a.id]; if (a.u === x) sor += phi[a.id]; });
      if (ent !== sor) return { ok: false, raison: 'loi de Kirchhoff fausse en ' + x + ' (' + ent + ' entrant, ' + sor + ' sortant)' };
    }
    return { ok: true };
  }

  function capaciteCoupe(G, A) {
    var c = 0;
    G.aretes.forEach(function (a) { if (A.indexOf(a.u) !== -1 && A.indexOf(a.v) === -1) c += a.w; });
    return c;
  }

  /* Toutes les coupes de capacité minimale (énumération, petits réseaux seulement). */
  function coupesMin(G) {
    var autres = G.sommets.filter(function (x) { return x !== G.source && x !== G.puits; });
    var best = Infinity, liste = [];
    for (var m = 0; m < (1 << autres.length); m++) {
      var A = [G.source].concat(autres.filter(function (x, i) { return m & (1 << i); }));
      var c = capaciteCoupe(G, A);
      if (c < best) { best = c; liste = [A]; } else if (c === best) liste.push(A);
    }
    return { capacite: best, coupes: liste.map(function (A) { return trier(A, G.ordre); }) };
  }

  function fordFulkerson(G) {
    var E = new Etat(G);
    var s = G.source, t = G.puits;
    var phi = Object.assign({}, G.flot);
    var val = valeurFlot(G, phi);
    E.labels = {};
    function majLabels() { G.aretes.forEach(function (a) { E.labels[a.id] = phi[a.id] + '(' + a.w + ')'; }); }
    majLabels();
    G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
    var comp = flotCompatible(G, phi);
    var marques = {}, ordreMarques = [];
    function puceMarques() {
      return puces('Sommets marqués', ordreMarques.map(function (x, i) { var m = marques[x]; return { txt: nom(G, x) + (m.de ? ' (' + m.signe + nom(G, m.de) + ')' : ' (+)'), etat: i === ordreMarques.length - 1 ? 'haut' : '' }; }), 'aucun');
    }
    function noteValeur() { return note('Valeur du flot', String(val)); }
    E.capture('Flot initial ' + (comp.ok ? 'compatible' : 'NON compatible (' + comp.raison + ')') + ', de valeur ' + val + ' (flux sortant de ' + L(G, s) + '). Sur chaque arc : flux(capacité). On cherche une chaîne augmentante par marquage.', [noteValeur()]);
    var iter = 0;
    while (iter++ < 60) {
      marques = {}; ordreMarques = [];
      G.sommets.forEach(function (x) { E.sommet(x, { etat: 'neutre', note: '' }); });
      G.aretes.forEach(function (a) { E.arete(a.id, 'neutre'); });
      marques[s] = { signe: '+', de: null };
      ordreMarques.push(s);
      E.sommet(s, { etat: 'courant', note: '+' });
      E.capture('Recherche n° ' + iter + ' : on marque l\'entrée ' + L(G, s) + '. Depuis un sommet marqué $x$, on marque $y$ par un arc $(x, y)$ non saturé (direct, $+x$) ou par un arc $(y, x)$ de flux non nul (indirect, $-x$).', [puceMarques(), noteValeur()]);
      var file = [s];
      while (file.length && !marques[t]) {
        var x = file.shift();
        var X = texId(nom(G, x));
        var cand = [];
        G.aretes.forEach(function (a) { if (a.u === x) cand.push({ a: a, y: a.v, direct: true }); });
        G.aretes.forEach(function (a) { if (a.v === x) cand.push({ a: a, y: a.u, direct: false }); });
        for (var k = 0; k < cand.length && !marques[t]; k++) {
          var c = cand[k];
          if (marques[c.y]) continue;
          var Y = texId(nom(G, c.y));
          if (c.direct && phi[c.a.id] < c.a.w) {
            marques[c.y] = { signe: '+', de: x, arc: c.a.id, direct: true };
          } else if (!c.direct && phi[c.a.id] > 0) {
            marques[c.y] = { signe: '-', de: x, arc: c.a.id, direct: false };
          } else continue;
          ordreMarques.push(c.y);
          file.push(c.y);
          E.sommet(c.y, { etat: 'courant', note: c.direct ? '+' + nom(G, x) : '-' + nom(G, x) });
          E.sommet(x, { etat: 'fini' });
          E.arete(c.a.id, 'examen');
          E.capture(c.direct
            ? 'Marquage direct de ' + L(G, c.y) + ' depuis ' + L(G, x) + ' : $\\varphi(' + X + ', ' + Y + ') = ' + phi[c.a.id] + ' < ' + c.a.w + ' = c(' + X + ', ' + Y + ')$, on note $+' + X + '$.'
            : 'Marquage indirect de ' + L(G, c.y) + ' depuis ' + L(G, x) + ' : l\'arc $(' + Y + ', ' + X + ')$ porte un flux $' + phi[c.a.id] + ' > 0$ qu\'on peut diminuer, on note $-' + X + '$.', [puceMarques(), noteValeur()]);
          E.arete(c.a.id, 'neutre');
          E.sommet(c.y, { etat: 'fini' });
        }
      }
      if (!marques[t]) {
        var A = ordreMarques.slice();
        var cap = capaciteCoupe(G, A);
        G.sommets.forEach(function (z) { E.sommet(z, { etat: marques[z] ? 'marque' : 'neutre', note: marques[z] ? E.s[z].note : '' }); });
        var coupe = [];
        G.aretes.forEach(function (a) {
          var dedans = !!marques[a.u], dehors = !marques[a.v];
          if (dedans && dehors) { coupe.push(a); E.arete(a.id, 'rejet'); } else E.arete(a.id, marques[a.u] && marques[a.v] ? 'neutre' : 'attenue');
        });
        E.capture('Impossible de marquer ' + L(G, t) + ' : le flot est maximum, de valeur ' + val + '. Les sommets marqués $\\mathcal{A} = ' + ensemble(A, G.ordre) + '$ donnent une coupe de capacité minimum : $C(\\omega^+(\\mathcal{A})) = ' + coupe.map(function (a) { return a.w; }).join(' + ') + ' = ' + cap + '$ (arcs en rouge, tous saturés).', [puceMarques(), noteValeur()]);
        return { etapes: E.etapes, resultat: { valeur: val, flot: phi, coupe: trier(A, G.ordre), arcsCoupe: coupe.map(function (a) { return a.id; }), capacite: cap, iterations: iter - 1, compatible: comp.ok } };
      }
      // Chaîne augmentante : on remonte les marques depuis t.
      var chaine = [], y = t;
      while (y !== s) { chaine.unshift(marques[y]); chaine[0].vers = y; y = marques[y].de; }
      var marges = chaine.map(function (m) { var a = G.parId[m.arc]; return m.direct ? a.w - phi[a.id] : phi[a.id]; });
      var eps = Math.min.apply(null, marges);
      G.aretes.forEach(function (a) { E.arete(a.id, 'attenue'); });
      chaine.forEach(function (m) { E.arete(m.arc, m.direct ? 'arbre' : 'cycle'); });
      var noms = nom(G, s) + chaine.map(function (m) { return (m.direct ? ' → ' : ' ← ') + nom(G, m.vers); }).join('');
      var tab = tableau('Chaîne augmentante', ['Arc', 'Sens', '$\\varphi$', '$c$', 'Marge'], chaine.map(function (m, i) {
        var a = G.parId[m.arc];
        return [nom(G, a.u) + '→' + nom(G, a.v), m.direct ? 'direct (+)' : 'indirect (-)', String(phi[a.id]), String(a.w), String(marges[i])];
      }));
      E.capture('La sortie ' + L(G, t) + ' est marquée : chaîne augmentante ' + noms + '. $\\varepsilon = \\min(' + marges.join(',\\ ') + ') = ' + eps + '$ (capacité restante sur les arcs directs, flux sur les arcs indirects).', [tab, noteValeur()]);
      chaine.forEach(function (m) { phi[m.arc] += m.direct ? eps : -eps; });
      val += eps;
      majLabels();
      E.capture('On ajoute $\\varepsilon = ' + eps + '$ sur les arcs directs et on le retire sur les arcs indirects. Nouveau flot de valeur ' + val + '.', [tab, noteValeur()]);
    }
    throw new Error('Ford-Fulkerson ne termine pas');
  }

  /* ============================================================ Registre */

  var ALGOS = {
    largeur: { titre: 'Parcours en largeur', fn: largeur, oriente: null, options: ['depart'] },
    profondeur: { titre: 'Parcours en profondeur', fn: profondeur, oriente: null, options: ['depart'] },
    kosaraju: { titre: 'Algorithme de Kosaraju', fn: kosaraju, oriente: true, options: ['depart'] },
    niveaux: { titre: 'Mise en niveaux', fn: niveaux, oriente: true, options: [] },
    kruskal: { titre: 'Kruskal croissant', fn: kruskal, oriente: false, pondere: true, options: [] },
    'kruskal-dec': { titre: 'Kruskal décroissant', fn: kruskalDecroissant, oriente: false, pondere: true, options: [] },
    prim: { titre: 'Algorithme de Prim', fn: prim, oriente: false, pondere: true, options: ['depart'] },
    'welsh-powell': { titre: 'Welsh-Powell', fn: welshPowell, oriente: null, options: [] },
    glouton: { titre: 'Coloration gloutonne', fn: colorationGloutonne, oriente: null, options: ['ordre'] },
    euler: { titre: 'Chaîne eulérienne', fn: tracerEuler, oriente: false, options: ['depart'] },
    noyau: { titre: 'Noyau (graphe sans circuit)', fn: noyauSansCircuit, oriente: true, options: [] },
    dijkstra: { titre: 'Algorithme de Dijkstra', fn: dijkstra, oriente: null, pondere: true, options: ['depart'] },
    bellman: { titre: 'Bellman-Kalaba', fn: bellmanKalaba, oriente: null, pondere: true, options: ['depart'] },
    'bellman-sc': { titre: 'Bellman (graphe sans circuit)', fn: bellmanSansCircuit, oriente: true, pondere: true, options: ['depart'] },
    ordo: { titre: 'Ordonnancement potentiels-tâches', fn: ordonnancement, oriente: true, pondere: true, options: [] },
    ford: { titre: 'Ford-Fulkerson', fn: fordFulkerson, oriente: true, pondere: true, flot: true, options: [] }
  };

  var api = {
    construire: construire,
    comparer: comparer,
    trier: trier,
    texId: texId,
    ensemble: ensemble,
    nom: nom,
    brut: brut,
    areteEntre: areteEntre,
    degres: degres,
    descendants: descendants,
    ascendants: ascendants,
    cfc: cfc,
    composantesConnexes: composantesConnexes,
    estConnexe: estConnexe,
    reduit: reduit,
    arcsPourFConnexe: arcsPourFConnexe,
    partitionNiveaux: partitionNiveaux,
    trouverCircuit: trouverCircuit,
    fermetureTransitive: fermetureTransitive,
    cliqueMax: cliqueMax,
    stableMax: stableMax,
    colorationValide: colorationValide,
    nombreChromatique: nombreChromatique,
    nombreArbresCouvrants: nombreArbresCouvrants,
    euler: euler,
    traceEulerien: traceEulerien,
    noyaux: noyaux,
    acpmPoids: acpmPoids,
    nombreACPM: nombreACPM,
    trierAretes: trierAretes,
    traceProfondeur: traceProfondeur,
    ordreWelshPowell: ordreWelshPowell,
    fmtVal: fmtVal,
    plusCourts: plusCourts,
    matrices: matrices,
    calculOrdo: calculOrdo,
    valeurFlot: valeurFlot,
    flotCompatible: flotCompatible,
    capaciteCoupe: capaciteCoupe,
    coupesMin: coupesMin,
    ALGOS: ALGOS,
    executer: function (nomAlgo, G, opts) {
      var a = ALGOS[nomAlgo];
      if (!a) throw new Error('Algorithme inconnu : ' + nomAlgo);
      return a.fn(G, opts || {});
    }
  };

  racine.Algos = api;
})(typeof window !== 'undefined' ? window : globalThis);
