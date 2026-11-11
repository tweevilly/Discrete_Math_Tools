'use strict';
// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const DM = require('../assets/fraction.js');
require('../assets/matrices.js');
require('../assets/rref.js');
require('../assets/sequences.js');
require('../assets/logic.js');

const F = DM.Fraction;
const M = (rows) => rows.map((r) => r.map((x) => F.parse(String(x))));
const S = (m) => m.map((r) => r.map(String));

test('fractions: parse, arithmetic, exactness', () => {
  assert.equal(F.parse('3/6').toString(), '1/2');
  assert.equal(F.parse('-0.25').toString(), '-1/4');
  assert.equal(F.parse('.5').toString(), '1/2');
  assert.equal(F.parse('−3').toString(), '-3');
  assert.equal(F.parse('1/3').add(F.parse('1/6')).toString(), '1/2');
  assert.equal(new F(2).pow(100).toString(), '1267650600228229401496703205376');
  assert.equal(F.parse('1/3').toDecimal(4), '0.3333');
  assert.equal(F.parse('-2/3').toDecimal(2), '-0.67');
  assert.throws(() => F.parse('abc'), /not a number/);
  assert.throws(() => F.parse('1/0'), /zero denominator/);
  assert.throws(() => F.parse(''), /empty/);
});

test('matrices: product from the notes (2x3 times 3x2)', () => {
  const A = M([[1, 3, -3], [3, 0, 5]]);
  const B = M([[3, 0], [-3, 1], [0, 5]]);
  assert.deepEqual(S(DM.matrix.multiply(A, B)), [['-6', '-12'], ['9', '25']]);
  assert.throws(() => DM.matrix.multiply(B, B), /must match/);
});

test('matrices: determinant and inverse (the Square Matrix A table)', () => {
  const A = M([[-5, 7], [3, -4]]);
  assert.equal(DM.matrix.determinant(A).toString(), '-1');
  const inv = DM.matrix.inverse(A);
  assert.deepEqual(S(inv), [['4', '7'], ['3', '5']]);
  assert.ok(DM.matrix.equals(DM.matrix.multiply(A, inv), DM.matrix.identity(2)));
});

test('matrices: singular matrix has det 0 and no inverse; fractions stay exact', () => {
  const sing = M([[1, 2], [2, 4]]);
  assert.equal(DM.matrix.determinant(sing).toString(), '0');
  assert.equal(DM.matrix.inverse(sing), null);
  const A = M([[2, 0, 1], [1, 3, 2], [1, 1, 2]]);
  const inv = DM.matrix.inverse(A);
  assert.ok(DM.matrix.equals(DM.matrix.multiply(A, inv), DM.matrix.identity(3)));
  assert.equal(DM.matrix.determinant(M([[0, 1], [1, 0]])).toString(), '-1'); // row swap flips the sign
});

test('row reduction: unique solution', () => {
  const r = DM.rref.reduce(M([[1, 1, 1, 6], [2, -1, 1, 3], [1, 2, -1, 2]]), true);
  assert.equal(r.rank, 3);
  assert.equal(r.solution.status, 'unique');
  assert.deepEqual(r.solution.lines, ['x₁ = 1', 'x₂ = 2', 'x₃ = 3']);
  assert.deepEqual(S(r.rref), [['1', '0', '0', '1'], ['0', '1', '0', '2'], ['0', '0', '1', '3']]);
  // echelon form has zeros below the pivots
  assert.equal(r.echelon[2][0].toString(), '0');
  assert.equal(r.echelon[2][1].toString(), '0');
});

test('row reduction: no solution and infinitely many', () => {
  const none = DM.rref.reduce(M([[1, 1, 2], [1, 1, 3]]), true);
  assert.equal(none.solution.status, 'none');
  const inf = DM.rref.reduce(M([[1, 2, 3], [2, 4, 6]]), true);
  assert.equal(inf.solution.status, 'infinite');
  assert.deepEqual(inf.solution.lines, ['x₁ = 3 − 2·x₂', 'x₂ is free (any real number)']);
});

test('row reduction: plain matrix (not augmented) and row swap', () => {
  const r = DM.rref.reduce(M([[0, 2], [1, 1]]), false);
  assert.deepEqual(S(r.rref), [['1', '0'], ['0', '1']]);
  assert.ok(r.steps.some((s) => s.desc === 'R1 ↔ R2'));
});

test('sequences: geometric a(n) = 2^n from the notes', () => {
  const seq = { kind: 'geometric', first: new F(1), step: new F(2), start: 0 };
  assert.equal(DM.sequences.term(seq, 11).toString(), '2048');
  assert.equal(DM.sequences.partialSum(seq, 11).toString(), '4095');
  assert.equal(DM.sequences.terms(seq, 3).map((t) => t.value.toString()).join(','), '1,2,4,8');
});

