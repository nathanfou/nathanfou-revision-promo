/*
 * Figures interactives. Chaque figure est déclarée avec Widgets.definir(nom, fonction).
 * Dans le contenu : [[widget:nom|cle=valeur;cle2=valeur]].
 * Les figures propres à la matière sont dans widgets-matiere.js.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var registre = {};
  var compteur = 0;

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  function fmt(v, d) {
    if (d === undefined) d = 2;
    if (!isFinite(v)) return '∞';
    var s = (Math.abs(v) < Math.pow(10, -d) / 2 ? 0 : v).toFixed(d);
    return s.replace('.', ',').replace('-', '−');
  }

  function tex(t) {
    return window.Rendu.math(t, false);
  }

  function uid(prefixe) {
    compteur += 1;
    return prefixe + '-' + compteur;
  }

  /* Repère : conversions coordonnées mathématiques <-> SVG. */
  function repere(o) {
    var r = {
      W: o.W, H: o.H, pad: o.pad === undefined ? 28 : o.pad,
      xmin: o.xmin, xmax: o.xmax, ymin: o.ymin, ymax: o.ymax
    };
    r.sx = function (x) { return r.pad + (x - r.xmin) / (r.xmax - r.xmin) * (r.W - 2 * r.pad); };
    r.sy = function (y) { return r.H - r.pad - (y - r.ymin) / (r.ymax - r.ymin) * (r.H - 2 * r.pad); };
    r.ix = function (px) { return r.xmin + (px - r.pad) / (r.W - 2 * r.pad) * (r.xmax - r.xmin); };
    r.iy = function (py) { return r.ymin + (r.H - r.pad - py) / (r.H - 2 * r.pad) * (r.ymax - r.ymin); };
    return r;
  }

  function creerSvg(parent, W, H, label) {
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'fig', role: 'img', 'aria-label': label || 'Figure' }, parent);
    return svg;
  }

  function grille(svg, r, pasX, pasY, options) {
    options = options || {};
    var g = el('g', {}, svg);
    var x0 = Math.ceil(r.xmin / pasX) * pasX;
    for (var x = x0; x <= r.xmax + 1e-9; x += pasX) {
      el('line', { x1: r.sx(x), x2: r.sx(x), y1: r.sy(r.ymin), y2: r.sy(r.ymax), class: 'grid' }, g);
    }
    var y0 = Math.ceil(r.ymin / pasY) * pasY;
    for (var y = y0; y <= r.ymax + 1e-9; y += pasY) {
      el('line', { x1: r.sx(r.xmin), x2: r.sx(r.xmax), y1: r.sy(y), y2: r.sy(y), class: 'grid' }, g);
    }
    if (r.ymin <= 0 && r.ymax >= 0) el('line', { x1: r.sx(r.xmin), x2: r.sx(r.xmax), y1: r.sy(0), y2: r.sy(0), class: 'axis' }, g);
    if (r.xmin <= 0 && r.xmax >= 0 && !options.sansAxeY) el('line', { x1: r.sx(0), x2: r.sx(0), y1: r.sy(r.ymin), y2: r.sy(r.ymax), class: 'axis' }, g);
    return g;
  }

  function texte(svg, x, y, contenu, classe, ancre) {
    var t = el('text', { x: x, y: y, class: classe || 'lbl', 'text-anchor': ancre || 'start' }, svg);
    t.textContent = contenu;
    return t;
  }

  /* Tracé d'une fonction : coupe le chemin hors cadre ou sur valeur non définie. */
  function cheminFonction(r, f, x1, x2, n) {
    n = n || 300;
    var d = '';
    var enCours = false;
    var marge = (r.ymax - r.ymin) * 2;
    for (var i = 0; i <= n; i++) {
      var x = x1 + (x2 - x1) * i / n;
      var y = f(x);
      if (!isFinite(y) || y > r.ymax + marge || y < r.ymin - marge) { enCours = false; continue; }
      d += (enCours ? 'L' : 'M') + r.sx(x).toFixed(2) + ' ' + r.sy(y).toFixed(2);
      enCours = true;
    }
    return d;
  }

  function clip(svg, r) {
    var id = uid('clip');
    var defs = el('defs', {}, svg);
    var cp = el('clipPath', { id: id }, defs);
    el('rect', { x: r.pad, y: r.pad, width: r.W - 2 * r.pad, height: r.H - 2 * r.pad }, cp);
    return 'url(#' + id + ')';
  }

  /* Glisser-déposer : renvoie les coordonnées SVG du pointeur. */
  function glisser(svg, signal, surDebut, surMouvement) {
    var actif = false;
    function point(e) {
      var pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    svg.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      var p = point(e);
      if (surDebut && surDebut(p) === false) return;
      actif = true;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
      surMouvement(p);
      e.preventDefault();
    }, { signal: signal });
    svg.addEventListener('pointermove', function (e) {
      if (actif) surMouvement(point(e));
    }, { signal: signal });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
      svg.addEventListener(t, function () { actif = false; }, { signal: signal });
    });
  }

  /* Structure HTML commune : titre, aide, zone figure, zone lecture/contrôles. */
  function cadre(hote, titre, aide, empile) {
    hote.innerHTML =
      '<div class="widget-title">' + (window.ICONS.sparkle || '') + '<span>' + titre + '</span></div>' +
      (aide ? '<p class="widget-help">' + aide + '</p>' : '') +
      '<div class="widget-body' + (empile ? ' stack' : '') + '"><div class="widget-fig"></div><div class="widget-side"></div></div>';
    return {
      fig: hote.querySelector('.widget-fig'),
      side: hote.querySelector('.widget-side')
    };
  }

  function curseur(parent, o) {
    var id = uid('ctl');
    var div = document.createElement('div');
    div.className = 'control';
    div.innerHTML = '<label for="' + id + '"><span>' + o.label + '</span><output for="' + id + '"></output></label>' +
      '<input type="range" id="' + id + '" min="' + o.min + '" max="' + o.max + '" step="' + o.step + '" value="' + o.value + '">';
    parent.appendChild(div);
    var input = div.querySelector('input');
    var out = div.querySelector('output');
    function maj() { out.textContent = o.format ? o.format(Number(input.value)) : input.value; }
    maj();
    input.addEventListener('input', function () { maj(); o.onInput(Number(input.value)); }, { signal: o.signal });
    return input;
  }

  function selecteur(parent, o) {
    var id = uid('sel');
    var div = document.createElement('div');
    div.className = 'control';
    div.innerHTML = '<label for="' + id + '"><span>' + o.label + '</span></label><select id="' + id + '">' +
      o.options.map(function (op) {
        return '<option value="' + op[0] + '"' + (op[0] === o.value ? ' selected' : '') + '>' + op[1] + '</option>';
      }).join('') + '</select>';
    parent.appendChild(div);
    var s = div.querySelector('select');
    s.addEventListener('change', function () { o.onChange(s.value); }, { signal: o.signal });
    return s;
  }

  /* Tableau de lecture : lignes [libellé KaTeX ou texte, classe]. */
  function lecture(parent, lignes) {
    var box = document.createElement('div');
    box.className = 'readout';
    var vals = {};
    lignes.forEach(function (l) {
      var row = document.createElement('div');
      row.className = 'readout-row';
      row.innerHTML = '<span>' + l.label + '</span><span class="readout-val ' + (l.classe || '') + '"></span>';
      box.appendChild(row);
      vals[l.cle] = row.querySelector('.readout-val');
    });
    parent.appendChild(box);
    return vals;
  }

  function parseOptions(s) {
    var o = {};
    (s || '').split(';').forEach(function (p) {
      var kv = p.split('=');
      if (kv[0] && kv[0].trim()) o[kv[0].trim()] = kv.length > 1 ? kv.slice(1).join('=').trim() : true;
    });
    return o;
  }

  function monter(racine, signal) {
    racine.querySelectorAll('.widget[data-widget]').forEach(function (hote) {
      var nom = hote.getAttribute('data-widget');
      var fn = registre[nom];
      if (!fn) {
        hote.innerHTML = '<p class="widget-help">Figure indisponible : ' + nom + '</p>';
        return;
      }
      try {
        fn(hote, parseOptions(hote.getAttribute('data-opts')), signal);
      } catch (err) {
        console.error('[Figure ' + nom + ']', err);
        hote.innerHTML = '<p class="widget-help">Cette figure n\'a pas pu s\'afficher.</p>';
      }
    });
  }

  window.Widgets = {
    definir: function (nom, fn) { registre[nom] = fn; },
    monter: monter,
    outils: {
      el: el, fmt: fmt, tex: tex, uid: uid, repere: repere, creerSvg: creerSvg, grille: grille,
      texte: texte, cheminFonction: cheminFonction, clip: clip, glisser: glisser, cadre: cadre,
      curseur: curseur, selecteur: selecteur, lecture: lecture
    }
  };
})();
