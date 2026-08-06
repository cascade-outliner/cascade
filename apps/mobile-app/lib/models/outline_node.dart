/// A single node in the outline tree.
///
/// This is an in-memory model only — there is no persistence or sync with
/// the web app's backend yet. It exists to give the mobile client a basic,
/// working outliner to build on.
class OutlineNode {
  OutlineNode({required this.id, this.text = '', List<OutlineNode>? children, this.expanded = true})
    : children = children ?? [];

  final String id;
  String text;
  List<OutlineNode> children;
  bool expanded;

  bool get hasChildren => children.isNotEmpty;
}

/// Monotonically increasing id generator for newly created nodes.
///
/// A real client will eventually get ids from the server; this is just
/// enough to keep in-memory nodes distinct.
class OutlineIdGenerator {
  int _counter = 0;

  String next() {
    _counter += 1;
    return 'node-$_counter-${DateTime.now().microsecondsSinceEpoch}';
  }
}
