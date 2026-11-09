/*
 * Figures de traitement du signal et de transmission (Techniques de transmission) :
 *   [[widget:spectre|raies=0:3,1:10,3:0;unite=dBm;f=kHz;phases=1:0,3:90;vide=1]]
 *       spectre de raies (puissance en dBm ou amplitude en V) ; phases en degrés (optionnel) ;
 *       vide=1 : axes seuls, pour un exercice où l'on place soi-même les raies.
 *   [[widget:signal|code=manchester;bits=1,0,1,1,0;v=5]]
 *       chronogramme d'un code en ligne (nrz-u, nrz-b, rz-u, rz-b, manchester, nrz-4 : 00/01/10/11 → −3/−1/+1/+3).
 *       vide=1 : axes seuls ; sansbits=1 : sans les bits au-dessus (exercice de décodage).
 *   [[widget:signal|niveaux=0.5,3.5,-2.5;duree=2;t=µs;etiquettes=100,111,001]]
 *       paliers de tension successifs (duree : durée d'un palier, dans l'unité t).
 *   [[widget:signal|s1=1,2000,0,0;s2=1.4,2000,36,1.5;t=ms;tmax=1]]
 *       sinusoïdes A cos(2πft + φ) + U₀ : s1 = A,f[Hz],φ[°],U₀ (s1 sert de référence, s2 et s3 en option).
 *   [[widget:dsp|codes=nrz-b,manchester;rb=2]]
 *       densité spectrale de puissance théorique des codes en ligne (en dB, f en MHz si rb en Mbit/s).
 *   [[widget:teb|m=2,4,8;lire=1e-4]]
 *       probabilité d'erreur symbole d'un NRZ M-aire en fonction de Eb/N0 [dB] ;
 *       lire=p trace le seuil Ps = p et donne l'Eb/N0 minimal de chaque courbe ;
 *       pb=p fait de même pour un TEB visé p avec Gray (seuil Ps = p · log2 M, comme au TD4).
 * Tout est calculé à partir des options : la figure et la correction ne peuvent pas se contredire.
 */
