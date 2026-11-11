/* Propositional logic and Boolean algebra: parse an expression, build a truth table, test equivalence.
 *
 * Accepted notation (mix freely):
 *   NOT   not  ¬  !  ~  -x
 *   AND   and  ∧  &  &&  *  ·  ^  or just write letters side by side (xy, x(x+y))
 *   OR    or   ∨  |  ||  +  or a spaced v  (P v Q)
 *   XOR   xor  ⊕
 *   IMPLIES  ->  =>  →  ⇒  implies
 *   IFF      <-> <=> ↔  ⇔  iff
 *   constants  true false 1 0
 * Variables are single letters. Precedence, tightest first: NOT, AND, OR/XOR, IMPLIES, IFF.
 */
(function (root) {
  'use strict';
  var DM = (root.DM = root.DM || {});

  var MAX_VARS = 6;

  // ---------- tokenizer ----------
  var WORDS = {
    and: 'and', or: 'or', not: 'not', xor: 'xor', implies: 'imp', iff: 'iff',
    'true': 'true', 'false': 'false'
  };
  var SYMBOLS = [
    ['<->', 'iff'], ['<=>', 'iff'], ['->', 'imp'], ['=>', 'imp'], ['&&', 'and'], ['||', 'or'],
    ['↔', 'iff'], ['⇔', 'iff'], ['→', 'imp'], ['⇒', 'imp'],
    ['¬', 'not'], ['∧', 'and'], ['∨', 'or'], ['⊕', 'xor'], ['⊻', 'xor'], ['·', 'and'],
    ['!', 'not'], ['~', 'not'], ['-', 'not'], ['&', 'and'], ['*', 'and'], ['^', 'and'], ['|', 'or'], ['+', 'or']
  ];

  function isOperandEnd(tok) { return tok && (tok.t === 'var' || tok.t === 'const' || tok.t === ')'); }

  function tokenize(src) {
    var toks = [], i = 0;
    while (i < src.length) {
      var ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '(' || ch === ')') { toks.push({ t: ch, pos: i }); i++; continue; }
      var matched = false;
      for (var s = 0; s < SYMBOLS.length; s++) {
        var sym = SYMBOLS[s][0];
        if (src.substr(i, sym.length) === sym) {
          toks.push({ t: 'op', v: SYMBOLS[s][1], pos: i });
          i += sym.length; matched = true; break;
        }
      }
      if (matched) continue;
      if (ch === '0' || ch === '1') { toks.push({ t: 'const', v: ch === '1', pos: i }); i++; continue; }
      if (/[A-Za-z]/.test(ch)) {
        var j = i;
        while (j < src.length && /[A-Za-z]/.test(src[j])) j++;
        var word = src.slice(i, j), lower = word.toLowerCase();
        if (WORDS[lower]) {
          var kind = WORDS[lower];
          if (kind === 'true' || kind === 'false') toks.push({ t: 'const', v: kind === 'true', pos: i });
          else toks.push({ t: 'op', v: kind, pos: i });
        } else if (word.length === 1 && lower === 'v' &&
                   isOperandEnd(toks[toks.length - 1]) && i > 0 && /\s/.test(src[i - 1]) &&
                   j < src.length && /\s/.test(src[j]) && /^\s*[A-Za-z01(¬!~-]/.test(src.slice(j))) {
          toks.push({ t: 'op', v: 'or', pos: i }); // "P v Q"
        } else {
          for (var k = 0; k < word.length; k++) toks.push({ t: 'var', v: word[k], pos: i + k });
        }
        i = j; continue;
      }
      throw new Error('Unexpected character "' + ch + '" at position ' + (i + 1) + '.');
    }
    return toks;
  }

  // ---------- parser ----------
  function parse(src) {
    var toks = tokenize(src);
    if (!toks.length) throw new Error('Type an expression, like P and not Q.');
    var p = 0;
    function peek() { return toks[p]; }
    function isOp(tok, names) { return tok && tok.t === 'op' && names.indexOf(tok.v) >= 0; }
    function startsOperand(tok) { return tok && (tok.t === 'var' || tok.t === 'const' || tok.t === '(' || isOp(tok, ['not'])); }
    function describe(tok) { return tok ? 'at position ' + (tok.pos + 1) : 'at the end'; }

    function parseIff() {
      var l = parseImp();
      while (isOp(peek(), ['iff'])) { p++; l = { t: 'bin', op: 'iff', l: l, r: parseImp() }; }
      return l;
    }
    function parseImp() {
      var l = parseOr();
      if (isOp(peek(), ['imp'])) { p++; return { t: 'bin', op: 'imp', l: l, r: parseImp() }; }
      return l;
    }
    function parseOr() {
      var l = parseAnd();
      while (isOp(peek(), ['or', 'xor'])) { var op = toks[p++].v; l = { t: 'bin', op: op, l: l, r: parseAnd() }; }
      return l;
    }
    function parseAnd() {
      var l = parseNot();
      for (;;) {
        if (isOp(peek(), ['and'])) { p++; l = { t: 'bin', op: 'and', l: l, r: parseNot() }; }
        else if (startsOperand(peek())) { l = { t: 'bin', op: 'and', l: l, r: parseNot() }; } // written side by side
        else break;
      }
      return l;
    }
    function parseNot() {
      if (isOp(peek(), ['not'])) { p++; return { t: 'not', a: parseNot() }; }
      return parseAtom();
    }
    function parseAtom() {
      var tok = peek();
      if (!tok) throw new Error('The expression ends too soon. Something is missing after the last operator.');
      if (tok.t === 'var') { p++; return { t: 'var', name: tok.v }; }
      if (tok.t === 'const') { p++; return { t: 'const', value: tok.v }; }
      if (tok.t === '(') {
        p++;
        var inner = parseIff();
        if (!peek() || peek().t !== ')') throw new Error('Missing a closing parenthesis ' + describe(peek()) + '.');
        p++;
        return inner;
      }
      if (tok.t === ')') throw new Error('Unexpected ")" ' + describe(tok) + '.');
      throw new Error('Expected a variable or "(" ' + describe(tok) + ', found an operator.');
    }

    var ast = parseIff();
    if (p < toks.length) {
      var t = toks[p];
      throw new Error(t.t === ')' ? 'Unmatched ")" ' + describe(t) + '.' : 'Unexpected input ' + describe(t) + '.');
    }
    return ast;
  }

  // ---------- evaluation and printing ----------
  function evaluate(n, env) {
    switch (n.t) {
      case 'var': return !!env[n.name];
      case 'const': return n.value;
      case 'not': return !evaluate(n.a, env);
      default:
        var a = evaluate(n.l, env), b = evaluate(n.r, env);
        switch (n.op) {
          case 'and': return a && b;
          case 'or': return a || b;
          case 'xor': return a !== b;
          case 'imp': return !a || b;
          case 'iff': return a === b;
        }
    }
  }

  var PREC = { iff: 1, imp: 2, or: 3, xor: 3, and: 4 };
  var SYM = { and: '∧', or: '∨', xor: '⊕', imp: '→', iff: '↔' };

  function toString(n) {
    switch (n.t) {
      case 'var': return n.name;
      case 'const': return n.value ? '1' : '0';
      case 'not': return '¬' + (n.a.t === 'bin' ? '(' + toString(n.a) + ')' : toString(n.a));
      default:
        function side(c) {
          if (c.t !== 'bin') return toString(c);
          var assoc = c.op === n.op && (n.op === 'and' || n.op === 'or');
          var wrap = PREC[c.op] < PREC[n.op] || (PREC[c.op] === PREC[n.op] && !assoc);
          return wrap ? '(' + toString(c) + ')' : toString(c);
        }
        return side(n.l) + ' ' + SYM[n.op] + ' ' + side(n.r);
    }
  }

  function collect(n, set) {
    if (n.t === 'var') set[n.name] = true;
    else if (n.t === 'not') collect(n.a, set);
    else if (n.t === 'bin') { collect(n.l, set); collect(n.r, set); }
    return set;
  }
  function variables(ast) {
    return Object.keys(collect(ast, {})).sort(function (a, b) {
      var la = a.toLowerCase(), lb = b.toLowerCase();
      return la < lb ? -1 : la > lb ? 1 : a < b ? -1 : a > b ? 1 : 0;
    });
  }

  /** Non-leaf sub-expressions, innermost first, each shown once. The last one is the whole expression. */
  function subexpressions(ast) {
    var seen = {}, out = [];
    (function walk(n) {
      if (n.t === 'var' || n.t === 'const') return;
      if (n.t === 'not') walk(n.a); else { walk(n.l); walk(n.r); }
      var key = toString(n);
      if (!seen[key]) { seen[key] = true; out.push(n); }
    })(ast);
    return out;
  }

  /** All assignments for the given variables, starting with every variable true. */
  function assignments(vars) {
    var rows = [], total = 1 << vars.length;
    for (var i = 0; i < total; i++) {
      var env = {};
      vars.forEach(function (v, k) { env[v] = !((i >> (vars.length - 1 - k)) & 1); });
      rows.push(env);
    }
    return rows;
  }

  function checkSize(vars) {
    if (vars.length > MAX_VARS) throw new Error('This tool handles up to ' + MAX_VARS + ' variables. Found ' + vars.length + ': ' + vars.join(', ') + '.');
  }

  function truthTable(src) {
    var ast = parse(src);
    var vars = variables(ast);
    checkSize(vars);
    var subs = subexpressions(ast);
    var columns = (subs.length ? subs : [ast]).map(function (n) { return { label: toString(n), node: n }; });
    var rows = assignments(vars).map(function (env) {
      return {
        env: env,
        values: vars.map(function (v) { return env[v]; }),
        cells: columns.map(function (c) { return evaluate(c.node, env); })
      };
    });
    var result = rows.map(function (r) { return r.cells[r.cells.length - 1]; });
    var kind = result.every(Boolean) ? 'tautology' : result.some(Boolean) ? 'contingent' : 'contradiction';
    return { ast: ast, text: toString(ast), vars: vars, columns: columns, rows: rows, kind: kind };
  }

  /** Are two expressions true under exactly the same assignments? */
  function compare(srcA, srcB) {
    var a = parse(srcA), b = parse(srcB);
    var set = collect(a, {}); collect(b, set);
    var vars = Object.keys(set).sort(function (x, y) { return x.toLowerCase() < y.toLowerCase() ? -1 : x.toLowerCase() > y.toLowerCase() ? 1 : 0; });
    checkSize(vars);
    var rows = assignments(vars).map(function (env) {
      return { env: env, values: vars.map(function (v) { return env[v]; }), a: evaluate(a, env), b: evaluate(b, env) };
    });
    var diff = rows.filter(function (r) { return r.a !== r.b; });
    return { vars: vars, textA: toString(a), textB: toString(b), rows: rows, equivalent: diff.length === 0, differences: diff };
  }

  DM.logic = { parse: parse, toString: toString, evaluate: evaluate, variables: variables, truthTable: truthTable, compare: compare, MAX_VARS: MAX_VARS };
  if (typeof module !== 'undefined' && module.exports) module.exports = DM;
})(typeof window !== 'undefined' ? window : globalThis);
