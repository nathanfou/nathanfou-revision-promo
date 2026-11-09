/*
 * Figures de graphes :
 *   [[widget:graphe|g=id;vue=...;calque=...]]   figure statique (vue : foret, foret2, niveaux, reduit)
 *   [[widget:algo|g=id;algo=kosaraju;depart=1]]  lecteur pas à pas d'un algorithme
 *   [[widget:table|g=id;type=dico]]              tableau calculé (dico, succ, pred, dates, niveaux, degres, matrice, fermeture, kruskal,
 *                                                dijkstra, bellman, bellman-sc, ordo, lambda, routage, taches, flot)
 *   vues : arbo (arborescence des plus courts chemins seule) ; calques : arbo, ordo, flotmax, coupe (ensemble=s,A)
 *   [[widget:chrono|duree=70]]                   chronomètre d'examen
 * Tout ce qui est affiché est calculé à partir de la définition du graphe : les corrigés
 * animés ne peuvent pas contredire la figure.
 */
(function () {
  'use strict';

  var A = window.Algos;
  var Geo = window.GrapheGeo;
  var SVG = window.GrapheSVG;
  var R = window.Rendu;
  var I = window.ICONS;

  function G(id) { return window.ML.G(id); }
  function esc(s) { return R.escape(String(s)); }
  function nomsListe(Gr, liste) { return liste.map(function (x) { return A.nom(Gr, x); }); }

  function cellule(c) {
    if (c === null || c === undefined) return '';
    var parts = String(c).split('~~');
    return parts.map(function (p, i) {
      if (!p) return '';
      var h = R.inline(p);
      return i % 2 ? '<s>' + h + '</s>' : h;
    }).join('');
  }

  function listeOpt(v) {
    return v ? String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
  }

  /* Couleurs explicites "x:1,y:2". */
  function couleursOpt(v) {
    var c = {};
    listeOpt(v).forEach(function (p) {
      var kv = p.split(':');
      c[kv[0].trim()] = Number(kv[1]);
    });
    return c;
  }

  /* ------------------------------------------------------ Figure statique */

  function preparerVue(Gr, opts) {
    var vue = opts.vue || 'normal';
    var res = { G: Gr, positions: null, masquer: null, etat: { sommets: {}, aretes: {} } };
    if (vue === 'foret' || vue === 'foret2') {
      var trace;
      if (vue === 'foret') {
        trace = A.traceProfondeur(Gr, { depart: opts.depart || Gr.sommets[0], recommencer: opts.recommencer !== 'non' });
      } else {
        var t1 = A.traceProfondeur(Gr, { depart: opts.depart || Gr.sommets[0] });
        var ordre = Gr.sommets.slice().sort(function (a, b) { return t1.f[b] - t1.f[a]; });
        trace = A.traceProfondeur(Gr, { sens: 'pred', ordreDeparts: ordre });
      }
      res.positions = Geo.dispositionForet(Gr, trace);
      var garder = {};
      Object.keys(trace.parent).forEach(function (y) {
        var x = trace.parent[y];
        var id = vue === 'foret' ? A.areteEntre(Gr, x, y) : A.areteEntre(Gr, y, x);
        if (id) garder[id] = true;
      });
      res.masquer = {};
      Gr.aretes.forEach(function (e) { if (!garder[e.id]) res.masquer[e.id] = true; });
      Gr.sommets.forEach(function (x) {
        res.etat.sommets[x] = { note: trace.d[x] !== undefined ? (vue === 'foret' ? trace.d[x] + '/' + trace.f[x] : '') : '' };
      });
      if (vue === 'foret2') {
        trace.arbres.forEach(function (arbre, i) { arbre.forEach(function (x) { res.etat.sommets[x].couleur = i + 1; }); });
      }
      Object.keys(garder).forEach(function (id) { res.etat.aretes[id] = 'arbre'; });
    } else if (vue === 'niveaux') {
      var niv = A.partitionNiveaux(Gr);
      if (!niv.sansCircuit) throw new Error('vue niveaux impossible : circuit dans ' + Gr.id);
      res.positions = Geo.dispositionNiveaux(Gr, niv.niveaux);
      niv.niveaux.forEach(function (N, k) { N.forEach(function (x) { res.etat.sommets[x] = { note: 'N' + k }; }); });
    } else if (vue === 'arbo') {
      var ra = A.plusCourts(Gr, opts.depart || Gr.sommets[0], opts.methode || 'dijkstra', opts.mode);
      res.masquer = {};
      Gr.aretes.forEach(function (e) { if (ra.arcs.indexOf(e.id) === -1) res.masquer[e.id] = true; else res.etat.aretes[e.id] = 'arbre'; });
      Gr.sommets.forEach(function (x) { res.etat.sommets[x] = { note: opts.notes === 'non' ? '' : A.fmtVal(ra.lambda[x]) }; });
    } else if (vue === 'reduit') {
      var comps = A.executer('kosaraju', Gr, { depart: opts.depart || Gr.sommets[0] }).resultat.comps;
      var Gred = Geo.grapheReduit(Gr, comps);
      res.G = Gred;
      res.positions = Gred.pos;
      Gred.niveaux.forEach(function (N, k) { N.forEach(function (x) { res.etat.sommets[x] = { note: 'N' + k, couleur: Number(x.slice(1)) }; }); });
      if (opts.notes === 'non') Gred.sommets.forEach(function (x) { res.etat.sommets[x].note = ''; });
    }
    return res;
  }

  function appliquerCalques(Gr, opts, etat) {
    var calques = listeOpt(opts.calque);
    function s(x) { return (etat.sommets[x] = etat.sommets[x] || {}); }
    calques.forEach(function (c) {
      if (c === 'dates') {
        var t = A.traceProfondeur(Gr, { depart: opts.depart || Gr.sommets[0] });
        Gr.sommets.forEach(function (x) { if (t.d[x] !== undefined) s(x).note = t.d[x] + '/' + t.f[x]; });
      } else if (c === 'cfc') {
        var comps = A.executer('kosaraju', Gr, { depart: opts.depart || Gr.sommets[0] }).resultat.comps;
        comps.forEach(function (comp, i) { comp.forEach(function (x) { s(x).couleur = i + 1; }); });
      } else if (c === 'acpm') {
        var k = A.executer(opts.methode === 'prim' ? 'prim' : 'kruskal', Gr, { depart: opts.depart }).resultat;
        Gr.aretes.forEach(function (e) { etat.aretes[e.id] = k.aretes.indexOf(e.id) !== -1 ? 'arbre' : 'attenue'; });
      } else if (c === 'welsh') {
        var w = A.executer('welsh-powell', Gr).resultat;
        Gr.sommets.forEach(function (x) { s(x).couleur = w.couleurs[x]; s(x).note = 'c' + w.couleurs[x]; });
      } else if (c === 'niveaux') {
        A.partitionNiveaux(Gr).niveaux.forEach(function (N, k2) { N.forEach(function (x) { s(x).note = 'N' + k2; }); });
      } else if (c === 'degres' || c === 'impairs') {
        var d = A.degres(Gr);
        Gr.sommets.forEach(function (x) {
          s(x).note = Gr.oriente ? '+' + d[x].plus + ' −' + d[x].moins : 'd=' + d[x].total;
          if (c === 'impairs' && d[x].total % 2 === 1) s(x).etat = 'impair';
        });
      } else if (c === 'arbo') {
        var ra = A.plusCourts(Gr, opts.depart || Gr.sommets[0], opts.methode || 'dijkstra', opts.mode);
        Gr.sommets.forEach(function (x) { s(x).note = A.fmtVal(ra.lambda[x]); });
        Gr.aretes.forEach(function (e) { etat.aretes[e.id] = ra.arcs.indexOf(e.id) !== -1 ? 'arbre' : 'attenue'; });
        if (opts.depart) s(opts.depart).etat = 'marque';
      } else if (c === 'ordo') {
        var R = A.calculOrdo(Gr);
        Gr.sommets.forEach(function (x) { s(x).note = R.t[x] + ' | ' + R.ts[x]; if (R.MT[x] === 0) s(x).etat = 'marque'; });
        Gr.aretes.forEach(function (e) { etat.aretes[e.id] = R.arcsCritiques.indexOf(e.id) !== -1 ? 'arbre' : 'neutre'; });
      } else if (c === 'flotmax') {
        var f = A.executer('ford', Gr).resultat;
        etat.labels = {};
        Gr.aretes.forEach(function (e) {
          etat.labels[e.id] = f.flot[e.id] + '(' + e.w + ')';
          etat.aretes[e.id] = f.arcsCoupe.indexOf(e.id) !== -1 ? 'rejet' : 'neutre';
        });
        f.coupe.forEach(function (x) { s(x).etat = 'marque'; });
      } else if (c === 'coupe') {
        var Acoupe = listeOpt(opts.ensemble);
        Acoupe.forEach(function (x) { s(x).etat = 'marque'; });
        Gr.aretes.forEach(function (e) { etat.aretes[e.id] = Acoupe.indexOf(e.u) !== -1 && Acoupe.indexOf(e.v) === -1 ? 'rejet' : 'neutre'; });
      } else if (c === 'noyau') {
        var N0 = A.noyaux(Gr)[0] || [];
        N0.forEach(function (x) { s(x).etat = 'noyau'; });
      }
    });
    var couleurs = couleursOpt(opts.couleurs);
    Object.keys(couleurs).forEach(function (x) { s(x).couleur = couleurs[x]; if (opts.notes !== 'non') s(x).note = s(x).note || 'c' + couleurs[x]; });
    listeOpt(opts.sommets).forEach(function (x) { s(x).etat = 'marque'; });
    var marquees = listeOpt(opts.marquer);
    marquees.forEach(function (id) { etat.aretes[id] = 'arbre'; });
    if (opts.attenuer === 'reste' && marquees.length) {
      Gr.aretes.forEach(function (e) { if (marquees.indexOf(e.id) === -1) etat.aretes[e.id] = 'attenue'; });
    }
    listeOpt(opts.barrer).forEach(function (id) { etat.aretes[id] = 'rejet'; });
    if (opts.notes === 'non') Object.keys(etat.sommets).forEach(function (x) { if (!couleurs[x]) etat.sommets[x].note = ''; });
  }

  window.Widgets.definir('graphe', function (hote, opts) {
    hote.classList.add('widget-graphe');
    var Gr = G(opts.g);
    var v = preparerVue(Gr, opts);
    appliquerCalques(v.G, opts, v.etat);
    var fig = document.createElement('div');
    fig.className = 'gfig-wrap';
    hote.appendChild(fig);
    var ctrl = SVG.creer(fig, v.G, { positions: v.positions, masquer: v.masquer, echelle: opts.echelle ? Number(opts.echelle) : undefined, capacites: opts.flot === 'non' });
    ctrl.appliquer(v.etat);
    if (opts.legende) {
      var cap = document.createElement('p');
      cap.className = 'gfig-legende';
      cap.innerHTML = R.inline(opts.legende);
      hote.appendChild(cap);
    }
  });

  /* ------------------------------------------------------ Tableaux calculés */

  function tableHtml(entetes, lignes, opts) {
    opts = opts || {};
    var cols = opts.colonnes || [];
    function hlCol(j) { return cols.indexOf(j) !== -1 ? ' class="is-hl-col"' : ''; }
    return '<div class="table-wrap' + (opts.classe ? ' ' + opts.classe : '') + '"><table><thead><tr>' +
      entetes.map(function (h, j) { return '<th' + hlCol(j) + '>' + cellule(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      lignes.map(function (l, i) {
        var cls = opts.surligne && opts.surligne.indexOf(i) !== -1 ? ' class="is-hl"' : '';
        return '<tr' + cls + '>' + l.map(function (c, j) {
          var coul = opts.couleurs && j === (opts.colCouleur || 0) && opts.couleurs[i] ? ' data-couleur="' + (((opts.couleurs[i] - 1) % 8) + 1) + '"' : '';
          var hc = j > 0 ? hlCol(j) : '';
          return (j === 0 && opts.entetesLignes ? '<th' + coul + '>' : '<td' + coul + hc + '>') + cellule(c) + (j === 0 && opts.entetesLignes ? '</th>' : '</td>');
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function tableGraphe(Gr, type, opts) {
    var S = Gr.sommets;
    var noms = nomsListe(Gr, S);
    function liste(l) { return l.length ? nomsListe(Gr, l).join(', ') : ''; }
    switch (type) {
      case 'dico':
        if (!Gr.oriente) return tableHtml(['$x$'].concat(noms), [['$\\Gamma(x)$'].concat(S.map(function (x) { return liste(Gr.voisins[x]); }))], { entetesLignes: true, classe: 'table-dico' });
        return tableHtml(['$x$'].concat(noms), [
          ['$\\Gamma^-(x)$'].concat(S.map(function (x) { return liste(Gr.pred[x]); })),
          ['$\\Gamma^+(x)$'].concat(S.map(function (x) { return liste(Gr.succ[x]); }))
        ], { entetesLignes: true, classe: 'table-dico' });
      case 'succ':
        return tableHtml(['$x$'].concat(noms), [['$\\Gamma^+(x)$'].concat(S.map(function (x) { return liste(Gr.succ[x]); }))], { entetesLignes: true, classe: 'table-dico' });
      case 'pred':
        return tableHtml(['$x$'].concat(noms), [['$\\Gamma^-(x)$'].concat(S.map(function (x) { return liste(Gr.pred[x]); }))], { entetesLignes: true, classe: 'table-dico' });
      case 'dates': {
        var t = A.traceProfondeur(Gr, { depart: opts.depart || S[0], recommencer: opts.recommencer !== 'non' });
        return tableHtml(['$x$'].concat(noms), [
          ['pré-visite $d(x)$'].concat(S.map(function (x) { return t.d[x] !== undefined ? String(t.d[x]) : ''; })),
          ['post-visite $f(x)$'].concat(S.map(function (x) { return t.f[x] !== undefined ? String(t.f[x]) : ''; }))
        ], { entetesLignes: true, classe: 'table-dico' });
      }
      case 'niveaux': {
        var niv = A.partitionNiveaux(Gr);
        var lignes = niv.niveaux.map(function (N, k) { return ['$N_{' + k + '}$', liste(N)]; });
        if (niv.reste.length) lignes.push(['non placés', liste(niv.reste)]);
        return tableHtml(['Niveau', 'Sommets'], lignes, { entetesLignes: true });
      }
      case 'degres': {
        var d = A.degres(Gr);
        if (!Gr.oriente) return tableHtml(['$x$'].concat(noms), [['$d(x)$'].concat(S.map(function (x) { return String(d[x].total); }))], { entetesLignes: true, classe: 'table-dico' });
        return tableHtml(['$x$'].concat(noms), [
          ['$d^+(x)$'].concat(S.map(function (x) { return String(d[x].plus); })),
          ['$d^-(x)$'].concat(S.map(function (x) { return String(d[x].moins); })),
          ['$d(x)$'].concat(S.map(function (x) { return String(d[x].total); }))
        ], { entetesLignes: true, classe: 'table-dico' });
      }
      case 'matrice': {
        return tableHtml([''].concat(noms), S.map(function (x) {
          return [A.nom(Gr, x)].concat(S.map(function (y) {
            var n = Gr.aretes.filter(function (e) { return (e.u === x && e.v === y) || (!Gr.oriente && e.u === y && e.v === x); }).length;
            return String(n);
          }));
        }), { entetesLignes: true, classe: 'table-matrice' });
      }
      case 'fermeture': {
        var M = A.fermetureTransitive(Gr);
        return tableHtml([''].concat(noms), S.map(function (x) {
          return [A.nom(Gr, x)].concat(S.map(function (y) { return String(M[x][y]); }));
        }), { entetesLignes: true, classe: 'table-matrice' });
      }
      case 'kruskal': {
        var k = A.executer('kruskal', Gr).resultat;
        var triees = A.trierAretes(Gr, false);
        var dernier = triees.findIndex(function (e) { return e.id === k.aretes[k.aretes.length - 1]; });
        return tableHtml(['Arête', 'Poids', 'Décision'], triees.map(function (e, i) {
          var dec = k.aretes.indexOf(e.id) !== -1 ? 'gardée' : i > dernier ? 'inutile (déjà $n-1$ arêtes)' : 'rejetée (cycle)';
          return [A.nom(Gr, e.u) + '-' + A.nom(Gr, e.v), String(e.w), dec];
        }), {});
      }
      case 'aretes': {
        var tri = A.trierAretes(Gr, opts.ordre === 'decroissant');
        return tableHtml(['Arête', 'Poids'], tri.map(function (e) { return [A.nom(Gr, e.u) + '-' + A.nom(Gr, e.v), String(e.w)]; }), {});
      }
      case 'dijkstra':
      case 'bellman':
      case 'bellman-sc':
      case 'ordo': {
        var r = A.executer(type, Gr, { depart: opts.depart, mode: opts.mode });
        var der = r.etapes[r.etapes.length - 1].panneaux.filter(function (p) { return p.type === 'table'; })[0];
        return tableHtml(der.cols, der.lignes, { entetesLignes: !!der.compact, classe: der.compact ? 'table-dico' : '' });
      }
      case 'lambda':
      case 'routage': {
        var Mx = A.matrices(Gr, listeOpt(opts.racines), opts.methode);
        var cle = type === 'lambda' ? 'lambda' : 'm';
        return tableHtml([type === 'lambda' ? '$\\Lambda$' : '$M$'].concat(noms), S.map(function (x) {
          return [A.nom(Gr, x)].concat(S.map(function (y) {
            if (x === y) return '×';
            var v = Mx[cle][x][y];
            // Matrice complète : une case vide veut dire « pas de chemin » ; pré-remplissage : « pas encore connu ».
            if (v === null) return opts.racines ? '?' : cle === 'm' ? '-' : '∞';
            return cle === 'm' ? A.nom(Gr, v) : String(v);
          }));
        }), { entetesLignes: true, classe: 'table-matrice' });
      }
      case 'taches': {
        var dt = Gr.def.durees || {}, av = Gr.def.avant || {};
        return tableHtml(['Tâche', 'Durée', 'Après'], (Gr.def.taches || []).map(function (x) {
          var pre = (av[x] || '').trim().split(/\s+/).filter(Boolean);
          return [Gr.def.libelles && Gr.def.libelles[x] ? x + ' : ' + Gr.def.libelles[x] : x, String(dt[x]), pre.length ? pre.join(', ') : '(début)'];
        }), {});
      }
      case 'flot': {
        var phi = opts.flot === 'max' ? A.executer('ford', Gr).resultat.flot : Gr.flot;
        return tableHtml(['Arc', 'Flux $\\varphi$', 'Capacité $c$', 'État'], Gr.aretes.map(function (e) {
          return [A.nom(Gr, e.u) + '→' + A.nom(Gr, e.v), String(phi[e.id]), String(e.w), phi[e.id] === e.w ? 'saturé' : phi[e.id] === 0 ? 'flux nul' : 'reste ' + (e.w - phi[e.id])];
        }), {});
      }
      case 'welsh': {
        var dg = A.degres(Gr);
        var w = A.executer('welsh-powell', Gr).resultat;
        return tableHtml(['Sommet', 'Degré', 'Couleur'], w.ordre.map(function (x) { return [A.nom(Gr, x), String(dg[x].total), String(w.couleurs[x])]; }), { couleurs: w.ordre.map(function (x) { return w.couleurs[x]; }), colCouleur: 2 });
      }
    }
    throw new Error('Type de tableau inconnu : ' + type);
  }

  window.Widgets.definir('table', function (hote, opts) {
    hote.classList.add('widget-table');
    hote.innerHTML = tableGraphe(G(opts.g), opts.type, opts) + (opts.legende ? '<p class="gfig-legende">' + R.inline(opts.legende) + '</p>' : '');
  });

  /* ------------------------------------------------------ Lecteur pas à pas */

  function rendrePanneau(p) {
    if (p.type === 'puces') {
      return '<div class="algo-panel"><div class="algo-panel-t">' + cellule(p.titre) + '</div><div class="algo-chips">' +
        (p.items.length ? p.items.map(function (it) {
          return '<span class="algo-chip' + (it.etat === 'haut' ? ' is-top' : '') + '"' + (it.couleur ? ' data-couleur="' + (((it.couleur - 1) % 8) + 1) + '"' : '') + '>' + esc(it.txt) + '</span>';
        }).join('') : '<span class="algo-empty">' + esc(p.vide || 'vide') + '</span>') + '</div></div>';
    }
    if (p.type === 'table') {
      return '<div class="algo-panel algo-panel-table"><div class="algo-panel-t">' + cellule(p.titre) + '</div>' +
        tableHtml(p.cols, p.lignes, { surligne: p.surligne, colonnes: p.colonnes, entetesLignes: !!p.compact, classe: p.compact ? 'table-dico' : '', couleurs: p.couleurs, colCouleur: 2 }) + '</div>';
    }
    if (p.type === 'note') {
      return '<div class="algo-panel algo-note"><span>' + cellule(p.titre) + '</span><strong>' + esc(p.txt) + '</strong></div>';
    }
    return '';
  }

  window.Widgets.definir('algo', function (hote, opts, signal) {
    hote.classList.add('widget-algo');
    var meta = A.ALGOS[opts.algo];
    if (!meta) throw new Error('algorithme inconnu ' + opts.algo);
    var choix = listeOpt(opts.choix);
    var etat = { gid: opts.g || choix[0], depart: opts.depart || null, i: 0, etapes: [], ctrl: null, minuterie: null };

    hote.tabIndex = 0;
    hote.setAttribute('aria-label', meta.titre + ', animation pas à pas. Flèches gauche et droite pour avancer.');
    hote.innerHTML =
      '<div class="widget-title">' + I.play + '<span>' + esc(opts.titre || meta.titre) + '</span><span class="algo-tag">pas à pas</span></div>' +
      '<div class="algo-config"></div>' +
      '<div class="algo-fig"></div>' +
      '<div class="algo-bar">' +
        '<div class="algo-btns" role="group" aria-label="Contrôles de l\'animation">' +
          '<button type="button" class="algo-btn" data-a="debut" aria-label="Revenir au début">' + I.skipBack + '</button>' +
          '<button type="button" class="algo-btn" data-a="prec" aria-label="Étape précédente">' + I.caretLeftB + '</button>' +
          '<button type="button" class="algo-btn algo-play" data-a="lecture" aria-label="Lecture automatique">' + I.play + '<span>Lecture</span></button>' +
          '<button type="button" class="algo-btn algo-next" data-a="suiv" aria-label="Étape suivante">' + '<span>Suivant</span>' + I.caretRightB + '</button>' +
          '<button type="button" class="algo-btn" data-a="fin" aria-label="Aller à la fin">' + I.skipForward + '</button>' +
        '</div>' +
        '<div class="algo-progress"><input type="range" min="0" max="0" value="0" aria-label="Étape"><span class="algo-count"></span></div>' +
      '</div>' +
      '<div class="algo-texte" aria-live="polite"></div>' +
      '<div class="algo-panneaux"></div>';

    var qs = function (s) { return hote.querySelector(s); };
    var zoneFig = qs('.algo-fig'), texte = qs('.algo-texte'), panneaux = qs('.algo-panneaux');
    var range = qs('input[type="range"]'), compte = qs('.algo-count'), config = qs('.algo-config');
    var btnLecture = qs('[data-a="lecture"]');

    function construireConfig() {
      var html = '';
      if (choix.length > 1) {
        html += '<label class="algo-select"><span>Graphe</span><select data-c="g">' + choix.map(function (id) {
          var def = window.ML.graphes[id] || {};
          return '<option value="' + esc(id) + '"' + (id === etat.gid ? ' selected' : '') + '>' + esc(def.titre || id) + '</option>';
        }).join('') + '</select></label>';
      }
      if (meta.options.indexOf('depart') !== -1 && (choix.length || opts.choisirDepart)) {
        var Gr = G(etat.gid);
        if (!etat.depart || Gr.sommets.indexOf(etat.depart) === -1) etat.depart = Gr.sommets[0];
        html += '<label class="algo-select"><span>Départ</span><select data-c="depart">' + Gr.sommets.map(function (x) {
          return '<option value="' + esc(x) + '"' + (x === etat.depart ? ' selected' : '') + '>' + esc(A.nom(Gr, x)) + '</option>';
        }).join('') + '</select></label>';
      }
      config.innerHTML = html;
      config.hidden = !html;
    }

    function preparer() {
      arreter();
      var Gr = G(etat.gid);
      var o = { depart: etat.depart || undefined, ordre: opts.ordre, mode: opts.mode };
      etat.etapes = A.executer(opts.algo, Gr, o).etapes;
      zoneFig.innerHTML = '';
      etat.ctrl = SVG.creer(zoneFig, Gr, {});
      range.max = String(etat.etapes.length - 1);
      aller(0);
    }

    function aller(i) {
      etat.i = Math.max(0, Math.min(etat.etapes.length - 1, i));
      var e = etat.etapes[etat.i];
      etat.ctrl.appliquer(e);
      texte.innerHTML = R.inline(e.texte);
      panneaux.innerHTML = e.panneaux.map(rendrePanneau).join('');
      range.value = String(etat.i);
      compte.textContent = 'Étape ' + (etat.i + 1) + ' / ' + etat.etapes.length;
      range.style.setProperty('--p', etat.etapes.length > 1 ? (etat.i / (etat.etapes.length - 1) * 100) + '%' : '100%');
      qs('[data-a="prec"]').disabled = etat.i === 0;
      qs('[data-a="debut"]').disabled = etat.i === 0;
      qs('[data-a="suiv"]').disabled = etat.i === etat.etapes.length - 1;
      qs('[data-a="fin"]').disabled = etat.i === etat.etapes.length - 1;
    }

    function arreter() {
      if (etat.minuterie) { clearInterval(etat.minuterie); etat.minuterie = null; }
      btnLecture.innerHTML = I.play + '<span>Lecture</span>';
      btnLecture.setAttribute('aria-label', 'Lecture automatique');
      hote.classList.remove('is-playing');
    }

    function lire() {
      if (etat.i >= etat.etapes.length - 1) aller(0);
      btnLecture.innerHTML = I.pause + '<span>Pause</span>';
      btnLecture.setAttribute('aria-label', 'Mettre en pause');
      hote.classList.add('is-playing');
      etat.minuterie = setInterval(function () {
        if (etat.i >= etat.etapes.length - 1) { arreter(); return; }
        aller(etat.i + 1);
      }, Number(opts.vitesse) || 1300);
    }

    hote.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b || !hote.contains(b)) return;
      var a = b.getAttribute('data-a');
      if (a === 'lecture') { if (etat.minuterie) arreter(); else lire(); return; }
      arreter();
      if (a === 'debut') aller(0);
      else if (a === 'prec') aller(etat.i - 1);
      else if (a === 'suiv') aller(etat.i + 1);
      else if (a === 'fin') aller(etat.etapes.length - 1);
    }, { signal: signal });

    range.addEventListener('input', function () { arreter(); aller(Number(range.value)); }, { signal: signal });

    config.addEventListener('change', function (e) {
      var c = e.target.getAttribute('data-c');
      if (c === 'g') { etat.gid = e.target.value; etat.depart = null; construireConfig(); }
      if (c === 'depart') etat.depart = e.target.value;
      preparer();
    }, { signal: signal });

    hote.addEventListener('keydown', function (e) {
      if (e.target.closest('select, input')) return;
      var k = e.key;
      if (k === 'ArrowRight') { arreter(); aller(etat.i + 1); }
      else if (k === 'ArrowLeft') { arreter(); aller(etat.i - 1); }
      else if (k === 'Home') { arreter(); aller(0); }
      else if (k === 'End') { arreter(); aller(etat.etapes.length - 1); }
      else if (k === ' ' && !e.target.closest('button')) { if (etat.minuterie) arreter(); else lire(); }
      else return;
      e.preventDefault();
    }, { signal: signal });

    if (signal) signal.addEventListener('abort', arreter);

    construireConfig();
    preparer();
  });

  /* ------------------------------------------------------ Chronomètre */

  window.Widgets.definir('chrono', function (hote, opts, signal) {
    hote.classList.add('widget-chrono');
    var duree = (Number(opts.duree) || 70) * 60;
    var cle = window.LABO.slug + '.chrono.' + (opts.cle || location.hash);
    var st = { debut: null, ecoule: 0 };
    try { var brut = sessionStorage.getItem(cle); if (brut) st = JSON.parse(brut); } catch (e) { /* stockage indisponible */ }
    hote.innerHTML =
      '<div class="chrono-main"><div class="chrono-temps" aria-live="off"></div><div class="chrono-sous"></div></div>' +
      '<div class="actions"><button type="button" class="btn btn-primary btn-small" data-c="go">' + I.play + '<span>Démarrer</span></button>' +
      '<button type="button" class="btn btn-ghost btn-small" data-c="raz">' + I.arrowsClockwise + '<span>Remettre à zéro</span></button></div>';
    var aff = hote.querySelector('.chrono-temps'), sous = hote.querySelector('.chrono-sous'), go = hote.querySelector('[data-c="go"]');
    var tic = null;
    function sauver() { try { sessionStorage.setItem(cle, JSON.stringify(st)); } catch (e) { /* ignoré */ } }
    function ecoule() { return st.ecoule + (st.debut ? (Date.now() - st.debut) / 1000 : 0); }
    function fmt(s) {
      s = Math.max(0, Math.round(s));
      var m = Math.floor(s / 60), r = s % 60;
      return m + ':' + String(r).padStart(2, '0');
    }
    function maj() {
      var reste = duree - ecoule();
      aff.textContent = fmt(Math.abs(reste));
      hote.classList.toggle('is-over', reste < 0);
      hote.classList.toggle('is-running', !!st.debut);
      sous.textContent = reste < 0 ? 'Temps dépassé de ' + fmt(-reste) : st.debut ? 'restant sur ' + fmt(duree) : (st.ecoule ? 'en pause' : 'durée de l\'épreuve : ' + fmt(duree));
      go.innerHTML = st.debut ? I.pause + '<span>Pause</span>' : I.play + '<span>' + (st.ecoule ? 'Reprendre' : 'Démarrer') + '</span>';
    }
    hote.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      if (b.getAttribute('data-c') === 'go') {
        if (st.debut) { st.ecoule = ecoule(); st.debut = null; } else { st.debut = Date.now(); }
      } else {
        st = { debut: null, ecoule: 0 };
      }
      sauver();
      maj();
    }, { signal: signal });
    tic = setInterval(maj, 500);
    if (signal) signal.addEventListener('abort', function () { clearInterval(tic); });
    maj();
  });

  window.WidgetsGraphes = { tableGraphe: tableGraphe, preparerVue: preparerVue };
})();
