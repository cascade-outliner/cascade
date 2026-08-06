import 'outline_node.dart';

/// Where a node currently lives in the tree: the list it's stored in
/// (either the root list or some other node's `children`), its index in
/// that list, and its parent (`null` for top-level nodes).
class NodeLocation {
  NodeLocation({required this.list, required this.index, required this.parent});

  final List<OutlineNode> list;
  final int index;
  final OutlineNode? parent;

  OutlineNode get node => list[index];
}

/// One row of a flattened, expand/collapse-aware view of the tree, ready
/// to render as a flat list.
class VisibleOutlineRow {
  VisibleOutlineRow({required this.node, required this.depth});

  final OutlineNode node;
  final int depth;
}

/// Pure, Flutter-free operations on an outline tree (a `List<OutlineNode>`
/// of roots). Kept separate from `OutlineController` so tree editing can be
/// unit tested directly, and separate from the domain model so `OutlineNode`
/// stays a plain data holder.
///
/// Every mutating function here mutates the tree in place (nodes are
/// reference types) and returns whether anything changed, so callers — in
/// practice just `OutlineController` — can decide whether to notify
/// listeners.

NodeLocation? locateNode(List<OutlineNode> roots, String id, {OutlineNode? parent}) {
  for (var i = 0; i < roots.length; i++) {
    if (roots[i].id == id) {
      return NodeLocation(list: roots, index: i, parent: parent);
    }
    final found = locateNode(roots[i].children, id, parent: roots[i]);
    if (found != null) return found;
  }
  return null;
}

List<VisibleOutlineRow> flattenVisible(List<OutlineNode> roots) {
  final rows = <VisibleOutlineRow>[];
  void walk(List<OutlineNode> nodes, int depth) {
    for (final node in nodes) {
      rows.add(VisibleOutlineRow(node: node, depth: depth));
      if (node.hasChildren && node.expanded) {
        walk(node.children, depth + 1);
      }
    }
  }

  walk(roots, 0);
  return rows;
}

bool toggleExpanded(List<OutlineNode> roots, String id) {
  final loc = locateNode(roots, id);
  if (loc == null) return false;
  loc.node.expanded = !loc.node.expanded;
  return true;
}

bool setNodeText(List<OutlineNode> roots, String id, String text) {
  final loc = locateNode(roots, id);
  if (loc == null || loc.node.text == text) return false;
  loc.node.text = text;
  return true;
}

/// Inserts [newNode] directly after [id] in its sibling list. Returns
/// false (and inserts nothing) if [id] doesn't exist.
bool insertSiblingAfter(List<OutlineNode> roots, String id, OutlineNode newNode) {
  final loc = locateNode(roots, id);
  if (loc == null) return false;
  loc.list.insert(loc.index + 1, newNode);
  return true;
}

/// Appends [newNode] as the last child of [id] and expands it so the new
/// node is immediately visible. Returns false if [id] doesn't exist.
bool insertChild(List<OutlineNode> roots, String id, OutlineNode newNode) {
  final loc = locateNode(roots, id);
  if (loc == null) return false;
  loc.node.children.add(newNode);
  loc.node.expanded = true;
  return true;
}

/// Makes the node at [id] the last child of its previous sibling. No-op if
/// [id] is already the first child of its list (there's no previous
/// sibling to become its parent).
bool indentNode(List<OutlineNode> roots, String id) {
  final loc = locateNode(roots, id);
  if (loc == null || loc.index == 0) return false;
  final previousSibling = loc.list[loc.index - 1];
  loc.list.removeAt(loc.index);
  previousSibling.children.add(loc.node);
  previousSibling.expanded = true;
  return true;
}

/// Moves the node at [id] out of its parent, placing it as the parent's
/// next sibling. No-op if [id] is already top-level.
bool outdentNode(List<OutlineNode> roots, String id) {
  final loc = locateNode(roots, id);
  if (loc == null || loc.parent == null) return false;
  final parentLoc = locateNode(roots, loc.parent!.id);
  if (parentLoc == null) return false;
  loc.list.removeAt(loc.index);
  parentLoc.list.insert(parentLoc.index + 1, loc.node);
  return true;
}

/// Removes the node at [id] (and its subtree) from the tree, returning the
/// removed node so the caller can clean up any UI state keyed by it and its
/// descendants. Returns null if [id] doesn't exist.
OutlineNode? deleteNode(List<OutlineNode> roots, String id) {
  final loc = locateNode(roots, id);
  if (loc == null) return null;
  return loc.list.removeAt(loc.index);
}

/// Yields a node and every descendant, depth-first — used to clean up
/// per-node UI state (text controllers, focus nodes) for an entire removed
/// subtree.
Iterable<OutlineNode> subtreeOf(OutlineNode node) sync* {
  yield node;
  for (final child in node.children) {
    yield* subtreeOf(child);
  }
}
