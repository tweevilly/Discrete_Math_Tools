/* Exact rational arithmetic on BigInt, so 1/3 stays 1/3 and 2^100 stays exact. */
(function (root) {
  'use strict';
  var DM = (root.DM = root.DM || {});

  function abs(x) { return x < 0n ? -x : x; }
  function gcd(a, b) {
    a = abs(a); b = abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  function Fraction(n, d) {
    n = BigInt(n);
    d = d === undefined ? 1n : BigInt(d);
    if (d === 0n) throw new Error('Division by zero');
    if (d < 0n) { n = -n; d = -d; }
    var g = gcd(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }

  /** Parse "3", "-2.5", ".5", "3/4", "-3/4" (a Unicode minus is accepted too). */
  Fraction.parse = function (text) {
    var s = String(text).trim().replace(/−/g, '-').replace(/\s+/g, '');
    if (s === '') throw new Error('is empty');
    var m = /^([+-]?)(\d+)\/(\d+)$/.exec(s);
    if (m) {
      if (BigInt(m[3]) === 0n) throw new Error('has a zero denominator');
      var num = BigInt(m[2]);
      return new Fraction(m[1] === '-' ? -num : num, BigInt(m[3]));
    }
    m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s);
    if (m && (m[2] || m[3])) {
      var frac = m[3] || '';
      var n = BigInt((m[2] || '0') + frac);
      return new Fraction(m[1] === '-' ? -n : n, 10n ** BigInt(frac.length));
    }
    throw new Error('is not a number (use 3, -2.5, or 3/4)');
  };

  var P = Fraction.prototype;
  P.add = function (o) { return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); };
  P.sub = function (o) { return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); };
  P.mul = function (o) { return new Fraction(this.n * o.n, this.d * o.d); };
  P.div = function (o) {
    if (o.n === 0n) throw new Error('Division by zero');
    return new Fraction(this.n * o.d, this.d * o.n);
  };
  P.neg = function () { return new Fraction(-this.n, this.d); };
  P.abs = function () { return new Fraction(abs(this.n), this.d); };
  P.isZero = function () { return this.n === 0n; };
  P.isOne = function () { return this.n === 1n && this.d === 1n; };
  P.isNeg = function () { return this.n < 0n; };
  P.isInt = function () { return this.d === 1n; };
  P.cmp = function (o) {
    var l = this.n * o.d, r = o.n * this.d;
    return l < r ? -1 : l > r ? 1 : 0;
  };
  P.eq = function (o) { return this.n === o.n && this.d === o.d; };
  P.pow = function (k) {
    if (!Number.isInteger(k)) throw new Error('Exponent must be an integer');
    var K = BigInt(Math.abs(k));
    var r = new Fraction(this.n ** K, this.d ** K);
    return k >= 0 ? r : new Fraction(1).div(r);
  };
  P.toNumber = function () { return Number(this.n) / Number(this.d); };

  /** Decimal string rounded half up to `places`, trailing zeros trimmed. */
  P.toDecimal = function (places) {
    places = places === undefined ? 4 : places;
    var neg = this.n < 0n;
    var n = abs(this.n);
    var scale = 10n ** BigInt(places);
    var q = (n * scale * 2n + this.d) / (this.d * 2n);
    var s = q.toString().padStart(places + 1, '0');
    var whole = s.slice(0, s.length - places);
    var frac = s.slice(s.length - places).replace(/0+$/, '');
    return (neg && q !== 0n ? '-' : '') + whole + (frac ? '.' + frac : '');
  };

  function big(b) {
    var s = b.toString();
    var sign = '';
    if (s[0] === '-') { sign = '-'; s = s.slice(1); }
    if (s.length <= 18) return sign + s;
    return sign + s[0] + '.' + s.slice(1, 6) + 'e+' + (s.length - 1);
  }

  /** Display text. mode: 'fraction' (default) or 'decimal'. Very large integers use e-notation. */
  DM.format = function (f, mode) {
    if (f.d === 1n) return big(f.n);
    if (mode === 'decimal') return f.toDecimal(4);
    return big(f.n) + '/' + big(f.d);
  };
  /** Exact text, never abbreviated (used for tooltips and tests). */
  Fraction.prototype.toString = function () {
    return this.d === 1n ? this.n.toString() : this.n + '/' + this.d;
  };

  DM.Fraction = Fraction;
  DM.fr = function (x) { return x instanceof Fraction ? x : new Fraction(x); };
  if (typeof module !== 'undefined' && module.exports) module.exports = DM;
})(typeof window !== 'undefined' ? window : globalThis);
