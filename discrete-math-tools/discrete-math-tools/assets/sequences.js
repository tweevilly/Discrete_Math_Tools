/* Arithmetic and geometric sequences and their sums. */
(function (root) {
  'use strict';
  var DM = (root.DM = root.DM || {});
  if (typeof require !== 'undefined' && !DM.Fraction) require('./fraction.js');
  var F = DM.Fraction;

  /**
   * A sequence is { kind: 'geometric' | 'arithmetic', first, step, start }.
   * first is the term at index `start`; step is the common ratio r or common difference d.
   */
  function term(seq, n) {
    var k = n - seq.start;
    return seq.kind === 'geometric'
      ? seq.first.mul(seq.step.pow(k))
      : seq.first.add(seq.step.mul(new F(k)));
  }

  /** Terms from index start through n. */
  function terms(seq, n) {
    var out = [];
    for (var i = seq.start; i <= n; i++) out.push({ n: i, value: term(seq, i) });
    return out;
  }

  /** Sum of the terms from index start through n. */
  function partialSum(seq, n) {
    var count = n - seq.start + 1;
    if (count <= 0) return new F(0);
    if (seq.kind === 'arithmetic') {
      // S = count * (first + last) / 2
      return new F(count).mul(seq.first.add(term(seq, n))).div(new F(2));
    }
    if (seq.step.isOne()) return seq.first.mul(new F(count));
    // S = a1 (1 - r^count) / (1 - r)
    return seq.first.mul(new F(1).sub(seq.step.pow(count))).div(new F(1).sub(seq.step));
  }

  /**
   * What happens as n grows.
   * Returns { termsApproach, sumConverges, sum, why } with text for display.
   */
  function behavior(seq) {
    var zero = seq.first.isZero();
    if (seq.kind === 'geometric') {
      var r = seq.step, a = r.abs();
      var small = a.cmp(new F(1)) < 0;
      if (zero) return { termsApproach: '0', sumConverges: true, sum: new F(0), why: 'every term is 0' };
      if (small) {
        return {
          termsApproach: '0',
          sumConverges: true,
          sum: seq.first.div(new F(1).sub(r)),
          why: '|r| < 1, so the sum is a₁ / (1 − r)'
        };
      }
      if (r.isOne()) return { termsApproach: seq.first.toString(), sumConverges: false, why: 'r = 1, so every term is the same and the sum keeps growing' };
      if (r.eq(new F(-1))) return { termsApproach: 'no limit (alternates between ' + seq.first + ' and ' + seq.first.neg() + ')', sumConverges: false, why: 'r = −1, so the partial sums bounce between two values' };
      return { termsApproach: 'no limit (terms grow without bound)', sumConverges: false, why: '|r| ≥ 1, so there is no finite sum' };
    }
    if (zero && seq.step.isZero()) return { termsApproach: '0', sumConverges: true, sum: new F(0), why: 'every term is 0' };
    return { termsApproach: 'no limit', sumConverges: false, why: 'terms keep changing by d each step, so the sum has no finite value' };
  }

  /** Two consecutive terms give r (geometric) and d (arithmetic). r is null when the first term is 0. */
  function fromConsecutive(a, b) {
    return { difference: b.sub(a), ratio: a.isZero() ? null : b.div(a) };
  }

  DM.sequences = { term: term, terms: terms, partialSum: partialSum, behavior: behavior, fromConsecutive: fromConsecutive };
  if (typeof module !== 'undefined' && module.exports) module.exports = DM;
})(typeof window !== 'undefined' ? window : globalThis);
