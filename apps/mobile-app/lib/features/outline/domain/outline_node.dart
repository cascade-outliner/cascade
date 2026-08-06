/// A single node in the outline tree.
///
/// Deliberately mutable (children is a plain growable list) rather than an
/// immutable/copyWith model: tree edits are structural (move a node into a
/// different parent's children list) rather than replacing whole subtrees,
/// and the pure functions in `outline_tree.dart` are what own how those
/// edits happen. Nothing outside `domain`/`application` should reach in and
/// mutate a node directly.
class OutlineNode {
  OutlineNode({required this.id, this.text = '', List<OutlineNode>? children, this.expanded = true})
    : children = children ?? [];

  final String id;
  String text;
  List<OutlineNode> children;
  bool expanded;

  bool get hasChildren => children.isNotEmpty;
}

/// Generates ids for newly created nodes.
///
/// Once nodes are created server-side, this goes away in favour of ids the
/// backend assigns; it exists only so the in-memory tree can create nodes
/// today.
class OutlineIdGenerator {
  int _counter = 0;

  String next() {
    _counter += 1;
    return 'node-$_counter-${DateTime.now().microsecondsSinceEpoch}';
  }
}
