import 'node.dart';

typedef TextRange = (int, int);

class Match {
  const Match(this.score, this.ranges);
  final double score;
  final List<TextRange> ranges;
}

class SearchHit {
  const SearchHit(this.node, this.text, this.match);
  final Node node;
  final String text;
  final Match match;
}

class SearchResult {
  const SearchResult(this.hits, this.total);
  final List<SearchHit> hits;
  final int total;
}

const _accents = {
  'àáâãäåāăą': 'a', 'çćĉċč': 'c', 'ďđ': 'd', 'èéêëēĕėęě': 'e', //
  'ĝğġģ': 'g', 'ĥħ': 'h', 'ìíîïĩīĭįı': 'i', 'ĵ': 'j', 'ķ': 'k',
  'ĺļľŀł': 'l', 'ñńņňŉ': 'n', 'òóôõöøōŏő': 'o', 'ŕŗř': 'r',
  'śŝşš': 's', 'ţťŧ': 't', 'ùúûüũūŭůűų': 'u', 'ŵ': 'w', 'ýÿŷ': 'y',
  'źżž': 'z',
};

final Map<String, String> _fold = {
  for (final entry in _accents.entries)
    for (final char in entry.key.split('')) char: entry.value,
};

final _wordChar = RegExp(r'[\p{L}\p{N}]', unicode: true);

String fold(String text) => text.toLowerCase().split('').map((c) => _fold[c] ?? c).join();

bool _isWordStart(String text, int index) => index == 0 || !_wordChar.hasMatch(text[index - 1]);

List<TextRange> _merge(List<TextRange> ranges) {
  final sorted = [...ranges]..sort((a, b) => a.$1.compareTo(b.$1));
  final merged = <TextRange>[];
  for (final range in sorted) {
    if (merged.isNotEmpty && range.$1 <= merged.last.$2) {
      final last = merged.removeLast();
      merged.add((last.$1, range.$2 > last.$2 ? range.$2 : last.$2));
    } else {
      merged.add(range);
    }
  }
  return merged;
}

List<String> terms(String query) => fold(query).split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toSet().toList();

Match? matchTerms(List<String> queryTerms, String folded) {
  if (queryTerms.isEmpty) return null;
  var score = 0.0;
  final ranges = <TextRange>[];
  for (final term in queryTerms) {
    var best = -1;
    for (var at = folded.indexOf(term); at != -1; at = folded.indexOf(term, at + 1)) {
      if (best == -1) best = at;
      if (_isWordStart(folded, at)) {
        best = at;
        break;
      }
    }
    if (best == -1) return null;
    final end = best + term.length;
    final wordStart = _isWordStart(folded, best);
    final wordEnd = end == folded.length || !_wordChar.hasMatch(folded[end]);
    score += 1 + (wordStart ? 2 : 0) + (wordStart && wordEnd ? 1 : 0);
    score -= (best < 999 ? best : 999) / 1000;
    ranges.add((best, end));
  }
  return Match(score, _merge(ranges));
}

SearchResult searchNodes(Iterable<Node> nodes, String query, int limit) {
  final queryTerms = terms(query);
  final hits = <SearchHit>[];
  if (queryTerms.isNotEmpty) {
    for (final node in nodes) {
      final match = matchTerms(queryTerms, fold(node.text));
      if (match != null) hits.add(SearchHit(node, node.text, match));
    }
  }
  hits.sort((a, b) {
    final byScore = b.match.score.compareTo(a.match.score);
    if (byScore != 0) return byScore;
    final byLength = a.text.length.compareTo(b.text.length);
    if (byLength != 0) return byLength;
    return b.node.updatedAt.compareTo(a.node.updatedAt);
  });
  return SearchResult(hits.take(limit).toList(), hits.length);
}

List<TextRange> phraseRanges(String text, List<String> phrases) {
  final folded = fold(text);
  return _merge([
    for (final phrase in phrases)
      if (phrase.trim().isNotEmpty) ...?matchTerms([fold(phrase.trim())], folded)?.ranges,
  ]);
}
