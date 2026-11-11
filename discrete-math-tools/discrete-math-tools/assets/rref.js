/* Gaussian elimination (echelon form) and Gauss-Jordan (reduced echelon form), with every step recorded. */
(function (root) {
  'use strict';
  var DM = (root.DM = root.DM || {});
  if (typeof require !== 'undefined' && !DM.Fraction) require('./fraction.js');
  var F = DM.Fraction;

  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  function sub(n) { return String(n).split('').map(function (d) { return SUB[+d]; }).join(''); }
  function xn(i) { return 'x' + sub(i + 1); }
  function txt(f) { return f.toString().replace('-', '−'); }

  /** "3·" or "(1/2)·" for |f|; empty when |f| = 1. */
  function coef(f) {
    f = f.abs();
    if (f.isOne()) return '';
    return (f.isInt() ? f.toString() : '(' + f.toString() + ')') + '·';
  }
  /** Signed scale factor shown in "R1 ← 3·R1". */
  function scale(f) {
    var s = f.isInt() ? f.toString() : '(' + f.toString() + ')';
    return s.replace('-', '−') + '·';
  }

  function snapshot(A) { return A.map(function (r) { return r.slice(); }); }

  /**
   * reduce(matrix, augmented)
   * augmented = true treats the last column as the constants of a linear system.
   */
  function reduce(M, augmented) {
    var m = M.length, n = M[0].length;
    var A = snapshot(M);
    var steps = [{ phase: 'start', desc: 'Starting matrix', matrix: snapshot(A) }];
    var limit = augmented ? n - 1 : n;
    var pivots = []; // [row, col]
    var r = 0;

    for (var c = 0; c < limit && r < m; c++) {
      var p = -1;
      for (var i = r; i < m; i++) if (!A[i][c].isZero()) { p = i; break; }
      if (p < 0) continue;
      if (p !== r) {
        var t = A[p]; A[p] = A[r]; A[r] = t;
        steps.push({ phase: 'forward', desc: 'R' + (r + 1) + ' ↔ R' + (p + 1), matrix: snapshot(A) });
      }
      var pv = A[r][c];
      if (!pv.isOne()) {
        var inv = new F(1).div(pv);
        A[r] = A[r].map(function (x) { return x.mul(inv); });
        steps.push({ phase: 'forward', desc: 'R' + (r + 1) + ' ← ' + scale(inv) + 'R' + (r + 1), matrix: snapshot(A) });
      }
      for (var k = r + 1; k < m; k++) {
        var f = A[k][c];
        if (f.isZero()) continue;
        for (var j = 0; j < n; j++) A[k][j] = A[k][j].sub(f.mul(A[r][j]));
        steps.push({
          phase: 'forward',
          desc: 'R' + (k + 1) + ' ← R' + (k + 1) + (f.isNeg() ? ' + ' : ' − ') + coef(f) + 'R' + (r + 1),
          matrix: snapshot(A)
        });
      }
      pivots.push([r, c]);
      r++;
    }
    var echelon = snapshot(A);

    for (var q = pivots.length - 1; q >= 0; q--) {
      var pr = pivots[q][0], pc = pivots[q][1];
      for (var u = 0; u < pr; u++) {
        var g = A[u][pc];
        if (g.isZero()) continue;
        for (var v = 0; v < n; v++) A[u][v] = A[u][v].sub(g.mul(A[pr][v]));
        steps.push({
          phase: 'backward',
          desc: 'R' + (u + 1) + ' ← R' + (u + 1) + (g.isNeg() ? ' + ' : ' − ') + coef(g) + 'R' + (pr + 1),
          matrix: snapshot(A)
        });
      }
    }

    var result = { steps: steps, echelon: echelon, rref: A, pivots: pivots, rank: pivots.length };
    if (augmented) result.solution = solve(A, pivots, n - 1);
    return result;
  }

  /** "c + a·x₃ − b·x₄" style right-hand side. */
  function linear(constant, terms) {
    var out = constant.isZero() && terms.length ? '' : txt(constant);
    terms.forEach(function (t, idx) {
      var neg = t.coef.isNeg();
      var mag = t.coef.abs();
      var body = (mag.isOne() ? '' : (mag.isInt() ? mag.toString() : '(' + mag.toString() + ')') + '·') + xn(t.col);
      if (out === '') out = (neg ? '−' : '') + body;
      else out += (neg ? ' − ' : ' + ') + body;
    });
    return out === '' ? '0' : out;
  }

  function solve(A, pivots, nVars) {
    var m = A.length;
    for (var i = pivots.length; i < m; i++) {
      if (!A[i][nVars].isZero()) {
        return { status: 'none', lines: ['No solution. A row reads 0 = ' + txt(A[i][nVars]) + '.'] };
      }
    }
    var isPivot = {};
    pivots.forEach(function (p) { isPivot[p[1]] = p[0]; });
    if (pivots.length === nVars) {
      return {
        status: 'unique',
        lines: pivots.map(function (p) { return xn(p[1]) + ' = ' + txt(A[p[0]][nVars]); })
      };
    }
    var free = [];
    for (var c = 0; c < nVars; c++) if (!(c in isPivot)) free.push(c);
    var lines = [];
    for (var col = 0; col < nVars; col++) {
      if (col in isPivot) {
        var row = isPivot[col];
        var terms = free.filter(function (fc) { return !A[row][fc].isZero(); })
          .map(function (fc) { return { col: fc, coef: A[row][fc].neg() }; });
        lines.push(xn(col) + ' = ' + linear(A[row][nVars], terms));
      } else {
        lines.push(xn(col) + ' is free (any real number)');
      }
    }
    return { status: 'infinite', lines: lines };
  }

  DM.rref = { reduce: reduce };
  if (typeof module !== 'undefined' && module.exports) module.exports = DM;
})(typeof window !== 'undefined' ? window : globalThis);
