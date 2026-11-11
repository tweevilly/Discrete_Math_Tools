/* Matrix operations on Fraction matrices (arrays of arrays). */
(function (root) {
  'use strict';
  var DM = (root.DM = root.DM || {});
  if (typeof require !== 'undefined' && !DM.Fraction) require('./fraction.js');
  var F = DM.Fraction;

  function copy(M) { return M.map(function (r) { return r.slice(); }); }
  function identity(n) {
    var I = [];
    for (var i = 0; i < n; i++) {
      I.push([]);
      for (var j = 0; j < n; j++) I[i].push(new F(i === j ? 1 : 0));
    }
    return I;
  }

  /** (m x n) times (n x p) gives (m x p). */
  function multiply(A, B) {
    var m = A.length, n = A[0].length, p = B[0].length;
    if (B.length !== n) {
      throw new Error('A has ' + n + ' columns but B has ' + B.length + ' rows. They must match.');
    }
    var C = [];
    for (var i = 0; i < m; i++) {
      C.push([]);
      for (var j = 0; j < p; j++) {
        var sum = new F(0);
        for (var k = 0; k < n; k++) sum = sum.add(A[i][k].mul(B[k][j]));
        C[i].push(sum);
      }
    }
    return C;
  }

  function requireSquare(M) {
    if (M.length !== M[0].length) throw new Error('Matrix must be square.');
  }

  /** Determinant by row reduction (exact, any size). */
  function determinant(M) {
    requireSquare(M);
    var A = copy(M), n = A.length, det = new F(1);
    for (var c = 0; c < n; c++) {
      var p = -1;
      for (var i = c; i < n; i++) if (!A[i][c].isZero()) { p = i; break; }
      if (p < 0) return new F(0);
      if (p !== c) { var t = A[p]; A[p] = A[c]; A[c] = t; det = det.neg(); }
      det = det.mul(A[c][c]);
      for (var r = c + 1; r < n; r++) {
        var f = A[r][c].div(A[c][c]);
        if (f.isZero()) continue;
        for (var j = c; j < n; j++) A[r][j] = A[r][j].sub(f.mul(A[c][j]));
      }
    }
    return det;
  }

  /** Inverse by Gauss-Jordan on [A | I]. Returns null when A is singular (det = 0). */
  function inverse(M) {
    requireSquare(M);
    var n = M.length;
    var A = M.map(function (row, i) { return row.concat(identity(n)[i]); });
    for (var c = 0; c < n; c++) {
      var p = -1;
      for (var i = c; i < n; i++) if (!A[i][c].isZero()) { p = i; break; }
      if (p < 0) return null;
      if (p !== c) { var t = A[p]; A[p] = A[c]; A[c] = t; }
      var pv = A[c][c];
      A[c] = A[c].map(function (x) { return x.div(pv); });
      for (var r = 0; r < n; r++) {
        if (r === c) continue;
        var f = A[r][c];
        if (f.isZero()) continue;
        for (var j = 0; j < 2 * n; j++) A[r][j] = A[r][j].sub(f.mul(A[c][j]));
      }
    }
    return A.map(function (row) { return row.slice(n); });
  }

  function equals(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) return false;
    return A.every(function (row, i) { return row.every(function (x, j) { return x.eq(B[i][j]); }); });
  }

  DM.matrix = { identity: identity, multiply: multiply, determinant: determinant, inverse: inverse, equals: equals, copy: copy };
  if (typeof module !== 'undefined' && module.exports) module.exports = DM;
})(typeof window !== 'undefined' ? window : globalThis);