(function () {
  'use strict';

  var W = window.Widgets;
  var O = W.outils;
  var el = O.el;
  var fmt = O.fmt;

  function nombre(s) { return Number(String(s).replace(',', '.').replace('−', '-')); }
  function liste(v) { return v ? String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean) : []; }
  function paires(v) {
    return liste(v).map(function (p) { var kv = p.split(':'); return [nombre(kv[0]), nombre(kv[1])]; });
  }
  function joli(v) {
    var s = fmt(v, 3).replace(/,?0+$/, '');
    return s === '−0' ? '0' : s;
  }
  function cadreFig(hote, titre, aide) {
    var c = O.cadre(hote, titre, aide, true);
    c.side.remove();
    return c.fig;
  }
  function axes(svg, r, pasX, pasY, etiqX, etiqY, opts) {
    opts = opts || {};
    O.grille(svg, r, pasX, pasY, { sansAxeY: true });
    el('line', { x1: r.sx(r.xmin), x2: r.sx(r.xmin), y1: r.sy(r.ymin), y2: r.sy(r.ymax), class: 'axis' }, svg);
    el('line', { x1: r.sx(r.xmin), x2: r.sx(r.xmax), y1: r.sy(r.ymin), y2: r.sy(r.ymin), class: 'axis' }, svg);
    var x0 = Math.ceil(r.xmin / pasX - 1e-9) * pasX;
    for (var x = x0; x <= r.xmax + 1e-9; x += pasX) {
      O.texte(svg, r.sx(x), r.sy(r.ymin) + 16, opts.fx ? opts.fx(x) : joli(x), 'lbl', 'middle');
    }
    var y0 = Math.ceil(r.ymin / pasY - 1e-9) * pasY;
    for (var y = y0; y <= r.ymax + 1e-9; y += pasY) {
      O.texte(svg, r.sx(r.xmin) - 6, r.sy(y) + 4, opts.fy ? opts.fy(y) : joli(y), 'lbl', 'end');
    }
    if (etiqX) O.texte(svg, r.sx(r.xmax), r.sy(r.ymin) + 32, etiqX, 'lbl', 'end');
    if (etiqY) O.texte(svg, r.sx(r.xmin) - 40, r.pad - 10, etiqY, 'lbl', 'start');
  }
  function exposant(n) {
    var sup = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    return String(n).split('').map(function (c) { return sup[c] || c; }).join('');
  }
  function pas(etendue, cible) {
    var brut = etendue / (cible || 6);
    var p = Math.pow(10, Math.floor(Math.log10(brut)));
    var m = brut / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  /* ------------------------------------------------------------------ spectre de raies */
  W.definir('spectre', function (hote, o) {
    var raies = paires(o.raies);
    var unite = o.unite || 'dBm';
    var fu = o.f || 'Hz';
    var enDb = /dB/.test(unite);
    var vide = o.vide === true || o.vide === '1';
    var fig = cadreFig(hote, o.titre || (enDb ? 'Spectre de puissance' : 'Spectre d\'amplitude'),
      vide ? 'À toi de placer les raies sur ces axes (sur ta feuille).' : null);
    var fmax = o.fmax ? nombre(o.fmax) : Math.max.apply(null, raies.map(function (r) { return r[0]; }).concat([1])) * 1.15;
    var vals = raies.map(function (r) { return r[1]; });
    var ymax = o.ymax !== undefined ? nombre(o.ymax) : (Math.max.apply(null, vals.concat([0])) + (enDb ? 5 : 0.2 * Math.max.apply(null, vals.concat([1]))));
    var ymin = o.ymin !== undefined ? nombre(o.ymin) : (enDb ? Math.min.apply(null, vals.concat([0])) - 10 : 0);
    var r = O.repere({ W: 560, H: 260, pad: 46, xmin: 0, xmax: fmax, ymin: ymin, ymax: ymax });
    var svg = O.creerSvg(fig, 560, 260, 'Spectre de raies');
    axes(svg, r, pas(fmax), pas(ymax - ymin, 5), 'f [' + fu + ']', unite === 'V' ? 'Amplitude [V]' : 'P [' + unite + ']');
    if (!vide) {
      raies.forEach(function (rr) {
        var x = r.sx(rr[0]);
        el('line', { x1: x, x2: x, y1: r.sy(ymin), y2: r.sy(rr[1]), class: 'proj-cos' }, svg);
        el('circle', { cx: x, cy: r.sy(rr[1]), r: 4, class: 'handle' }, svg);
        O.texte(svg, x + 7, r.sy(rr[1]) - 6, joli(rr[1]) + ' ' + unite, 'lbl-accent', 'start');
      });
    }
    if (o.phases) {
      var ph = paires(o.phases);
      var r2 = O.repere({ W: 560, H: 170, pad: 46, xmin: 0, xmax: fmax, ymin: -180, ymax: 180 });
      var svg2 = O.creerSvg(fig, 560, 170, 'Spectre de phase');
      axes(svg2, r2, pas(fmax), 90, 'f [' + fu + ']', 'φ [°]');
      if (!vide) {
        ph.forEach(function (p) {
          var x = r2.sx(p[0]);
          el('line', { x1: x, x2: x, y1: r2.sy(0), y2: r2.sy(p[1]), class: 'proj-sin' }, svg2);
          el('circle', { cx: x, cy: r2.sy(p[1]), r: 4, class: 'dot' }, svg2);
          O.texte(svg2, x + 7, r2.sy(p[1]) + (p[1] >= 0 ? -6 : 14), joli(p[1]) + '°', 'lbl-review', 'start');
        });
      }
    }
  });

  /* ------------------------------------------------------------------ chronogrammes */
  function paliersCode(code, bits, v) {
    var p = []; // [début (en Tb), fin, niveau]
    var dernier = -1;
    if (code === 'nrz-4') {
      var table = { '00': -3, '01': -1, '10': 1, '11': 3 };
      for (var k = 0; k + 1 < bits.length; k += 2) p.push([k, k + 2, table[bits[k] + bits[k + 1]] * v / 3]);
      return p;
    }
    bits.forEach(function (b, i) {
      var un = b === '1';
      if (code === 'nrz-u') p.push([i, i + 1, un ? v : 0]);
      else if (code === 'nrz-b') p.push([i, i + 1, un ? v : -v]);
      else if (code === 'rz-u') { p.push([i, i + 0.5, un ? v : 0]); p.push([i + 0.5, i + 1, 0]); }
      else if (code === 'rz-b') {
        if (un) { dernier = -dernier; p.push([i, i + 0.5, dernier * v]); } else p.push([i, i + 0.5, 0]);
        p.push([i + 0.5, i + 1, 0]);
      } else if (code === 'manchester') { p.push([i, i + 0.5, un ? v : -v]); p.push([i + 0.5, i + 1, un ? -v : v]); }
      else throw new Error('code inconnu : ' + code);
    });
    return p;
  }
  function cheminPaliers(r, p) {
    var d = '';
    p.forEach(function (s, i) {
      d += (i ? 'L' : 'M') + r.sx(s[0]).toFixed(2) + ' ' + r.sy(s[2]).toFixed(2) + 'L' + r.sx(s[1]).toFixed(2) + ' ' + r.sy(s[2]).toFixed(2);
    });
    return d;
  }
  var NOMS_CODES = { 'nrz-u': 'NRZ unipolaire', 'nrz-b': 'NRZ bipolaire', 'rz-u': 'RZ unipolaire', 'rz-b': 'RZ bipolaire', manchester: 'Manchester', 'nrz-4': 'NRZ 4-aire' };
  var ECHELLES = { s: 1, ms: 1e-3, 'µs': 1e-6, us: 1e-6, ns: 1e-9 };

  W.definir('signal', function (hote, o) {
    var svg, r, fig, p, vmax;
    if (o.code) {
      var bits = liste(o.bits).length > 1 ? liste(o.bits) : String(o.bits || '').replace(/\s/g, '').split('');
      var v = o.v ? nombre(o.v) : 1;
      p = paliersCode(o.code, bits, v);
      fig = cadreFig(hote, o.titre || ('Codage ' + (NOMS_CODES[o.code] || o.code)), null);
      vmax = Math.abs(v) * 1.3;
      r = O.repere({ W: 560, H: 230, pad: 40, xmin: 0, xmax: bits.length, ymin: o.code === 'nrz-u' || o.code === 'rz-u' ? -vmax * 0.35 : -vmax, ymax: vmax });
      svg = O.creerSvg(fig, 560, 230, 'Chronogramme');
      axes(svg, r, 1, pas(r.ymax - r.ymin, 4), 't [Tb]', 'u(t) [V]', { fx: function (x) { return x ? joli(x) : '0'; } });
      if (o.vide !== true && o.vide !== '1') el('path', { d: cheminPaliers(r, p), class: 'curve' }, svg);
      if (!o.sansbits) bits.forEach(function (b, i) {
        if (o.code === 'nrz-4' && i % 2) return;
        var lbl = o.code === 'nrz-4' ? b + (bits[i + 1] || '') : b;
        var largeur = o.code === 'nrz-4' ? 2 : 1;
        O.texte(svg, r.sx(i + largeur / 2), r.pad - 8, lbl, 'lbl-review', 'middle');
      });
      return;
    }
    var unit = o.t || 'ms';
    var ech = ECHELLES[unit] || 1;
    if (o.niveaux) {
      var niv = liste(o.niveaux).map(nombre);
      var du = o.duree ? nombre(o.duree) : 1;
      p = niv.map(function (n, i) { return [i * du, (i + 1) * du, n]; });
      vmax = Math.max.apply(null, niv.map(Math.abs)) * 1.25 || 1;
      fig = cadreFig(hote, o.titre || 'Chronogramme', null);
      r = O.repere({ W: 560, H: 240, pad: 40, xmin: 0, xmax: niv.length * du, ymin: Math.min(0, Math.min.apply(null, niv)) - vmax * 0.1, ymax: vmax });
      svg = O.creerSvg(fig, 560, 240, 'Chronogramme');
      axes(svg, r, o.pasx ? nombre(o.pasx) : du, o.pasy ? nombre(o.pasy) : pas(r.ymax - r.ymin, 6), 't [' + unit + ']', 'u(t) [V]');
      el('path', { d: cheminPaliers(r, p), class: 'curve' }, svg);
      liste(o.etiquettes).forEach(function (e, i) { O.texte(svg, r.sx((i + 0.5) * du), r.pad - 8, e, 'lbl-review', 'middle'); });
      return;
    }
    var sigs = ['s1', 's2', 's3'].filter(function (k) { return o[k]; }).map(function (k) {
      var a = liste(o[k]).map(nombre);
      return { A: a[0], f: a[1], phi: (a[2] || 0) * Math.PI / 180, u0: a[3] || 0 };
    });
    if (!sigs.length) throw new Error('aucun signal');
    var tmax = o.tmax ? nombre(o.tmax) : 2 / (sigs[0].f * ech);
    var hauts = sigs.map(function (s) { return Math.abs(s.u0) + Math.abs(s.A); });
    vmax = Math.max.apply(null, hauts) * 1.15;
    var bas = Math.min.apply(null, sigs.map(function (s) { return s.u0 - Math.abs(s.A); }));
    fig = cadreFig(hote, o.titre || 'Représentation temporelle', null);
    r = O.repere({ W: 560, H: 260, pad: 40, xmin: 0, xmax: tmax, ymin: Math.min(-0.1 * vmax, bas * 1.15), ymax: vmax });
    svg = O.creerSvg(fig, 560, 260, 'Sinusoïdes');
    axes(svg, r, o.pasx ? nombre(o.pasx) : pas(tmax, 8), o.pasy ? nombre(o.pasy) : pas(r.ymax - r.ymin, 6), 't [' + unit + ']', 'u(t) [V]');
    var classes = ['curve', 'curve-2', 'curve-3'];
    sigs.forEach(function (s, i) {
      var f = function (t) { return s.u0 + s.A * Math.cos(2 * Math.PI * s.f * t * ech + s.phi); };
      el('path', { d: O.cheminFonction(r, f, 0, tmax, 500), class: classes[i] }, svg);
    });
    var leg = document.createElement('p');
    leg.className = 'widget-help';
    leg.textContent = sigs.map(function (s, i) { return ['Trait plein', 'Pointillés', 'Trait fin'][i] + ' : u' + (i + 1) + '(t)' + (i === 0 && sigs.length > 1 ? ' (référence)' : ''); }).join(' · ');
    fig.appendChild(leg);
  });

  /* ------------------------------------------------------------------ DSP des codes en ligne */
  function sinc2(x) { if (Math.abs(x) < 1e-9) return 1; var s = Math.sin(Math.PI * x) / (Math.PI * x); return s * s; }
  var DSP = {
    // f exprimée en multiples de Rb. Valeurs relatives (V₀ = 1, Tb = 1).
    'nrz-u': { c: function (f) { return 0.25 * sinc2(f); }, raies: function (k) { return k === 0 ? 0.25 : 0; } },
    'nrz-b': { c: function (f) { return sinc2(f); } },
    'nrz-4': { c: function (f) { return 2 * sinc2(2 * f) * 5 / 9; } },
    'rz-u': { c: function (f) { return sinc2(f / 2) / 16; }, raies: function (k) { return sinc2(k / 2) / 16; } },
    'rz-b': { c: function (f) { var s = Math.sin(Math.PI * f); return sinc2(f / 2) / 4 * s * s; } },
    manchester: { c: function (f) { var s = Math.sin(Math.PI * f / 2); return sinc2(f / 2) * s * s; } }
  };
  W.definir('dsp', function (hote, o) {
    var codes = liste(o.codes || 'nrz-b');
    var rb = o.rb ? nombre(o.rb) : 1;
    var fmaxRb = o.fmax ? nombre(o.fmax) / rb : 3;
    var fig = cadreFig(hote, o.titre || 'Densité spectrale de puissance', 'Échelle relative en dB. Le premier lobe s\'arrête au premier zéro du spectre.');
    var r = O.repere({ W: 560, H: 270, pad: 46, xmin: 0, xmax: fmaxRb * rb, ymin: -40, ymax: 3 });
    var svg = O.creerSvg(fig, 560, 270, 'DSP');
    axes(svg, r, pas(fmaxRb * rb, 6), 10, 'f [' + (o.f || 'MHz') + ']', 'DSP [dB]');
    var zone = O.clip(svg, r);
    var classes = ['curve', 'curve-2', 'curve-3'];
    var ref = 0;
    codes.forEach(function (c) { for (var i = 1; i <= 400; i++) { ref = Math.max(ref, DSP[c].c(i / 400 * fmaxRb)); } });
    codes.forEach(function (c, i) {
      var d = DSP[c];
      if (!d) throw new Error('code inconnu : ' + c);
      var f = function (x) { var v = d.c(x / rb) / ref; return v > 0 ? 10 * Math.log10(v) : -1e9; };
      el('path', { d: O.cheminFonction(r, f, 0, fmaxRb * rb, 800), class: classes[i % 3], 'clip-path': zone }, svg);
      if (d.raies) {
        for (var k = 0; k <= fmaxRb; k++) {
          var a = d.raies(k);
          if (a > 1e-9) {
            var y = Math.min(2, 10 * Math.log10(a / ref) + 6);
            var x = r.sx(k * rb) + (k === 0 ? 4 : 0);
            el('line', { x1: x, x2: x, y1: r.sy(-40), y2: r.sy(y), class: i ? 'vec-review' : 'vec-accent' }, svg);
            el('path', { d: 'M' + (x - 4) + ' ' + (r.sy(y) + 7) + 'L' + x + ' ' + r.sy(y) + 'L' + (x + 4) + ' ' + (r.sy(y) + 7), class: i ? 'vec-review' : 'vec-accent' }, svg);
          }
        }
      }
    });
    for (var m = 1; m <= Math.floor(fmaxRb); m++) {
      el('line', { x1: r.sx(m * rb), x2: r.sx(m * rb), y1: r.sy(-40), y2: r.sy(3), class: 'helper' }, svg);
      O.texte(svg, r.sx(m * rb), r.pad - 8, (m === 1 ? '' : m) + 'Rb', 'lbl', 'middle');
    }
    var leg = document.createElement('p');
    leg.className = 'widget-help';
    leg.textContent = codes.map(function (c, i) { return ['Trait plein', 'Pointillés', 'Trait fin'][i % 3] + ' : ' + (NOMS_CODES[c] || c); }).join(' · ') +
      (codes.some(function (c) { return DSP[c].raies; }) ? ' · Flèches : raies (composantes discrètes).' : '');
    fig.appendChild(leg);
  });

  /* ------------------------------------------------------------------ TEB / Eb/N0 */
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var a = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
      t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? a : 2 - a;
  }
  function Q(x) { return 0.5 * erfc(x / Math.SQRT2); }
  function ps(M, db) {
    var n = Math.log2(M), e = Math.pow(10, db / 10);
    return 2 * (1 - 1 / M) * Q(Math.sqrt(6 * n / (M * M - 1) * e));
  }
  function seuil(M, p) {
    var lo = -5, hi = 40;
    for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2; if (ps(M, m) > p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  W.definir('teb', function (hote, o) {
    var Ms = liste(o.m || '2,4,8').map(nombre);
    var xmax = o.xmax ? nombre(o.xmax) : 20;
    var fig = cadreFig(hote, o.titre || 'Probabilité d\'erreur symbole, NRZ M-aire', 'Échelle logarithmique en ordonnée. Plus M est grand, plus la courbe est décalée vers la droite.');
    var r = O.repere({ W: 560, H: 300, pad: 50, xmin: 0, xmax: xmax, ymin: -8, ymax: 0 });
    var svg = O.creerSvg(fig, 560, 300, 'Courbes de TEB');
    axes(svg, r, 2, 1, 'Eb/N₀ [dB]', 'Ps', { fy: function (y) { return y ? '10' + exposant(y) : '1'; } });
    var zone = O.clip(svg, r);
    var classes = ['curve', 'curve-2', 'curve-3'];
    Ms.forEach(function (M, i) {
      el('path', { d: O.cheminFonction(r, function (x) { var v = ps(M, x); return v > 0 ? Math.log10(v) : -1e9; }, 0, xmax, 400), class: classes[i % 3], 'clip-path': zone }, svg);
      var xl = Math.min(xmax - 1, seuil(M, 1e-7));
      O.texte(svg, r.sx(xl) + 4, r.sy(-7.3), 'M = ' + M, i ? 'lbl-review' : 'lbl-accent', 'start');
    });
    var txt = Ms.map(function (M, i) { return ['Trait plein', 'Pointillés', 'Trait fin'][i % 3] + ' : M = ' + M; }).join(' · ');
    if (o.lire || o.pb) {
      // lire = seuil sur Ps ; pb = TEB visé avec étiquetage de Gray (Ps ≈ Pb · log2 M)
      var p0 = nombre(o.lire || o.pb);
      var lectures = Ms.map(function (M) {
        var p = o.pb ? p0 * Math.log2(M) : p0;
        var ly = Math.log10(p);
        el('line', { x1: r.sx(0), x2: r.sx(xmax), y1: r.sy(ly), y2: r.sy(ly), class: 'helper' }, svg);
        var s = seuil(M, p);
        el('line', { x1: r.sx(s), x2: r.sx(s), y1: r.sy(ly), y2: r.sy(-8), class: 'helper' }, svg);
        el('circle', { cx: r.sx(s), cy: r.sy(ly), r: 4, class: 'dot' }, svg);
        return 'M = ' + M + ' : ' + fmt(s, 1) + ' dB';
      });
      var ecrit = function (v) { var e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e); return (Math.abs(m - 1) < 1e-9 ? '' : fmt(m, 1) + '×') + '10' + exposant(e); };
      txt += o.pb ? '. TEB visé ' + ecrit(p0) + ' (Ps ≈ TEB × log₂M) → ' + lectures.join(', ')
                  : '. Seuil Ps = ' + ecrit(p0) + ' → ' + lectures.join(', ');
    }
    var leg = document.createElement('p');
    leg.className = 'widget-help';
    leg.textContent = txt;
    fig.appendChild(leg);
  });
})();
