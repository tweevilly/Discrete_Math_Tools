/* Shared page helpers: sheet-tab navigation, an editable matrix grid, and table rendering. */
(function (root) {
  'use strict';
  var DM = (root.DM = root.DM || {});
  var F = DM.Fraction;
  var ui = (DM.ui = {});

  ui.el = function (tag, attrs) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  };
  var el = ui.el;

  /** Bottom navigation styled like worksheet tabs. */
  var PAGES = [
    ['index.html', 'Home', 'home'],
    ['matrices.html', 'Matrices', 'matrices'],
    ['sequences.html', 'Sequences', 'sequences'],
    ['truth-tables.html', 'Truth tables', 'truth'],
    ['row-reduction.html', 'Row reduction', 'rref']
  ];
  ui.tabs = function (active) {
    var nav = document.getElementById('tabs');
    if (!nav) return;
    nav.setAttribute('aria-label', 'Tools');
    PAGES.forEach(function (p) {
      var a = el('a', { href: p[0], text: p[1] });
      if (p[2] === active) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
  };

  ui.message = function (host, kind, html) {
    host.className = 'msg' + (kind ? ' ' + kind : '');
    host.innerHTML = '';
    if (typeof html === 'string') host.textContent = html;
    else if (html) host.appendChild(html);
  };

  /** A <table> for a Fraction matrix. opts: mode, tone, highlight (array of [r,c]). */
  ui.matrixTable = function (M, opts) {
    opts = opts || {};
    var hi = {};
    (opts.highlight || []).forEach(function (p) { hi[p[0] + ',' + p[1]] = true; });
    var table = el('table', { class: 'out tone-' + (opts.tone || 'n') });
    var tbody = el('tbody');
    M.forEach(function (row, i) {
      var tr = el('tr');
      row.forEach(function (x, j) {
        var td = el('td', { text: DM.format(x, opts.mode), title: x.toString() });
        if (hi[i + ',' + j]) td.className = 'pivot';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  };

  /** A labelled block: colored banner above content. */
  ui.block = function (title, tone, content) {
    var b = el('div', { class: 'block tone-' + tone });
    b.appendChild(el('div', { class: 'banner', text: title }));
    var wrap = el('div', { class: 'scroll' });
    wrap.appendChild(content);
    b.appendChild(wrap);
    return b;
  };

  /**
   * Editable matrix grid. Empty cells count as 0.
   * Arrow keys and Enter move between cells; pasting a block copied from Excel fills the grid.
   */
  ui.grid = function (host, o) {
    var maxRows = o.maxRows || 8, maxCols = o.maxCols || 8;
    var data = (o.values || []).map(function (r) { return r.map(String); });
    var rows = o.rows, cols = o.cols;
    var inputs = [];

    function cellValue(i, j) { return data[i] && data[i][j] !== undefined ? data[i][j] : ''; }

    function render() {
      host.innerHTML = '';
      host.classList.add('sheet', 'tone-' + (o.tone || 'a'));
      host.setAttribute('role', 'group');
      host.setAttribute('aria-label', o.label + ', ' + rows + ' by ' + cols);
      host.style.gridTemplateColumns = 'repeat(' + cols + ', auto)';
      inputs = [];
      for (var i = 0; i < rows; i++) {
        inputs.push([]);
        for (var j = 0; j < cols; j++) {
          var inp = el('input', {
            type: 'text', inputmode: 'text', autocomplete: 'off', spellcheck: 'false',
            placeholder: '0', 'aria-label': o.label + ' row ' + (i + 1) + ' column ' + (j + 1)
          });
          inp.value = cellValue(i, j);
          inp.dataset.r = i; inp.dataset.c = j;
          inputs[i].push(inp);
          host.appendChild(inp);
        }
      }
    }

    function sync(i, j) {
      while (data.length <= i) data.push([]);
      data[i][j] = inputs[i][j].value;
    }

    host.addEventListener('input', function (e) {
      var t = e.target;
      if (t.tagName !== 'INPUT') return;
      sync(+t.dataset.r, +t.dataset.c);
      if (o.onChange) o.onChange();
    });

    host.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t.tagName !== 'INPUT') return;
      var i = +t.dataset.r, j = +t.dataset.c, ni = i, nj = j;
      if (e.key === 'ArrowDown' || e.key === 'Enter') ni = Math.min(rows - 1, i + 1);
      else if (e.key === 'ArrowUp') ni = Math.max(0, i - 1);
      else if (e.key === 'ArrowLeft' && t.selectionStart === 0 && t.selectionEnd === 0) nj = Math.max(0, j - 1);
      else if (e.key === 'ArrowRight' && t.selectionStart === t.value.length) nj = Math.min(cols - 1, j + 1);
      else return;
      if (ni === i && nj === j) return;
      e.preventDefault();
      inputs[ni][nj].focus(); inputs[ni][nj].select();
    });

    host.addEventListener('paste', function (e) {
      var t = e.target;
      if (t.tagName !== 'INPUT') return;
      var text = (e.clipboardData || root.clipboardData).getData('text');
      var lines = text.replace(/\r/g, '').split('\n');
      if (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      var block = lines.map(function (l) { return l.trim().split(/\t|,|;|\s+/).filter(function (x) { return x !== ''; }); });
      if (block.length <= 1 && (block[0] || []).length <= 1) return; // a single value: let the browser paste it
      e.preventDefault();
      var i0 = +t.dataset.r, j0 = +t.dataset.c;
      var needRows = Math.min(maxRows, Math.max(rows, i0 + block.length));
      var needCols = Math.min(maxCols, Math.max(cols, j0 + Math.max.apply(null, block.map(function (r) { return r.length; }))));
      block.forEach(function (r, di) {
        r.forEach(function (v, dj) {
          var i = i0 + di, j = j0 + dj;
          if (i >= needRows || j >= needCols) return;
          while (data.length <= i) data.push([]);
          data[i][j] = v;
        });
      });
      api.resize(needRows, needCols, true);
      if (o.onChange) o.onChange();
    });

    var api = {
      rows: function () { return rows; },
      cols: function () { return cols; },
      /** Change size, keeping what is already typed. */
      resize: function (r, c, force) {
        r = Math.max(1, Math.min(maxRows, r | 0)); c = Math.max(1, Math.min(maxCols, c | 0));
        if (!force && r === rows && c === cols) return;
        rows = r; cols = c; render();
      },
      setValues: function (vals) { data = vals.map(function (r) { return r.map(String); }); render(); },
      /** Matrix of Fractions. Throws a readable error naming the bad cell. */
      parse: function () {
        var M = [];
        for (var i = 0; i < rows; i++) {
          M.push([]);
          for (var j = 0; j < cols; j++) {
            var raw = inputs[i][j].value.trim();
            if (raw === '') { M[i].push(new F(0)); continue; }
            try { M[i].push(F.parse(raw)); }
            catch (err) { throw new Error(o.label + ', row ' + (i + 1) + ' column ' + (j + 1) + ': "' + raw + '" ' + err.message + '.'); }
          }
        }
        return M;
      }
    };
    render();
    return api;
  };

  ui.num = function (input, min, max, fallback) {
    var v = parseInt(input.value, 10);
    if (isNaN(v)) return fallback;
    return Math.max(min, Math.min(max, v));
  };
})(typeof window !== 'undefined' ? window : globalThis);
