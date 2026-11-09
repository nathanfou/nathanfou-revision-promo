/*
 * Rendu SVG d'un graphe à partir de la scène calculée par GrapheGeo.
 * Les états (sommet courant, arête de l'arbre, couleur...) passent par des attributs data-*,
 * le style et les transitions sont dans pages.css.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var Geo = window.GrapheGeo;
  var A = window.Algos;

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  function description(G) {
    var type = G.oriente ? 'Graphe orienté' : 'Graphe non orienté';
    var liens = G.aretes.map(function (e) {
      return A.nom(G, e.u) + (G.oriente ? ' vers ' : '-') + A.nom(G, e.v) + (e.w !== null ? ' (' + e.w + ')' : '');
    });
    return type + ', sommets ' + G.sommets.map(function (x) { return A.nom(G, x); }).join(', ') + (liens.length ? '. ' + (G.oriente ? 'Arcs : ' : 'Arêtes : ') + liens.join(', ') : '') + '.';
  }

  /*
   * Crée la figure dans hote. opts : positions, masquer, notes (false pour ne pas réserver la place).
   * Renvoie { svg, scene, appliquer(etat) }.
   */
  function creer(hote, G, opts) {
    opts = opts || {};
    var S = Geo.mise(G, opts);
    var svg = el('svg', {
      class: 'gfig' + (G.oriente ? ' gfig-oriente' : ''),
      viewBox: S.vb.join(' '),
      width: S.W,
      height: S.H,
      role: 'img',
      'aria-label': opts.label || description(G)
    });
    svg.style.maxWidth = S.W + 'px';

    var gA = el('g', { class: 'g-aretes' }, svg);
    var gE = el('g', { class: 'g-etiquettes' }, svg);
    var gS = el('g', { class: 'g-sommets' }, svg);
    var gN = el('g', { class: 'g-notes' }, svg);

    var noeudsA = {}, noeudsS = {}, noeudsN = {}, noeudsE = {};

    S.aretes.forEach(function (g) {
      var grp = el('g', { class: 'g-arete', 'data-id': g.id, 'data-etat': 'neutre' }, gA);
      el('path', { class: 'g-trait', d: g.trait }, grp);
      if (g.fleche) el('path', { class: 'g-fleche', d: g.fleche }, grp);
      noeudsA[g.id] = grp;
      if (g.label) {
        var lg = el('g', { class: 'g-poids', 'data-id': g.id, 'data-etat': 'neutre' }, gE);
        el('rect', { x: (g.label.x - g.label.w / 2).toFixed(1), y: (g.label.y - g.label.h / 2).toFixed(1), width: g.label.w, height: g.label.h, rx: 5 }, lg);
        var t = el('text', { x: g.label.x.toFixed(1), y: (g.label.y + 4.3).toFixed(1), 'text-anchor': 'middle' }, lg);
        t.textContent = g.label.txt;
        t.setAttribute('data-initial', g.label.txt);
        noeudsE[g.id] = lg;
      }
    });

    S.ids.forEach(function (x) {
      var p = S.pos[x], f = S.formes[x];
      var grp = el('g', { class: 'g-sommet', 'data-id': x, 'data-etat': 'neutre' }, gS);
      if (f.type === 'cercle') {
        el('circle', { class: 'g-halo', cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: f.r + 5 }, grp);
        el('circle', { class: 'g-forme', cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: f.r }, grp);
      } else {
        el('rect', { class: 'g-halo', x: (p[0] - f.w / 2 - 5).toFixed(1), y: (p[1] - f.h / 2 - 5).toFixed(1), width: f.w + 10, height: f.h + 10, rx: f.h / 2 + 5 }, grp);
        el('rect', { class: 'g-forme', x: (p[0] - f.w / 2).toFixed(1), y: (p[1] - f.h / 2).toFixed(1), width: f.w, height: f.h, rx: f.h / 2 }, grp);
      }
      var t = el('text', { class: 'g-nom' + (f.type === 'pilule' ? ' g-nom-long' : ''), x: p[0].toFixed(1), y: (p[1] + 5).toFixed(1), 'text-anchor': 'middle' }, grp);
      t.textContent = A.nom(G, x);
      noeudsS[x] = grp;
      var n = S.notes[x];
      var tn = el('text', { class: 'g-note', x: n.x, y: n.y, 'text-anchor': n.ancre, 'data-id': x }, gN);
      noeudsN[x] = tn;
    });

    hote.appendChild(svg);

    function appliquer(etat) {
      etat = etat || {};
      var es = etat.sommets || {}, ea = etat.aretes || {};
      S.ids.forEach(function (x) {
        var s = es[x] || {};
        var g = noeudsS[x];
        g.setAttribute('data-etat', s.etat || 'neutre');
        if (s.couleur) g.setAttribute('data-couleur', String(((s.couleur - 1) % 8) + 1));
        else g.removeAttribute('data-couleur');
        var n = noeudsN[x];
        var txt = s.note === undefined || s.note === null ? '' : String(s.note);
        if (n.textContent !== txt) n.textContent = txt;
        if (s.couleur) n.setAttribute('data-couleur', String(((s.couleur - 1) % 8) + 1));
        else n.removeAttribute('data-couleur');
      });
      Object.keys(noeudsA).forEach(function (id) {
        var v = ea[id] || 'neutre';
        noeudsA[id].setAttribute('data-etat', v);
        if (noeudsE[id]) noeudsE[id].setAttribute('data-etat', v);
      });
      // Étiquettes d'arcs variables (flux d'un réseau) : texte remplacé, largeur gardée.
      var labs = etat.labels || {};
      Object.keys(noeudsE).forEach(function (id) {
        var t = noeudsE[id].querySelector('text');
        var txt = labs[id] !== undefined ? String(labs[id]) : t.getAttribute('data-initial');
        if (t.textContent !== txt) t.textContent = txt;
      });
    }

    appliquer({});
    return { svg: svg, scene: S, appliquer: appliquer };
  }

  window.GrapheSVG = { creer: creer, description: description };
})();
