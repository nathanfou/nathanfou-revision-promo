/*
 * Rendu du contenu : mini-Markdown + KaTeX.
 * Syntaxe supportée :
 *   ## / ### / ####      titres
 *   :::type Titre ... :::  encadrés (def, prop, methode, exemple, piege, elec, astuce, intuition)
 *   - item / 1. item / a) item   listes (imbrication par indentation)
 *   | a | b |            tableaux
 *   $...$ et $$...$$     formules KaTeX
 *   **gras**, *italique*, ==surligné==, [lien](#/route)
 *   [[widget:nom|options]]  figure interactive
 *   ``` ... ```          pseudo-code (mots-clés en gras, indentation conservée)
 * Un retour à la ligne simple dans un paragraphe produit un saut de ligne.
 */
(function () {
  'use strict';

  var MACROS = {
    '\\R': '\\mathbb{R}',
    '\\C': '\\mathbb{C}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\e': '\\mathrm{e}',
    '\\dd': '\\mathrm{d}',
    '\\Re': '\\operatorname{Re}',
    '\\Im': '\\operatorname{Im}',
    '\\eff': '_{\\text{eff}}',
    '\\moy': '_{\\text{moy}}'
  };

  var CALLOUTS = {
    def: ['Définition', 'book'],
    prop: ['À retenir', 'seal'],
    methode: ['Méthode', 'target'],
    exemple: ['Exemple', 'pencil'],
    piege: ['Piège classique', 'warning'],
    elec: ['En électricité', 'lightning'],
    examen: ['Au contrôle', 'exam'],
    algo: ['Algorithme', 'listNumbers'],
    astuce: ['Astuce', 'bulb'],
    intuition: ['Intuition', 'sparkle']
  };

  var OPEN = '';
  var CLOSE = '';
  var DOLLAR = '';
  var PLACEHOLDER_RE = /([DI])(\d+)/g;
  var LIST_RE = /^(\s*)([-*]|\d+\.|[a-z]\))\s+(.*)$/;

  var cache = new Map();
  var sourcesMath = [];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMath(tex, display) {
    if (typeof window.katex === 'undefined') {
      return '<code class="math-fallback">' + escapeHtml(tex) + '</code>';
    }
    try {
      return window.katex.renderToString(tex, {
        displayMode: display,
        throwOnError: true,
        strict: 'ignore',
        macros: Object.assign({}, MACROS)
      });
    } catch (err) {
      console.warn('[KaTeX]', err.message, '\n', tex);
      return '<span class="math-error" title="' + escapeHtml(err.message) + '">' + escapeHtml(tex) + '</span>';
    }
  }

  function extractMath(src, store) {
    var out = src.replace(/\\\$/g, DOLLAR);
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, function (tout, tex) {
      if (store.sources) store.sources[store.length] = tout;
      store.push(renderMath(tex.trim(), true));
      return OPEN + 'D' + (store.length - 1) + CLOSE;
    });
    out = out.replace(/\$([^$\n]+?)\$/g, function (tout, tex) {
      if (store.sources) store.sources[store.length] = tout;
      store.push(renderMath(tex, false));
      return OPEN + 'I' + (store.length - 1) + CLOSE;
    });
    return out.replace(new RegExp(DOLLAR, 'g'), '$');
  }

  function restoreMath(html, store) {
    return html.replace(PLACEHOLDER_RE, function (_, kind, n) {
      return store[Number(n)];
    });
  }

  function dedent(text) {
    var lines = text.replace(/\r\n?/g, '\n').split('\n');
    var min = Infinity;
    lines.forEach(function (l) {
      if (!l.trim()) return;
      var ind = l.match(/^[ \t]*/)[0].length;
      if (ind < min) min = ind;
    });
    if (!isFinite(min) || min === 0) return lines;
    return lines.map(function (l) { return l.slice(Math.min(min, l.match(/^[ \t]*/)[0].length)); });
  }

  function inline(s) {
    var out = escapeHtml(s.trim());
    out = out.replace(/\[([^\]]+)\]\((#\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
    out = out.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\*)/g, '$1<em>$2</em>');
    out = out.replace(/==([^=]+?)==/g, '<mark>$1</mark>');
    out = out.replace(/\n/g, '<br>');
    return out;
  }

  function indentOf(line) {
    return line.match(/^\s*/)[0].length;
  }

  function isDisplayOnly(line) {
    return /^\s*D\d+\s*$/.test(line);
  }

  function isTableStart(lines, i) {
    return /^\s*\|.*\|\s*$/.test(lines[i] || '') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '');
  }

  function isBlockStart(lines, i) {
    var line = lines[i];
    return /^:::/.test(line) ||
      /^```/.test(line) ||
      /^#{2,4}\s/.test(line) ||
      /^---+\s*$/.test(line) ||
      /^\[\[widget:/.test(line) ||
      LIST_RE.test(line) ||
      isDisplayOnly(line) ||
      isTableStart(lines, i);
  }

  function listKind(marker) {
    if (marker === '-' || marker === '*') return 'ul';
    if (/\d/.test(marker)) return 'ol';
    return 'alpha';
  }

  function parseList(lines, i) {
    var first = lines[i].match(LIST_RE);
    var base = first[1].length;
    var kind = listKind(first[2]);
    var start = kind === 'ol' ? parseInt(first[2], 10) : kind === 'alpha' ? first[2].charCodeAt(0) - 96 : 1;
    var items = [];

    while (i < lines.length) {
      var line = lines[i];
      var m = line.match(LIST_RE);
      if (m && m[1].length === base && listKind(m[2]) === kind) {
        items.push({ offset: base + m[2].length + 1, lines: [m[3]] });
        i++;
        continue;
      }
      if (!line.trim()) {
        var j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j >= lines.length) break;
        var nm = lines[j].match(LIST_RE);
        if ((nm && nm[1].length === base && listKind(nm[2]) === kind) || indentOf(lines[j]) > base) {
          items[items.length - 1].lines.push('');
          i = j;
          continue;
        }
        break;
      }
      if (indentOf(line) > base) {
        var cur = items[items.length - 1];
        cur.lines.push(line.slice(Math.min(indentOf(line), cur.offset)));
        i++;
        continue;
      }
      if (!isBlockStart(lines, i) || isDisplayOnly(line)) {
        items[items.length - 1].lines.push(line.trim());
        i++;
        continue;
      }
      break;
    }

    var tag = kind === 'ul' ? 'ul' : 'ol';
    var attrs = kind === 'alpha' ? ' class="alpha" type="a"' : '';
    if (kind !== 'ul' && start !== 1) attrs += ' start="' + start + '"';
    var html = '<' + tag + attrs + '>' + items.map(function (it) {
      var inner = parseBlocks(it.lines);
      var single = inner.match(/^<p>([\s\S]*)<\/p>$/);
      if (single && single[1].indexOf('<p>') === -1) inner = single[1];
      return '<li>' + inner + '</li>';
    }).join('') + '</' + tag + '>';
    return { html: html, next: i };
  }

  function splitRow(line) {
    var t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return t.split('|').map(function (c) { return c.trim(); });
  }

  function parseTable(lines, i) {
    var head = splitRow(lines[i]);
    var aligns = splitRow(lines[i + 1]).map(function (c) {
      if (/^:-+:$/.test(c)) return 'center';
      if (/^-+:$/.test(c)) return 'right';
      return '';
    });
    i += 2;
    var rows = [];
    while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
      rows.push(splitRow(lines[i]));
      i++;
    }
    function cell(tag, c, k) {
      var a = aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '';
      return '<' + tag + a + '>' + inline(c) + '</' + tag + '>';
    }
    var html = '<div class="table-wrap"><table><thead><tr>' +
      head.map(function (c, k) { return cell('th', c, k); }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr>' + r.map(function (c, k) { return cell('td', c, k); }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>';
    return { html: html, next: i };
  }

  function renderCallout(type, title, inner) {
    var def = CALLOUTS[type] || ['Note', 'info'];
    var icon = (window.ICONS && window.ICONS[def[1]]) || '';
    var label = title ? inline(title) : def[0];
    var kicker = title ? '<span class="callout-kind">' + def[0] + '</span>' : '';
    return '<aside class="callout callout-' + type + '">' +
      '<div class="callout-head">' + icon + '<div class="callout-titles">' + kicker +
      '<span class="callout-title">' + label + '</span></div></div>' +
      '<div class="callout-body">' + inner + '</div></aside>';
  }

  var MOTS_CLES = /(^|[^\wÀ-ÿ])(tant que|faire|si|alors|sinon|pour chaque|pour|fin|répéter|jusqu'à|renvoyer|Données|Variables|Résultat)(?=$|[^\wÀ-ÿ])/g;

  function renderPseudo(lignes) {
    var min = Infinity;
    lignes.forEach(function (l) { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    if (!isFinite(min)) min = 0;
    return '<pre class="pseudo"><code>' + lignes.map(function (l) {
      var t = escapeHtml(l.slice(min));
      t = t.replace(/\/\/(.*)$/, '<span class="pseudo-com">//$1</span>');
      return t.replace(MOTS_CLES, '$1<b>$2</b>');
    }).join('\n') + '</code></pre>';
  }

  function parseBlocks(input) {
    var lines = Array.isArray(input) ? input : dedent(input);
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i++; continue; }

      if (/^```/.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        html.push(renderPseudo(code));
        continue;
      }

      var m = line.match(/^:::(\w+)\s*(.*)$/);
      if (m) {
        var inner = [];
        var depth = 0;
        i++;
        while (i < lines.length) {
          var l = lines[i];
          if (/^:::\w+/.test(l)) depth++;
          else if (/^:::\s*$/.test(l)) {
            if (depth === 0) break;
            depth--;
          }
          inner.push(l);
          i++;
        }
        i++;
        html.push(renderCallout(m[1], m[2].trim(), parseBlocks(inner)));
        continue;
      }

      m = line.match(/^(#{2,4})\s+(.*)$/);
      if (m) {
        var lvl = m[1].length;
        html.push('<h' + lvl + '>' + inline(m[2]) + '</h' + lvl + '>');
        i++;
        continue;
      }

      if (/^---+\s*$/.test(line)) {
        html.push('<hr>');
        i++;
        continue;
      }

      m = line.match(/^\[\[widget:([\w-]+)(?:\|([^\]]*))?\]\]\s*$/);
      if (m) {
        // Les options gardent le texte source des formules : la figure les rendra elle-même.
        var brutes = (m[2] || '').replace(PLACEHOLDER_RE, function (t, kind, n) { return sourcesMath[Number(n)] || t; });
        html.push('<div class="widget" data-widget="' + m[1] + '" data-opts="' + escapeHtml(brutes) + '"></div>');
        i++;
        continue;
      }

      if (isTableStart(lines, i)) {
        var t = parseTable(lines, i);
        html.push(t.html);
        i = t.next;
        continue;
      }

      if (LIST_RE.test(line)) {
        var li = parseList(lines, i);
        html.push(li.html);
        i = li.next;
        continue;
      }

      if (isDisplayOnly(line)) {
        html.push('<div class="math-block">' + line.trim() + '</div>');
        i++;
        continue;
      }

      var para = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) {
        para.push(lines[i]);
        i++;
      }
      html.push('<p>' + inline(para.join('\n')) + '</p>');
    }
    return html.join('\n');
  }

  function md(text) {
    if (!text) return '';
    if (cache.has(text)) return cache.get(text);
    var store = [];
    store.sources = [];
    var prepared = extractMath(text, store);
    var precedentes = sourcesMath;
    sourcesMath = store.sources;
    var html;
    try {
      html = restoreMath(parseBlocks(prepared), store);
    } finally {
      sourcesMath = precedentes;
    }
    cache.set(text, html);
    return html;
  }

  window.Rendu = {
    md: md,
    math: renderMath,
    inline: function (s) {
      var store = [];
      return restoreMath(inline(extractMath(s, store)), store);
    },
    escape: escapeHtml,
    MACROS: MACROS
  };
})();