test('sequences: arithmetic term and sum, 1-indexed', () => {
  const seq = { kind: 'arithmetic', first: new F(5), step: new F(3), start: 1 };
  assert.equal(DM.sequences.term(seq, 10).toString(), '32');
  assert.equal(DM.sequences.partialSum(seq, 10).toString(), '185'); // 10(5+32)/2
});

test('sequences: convergence', () => {
  const geo = (a, r) => ({ kind: 'geometric', first: new F(a), step: F.parse(r), start: 1 });
  const half = DM.sequences.behavior(geo(1, '1/2'));
  assert.equal(half.sumConverges, true);
  assert.equal(half.sum.toString(), '2');
  assert.equal(DM.sequences.behavior(geo(1, '2')).sumConverges, false);   // the notes' r = 2 case
  assert.equal(DM.sequences.behavior(geo(1, '1')).sumConverges, false);
  assert.equal(DM.sequences.behavior(geo(1, '-1')).sumConverges, false);
  assert.equal(DM.sequences.behavior(geo(0, '5')).sumConverges, true);
  assert.equal(DM.sequences.partialSum(geo(3, '1'), 4).toString(), '12');
  const two = DM.sequences.fromConsecutive(new F(2), new F(6));
  assert.equal(two.ratio.toString(), '3');
  assert.equal(two.difference.toString(), '4');
  assert.equal(DM.sequences.fromConsecutive(new F(0), new F(6)).ratio, null);
});

const L = DM.logic;
const col = (t) => t.rows.map((r) => (r.cells[r.cells.length - 1] ? 'T' : 'F')).join('');

test('logic: P and Q, P or Q table order matches the notes (T,T first)', () => {
  assert.equal(col(L.truthTable('P ^ Q')), 'TFFF');
  assert.equal(col(L.truthTable('P v Q')), 'TTTF');
  assert.deepEqual(L.truthTable('P and Q').vars, ['P', 'Q']);
});

test('logic: implication, iff, xor, not', () => {
  assert.equal(col(L.truthTable('P -> Q')), 'TFTT');
  assert.equal(col(L.truthTable('P <-> Q')), 'TFFT');
  assert.equal(col(L.truthTable('P xor Q')), 'FTTF');
  assert.equal(col(L.truthTable('not P')), 'FT');
  assert.equal(col(L.truthTable('P -> Q -> R')), col(L.truthTable('P -> (Q -> R)'))); // right associative
});

test('logic: classification', () => {
  assert.equal(L.truthTable('P or not P').kind, 'tautology');
  assert.equal(L.truthTable('P and not P').kind, 'contradiction');
  assert.equal(L.truthTable('P and Q').kind, 'contingent');
  assert.equal(L.truthTable('(P -> Q) <-> (not Q -> not P)').kind, 'tautology');
});

test('logic: Boolean algebra shorthand from the notes (+ is OR, side by side is AND, -x is NOT)', () => {
  const laws = [
    ['x + (-x)', '1'], ['x*(-x)', '0'], ['x + x', 'x'], ['x*x', 'x'], ['x + 0', 'x'], ['x + 1', '1'],
    ['x + xy', 'x'], ['x(x+y)', 'x'], ['x + x(-y)', 'x'], ['x(-x) + xy', 'xy']
  ];
  laws.forEach(([a, b]) => assert.equal(L.compare(a, b).equivalent, true, a + ' = ' + b));
  assert.equal(L.compare('x + y', 'x').equivalent, false);
  assert.equal(L.compare('x + y', 'x').differences.length > 0, true);
});

test('logic: sub-expression columns and printing', () => {
  const t = L.truthTable('(P and Q) or not R');
  assert.deepEqual(t.columns.map((c) => c.label), ['P ∧ Q', '¬R', 'P ∧ Q ∨ ¬R']);
  assert.equal(L.toString(L.parse('P and (Q or R)')), 'P ∧ (Q ∨ R)');
  assert.equal(L.truthTable('P').columns.length, 1);
});

test('logic: friendly errors', () => {
  assert.throws(() => L.parse(''), /Type an expression/);
  assert.throws(() => L.parse('(P and Q'), /closing parenthesis/);
  assert.throws(() => L.parse('P and'), /ends too soon/);
  assert.throws(() => L.parse('P and Q)'), /Unmatched/);
  assert.throws(() => L.parse('P $ Q'), /Unexpected character/);
  assert.throws(() => L.parse('P and or Q'), /Expected a variable/);
  assert.throws(() => L.truthTable('a b c d e f g'), /up to 6 variables/);
});
