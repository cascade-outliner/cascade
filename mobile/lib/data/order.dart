import 'node.dart';

const _digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
final _zero = _digits[0];
final _last = _digits[_digits.length - 1];

int byOrder(Node a, Node b) => a.order.compareTo(b.order);

String orderBetween(String? prev, String? next) => generateKeyBetween(prev, next);

String _midpoint(String a, String? b) {
  if (b != null && a.compareTo(b) >= 0) {
    throw ArgumentError('$a >= $b');
  }
  if (a.endsWith(_zero) || (b != null && b.endsWith(_zero))) {
    throw ArgumentError('trailing zero');
  }
  if (b != null) {
    var n = 0;
    while ((n < a.length ? a[n] : _zero) == b[n]) {
      n++;
    }
    if (n > 0) {
      return b.substring(0, n) + _midpoint(a.substring(n < a.length ? n : a.length), b.substring(n));
    }
  }
  final digitA = a.isNotEmpty ? _digits.indexOf(a[0]) : 0;
  final digitB = b != null ? _digits.indexOf(b[0]) : _digits.length;
  if (digitB - digitA > 1) {
    return _digits[(0.5 * (digitA + digitB)).round()];
  }
  if (b != null && b.length > 1) {
    return b.substring(0, 1);
  }
  return _digits[digitA] + _midpoint(a.isEmpty ? '' : a.substring(1), null);
}

int _integerLength(String head) {
  final c = head.codeUnitAt(0);
  if (c >= 0x61 && c <= 0x7a) return c - 0x61 + 2;
  if (c >= 0x41 && c <= 0x5a) return 0x5a - c + 2;
  throw ArgumentError('invalid order key head: $head');
}

String _integerPart(String key) => key.substring(0, _integerLength(key[0]));

String? _increment(String x) {
  final head = x[0];
  final digs = x.substring(1).split('');
  var carry = true;
  for (var i = digs.length - 1; carry && i >= 0; i--) {
    final d = _digits.indexOf(digs[i]) + 1;
    if (d == _digits.length) {
      digs[i] = _zero;
    } else {
      digs[i] = _digits[d];
      carry = false;
    }
  }
  if (carry) {
    if (head == 'Z') return 'a$_zero';
    if (head == 'z') return null;
    final h = String.fromCharCode(head.codeUnitAt(0) + 1);
    if (h.compareTo('a') > 0) {
      digs.add(_zero);
    } else {
      digs.removeLast();
    }
    return h + digs.join();
  }
  return head + digs.join();
}

String? _decrement(String x) {
  final head = x[0];
  final digs = x.substring(1).split('');
  var borrow = true;
  for (var i = digs.length - 1; borrow && i >= 0; i--) {
    final d = _digits.indexOf(digs[i]) - 1;
    if (d == -1) {
      digs[i] = _last;
    } else {
      digs[i] = _digits[d];
      borrow = false;
    }
  }
  if (borrow) {
    if (head == 'a') return 'Z$_last';
    if (head == 'A') return null;
    final h = String.fromCharCode(head.codeUnitAt(0) - 1);
    if (h.compareTo('Z') < 0) {
      digs.add(_last);
    } else {
      digs.removeLast();
    }
    return h + digs.join();
  }
  return head + digs.join();
}

String generateKeyBetween(String? a, String? b) {
  if (a != null && b != null && a.compareTo(b) >= 0) {
    throw ArgumentError('$a >= $b');
  }
  if (a == null) {
    if (b == null) return 'a$_zero';
    final ib = _integerPart(b);
    final fb = b.substring(ib.length);
    if (ib == 'A${_zero * 26}') return ib + _midpoint('', fb);
    if (ib.compareTo(b) < 0) return ib;
    final res = _decrement(ib);
    if (res == null) throw StateError('cannot decrement any more');
    return res;
  }
  if (b == null) {
    final ia = _integerPart(a);
    final fa = a.substring(ia.length);
    final i = _increment(ia);
    return i ?? ia + _midpoint(fa, null);
  }
  final ia = _integerPart(a);
  final fa = a.substring(ia.length);
  final ib = _integerPart(b);
  final fb = b.substring(ib.length);
  if (ia == ib) return ia + _midpoint(fa, fb);
  final i = _increment(ia);
  if (i == null) throw StateError('cannot increment any more');
  if (i.compareTo(b) < 0) return i;
  return ia + _midpoint(fa, null);
}
