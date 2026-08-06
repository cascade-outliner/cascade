import 'package:flutter/material.dart';

import '../models/outline_node.dart';
import '../widgets/outline_row.dart';

/// Where a node currently lives in the tree: the list it's stored in
/// (either the root list or some other node's `children`), its index in
/// that list, and its parent (`null` for top-level nodes).
class _NodeLocation {
  _NodeLocation({required this.list, required this.index, required this.parent});

  final List<OutlineNode> list;
  final int index;
  final OutlineNode? parent;

  OutlineNode get node => list[index];
}

class _VisibleRow {
  _VisibleRow({required this.node, required this.depth});

  final OutlineNode node;
  final int depth;
}

/// A basic, client-side (in-memory only) outliner: an infinitely nestable
/// list of text nodes that can be expanded/collapsed, indented/outdented,
/// added to, and deleted. There is no server sync yet — this is a starting
/// point for the mobile client mirroring the web app's tree editor.
class OutlineScreen extends StatefulWidget {
  const OutlineScreen({super.key});

  @override
  State<OutlineScreen> createState() => _OutlineScreenState();
}

class _OutlineScreenState extends State<OutlineScreen> {
  final _idGenerator = OutlineIdGenerator();
  final _controllers = <String, TextEditingController>{};
  final _focusNodes = <String, FocusNode>{};
  late List<OutlineNode> _roots;

  @override
  void initState() {
    super.initState();
    _roots = _seedTree();
  }

  List<OutlineNode> _seedTree() {
    final welcome = OutlineNode(id: _idGenerator.next(), text: 'Welcome to Cascade');
    final firstChild = OutlineNode(id: _idGenerator.next(), text: 'Tap the chevron to expand or collapse a node');
    final secondChild = OutlineNode(id: _idGenerator.next(), text: 'Tap + to add a child, or press enter for a new node below');
    welcome.children = [firstChild, secondChild];

    final second = OutlineNode(id: _idGenerator.next(), text: 'This is a second top-level node');

    return [welcome, second];
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    for (final focusNode in _focusNodes.values) {
      focusNode.dispose();
    }
    super.dispose();
  }

  TextEditingController _controllerFor(OutlineNode node) {
    return _controllers.putIfAbsent(node.id, () => TextEditingController(text: node.text));
  }

  FocusNode _focusNodeFor(String id) {
    return _focusNodes.putIfAbsent(id, FocusNode.new);
  }

  void _disposeSubtreeControllers(OutlineNode node) {
    _controllers.remove(node.id)?.dispose();
    _focusNodes.remove(node.id)?.dispose();
    for (final child in node.children) {
      _disposeSubtreeControllers(child);
    }
  }

  _NodeLocation? _locate(String id, {List<OutlineNode>? nodes, OutlineNode? parent}) {
    final list = nodes ?? _roots;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id == id) {
        return _NodeLocation(list: list, index: i, parent: parent);
      }
      final found = _locate(id, nodes: list[i].children, parent: list[i]);
      if (found != null) return found;
    }
    return null;
  }

  List<_VisibleRow> _flatten() {
    final rows = <_VisibleRow>[];
    void walk(List<OutlineNode> nodes, int depth) {
      for (final node in nodes) {
        rows.add(_VisibleRow(node: node, depth: depth));
        if (node.hasChildren && node.expanded) {
          walk(node.children, depth + 1);
        }
      }
    }

    walk(_roots, 0);
    return rows;
  }

  void _focusNext(String id) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNodeFor(id).requestFocus();
    });
  }

  void _toggleExpanded(String id) {
    final loc = _locate(id);
    if (loc == null) return;
    setState(() => loc.node.expanded = !loc.node.expanded);
  }

  void _updateText(String id, String text) {
    final loc = _locate(id);
    if (loc == null) return;
    loc.node.text = text;
  }

  void _addSiblingAfter(String id) {
    final loc = _locate(id);
    if (loc == null) return;
    final newNode = OutlineNode(id: _idGenerator.next());
    setState(() => loc.list.insert(loc.index + 1, newNode));
    _focusNext(newNode.id);
  }

  void _addChild(String id) {
    final loc = _locate(id);
    if (loc == null) return;
    final newNode = OutlineNode(id: _idGenerator.next());
    setState(() {
      loc.node.children.add(newNode);
      loc.node.expanded = true;
    });
    _focusNext(newNode.id);
  }

  void _addRootNode() {
    final newNode = OutlineNode(id: _idGenerator.next());
    setState(() => _roots.add(newNode));
    _focusNext(newNode.id);
  }

  void _indent(String id) {
    final loc = _locate(id);
    if (loc == null || loc.index == 0) return;
    final previousSibling = loc.list[loc.index - 1];
    setState(() {
      loc.list.removeAt(loc.index);
      previousSibling.children.add(loc.node);
      previousSibling.expanded = true;
    });
    _focusNext(id);
  }

  void _outdent(String id) {
    final loc = _locate(id);
    if (loc == null || loc.parent == null) return;
    final parentLoc = _locate(loc.parent!.id);
    if (parentLoc == null) return;
    setState(() {
      loc.list.removeAt(loc.index);
      parentLoc.list.insert(parentLoc.index + 1, loc.node);
    });
    _focusNext(id);
  }

  void _delete(String id) {
    final loc = _locate(id);
    if (loc == null) return;
    setState(() {
      _disposeSubtreeControllers(loc.node);
      loc.list.removeAt(loc.index);
    });
  }

  @override
  Widget build(BuildContext context) {
    final rows = _flatten();
    return Scaffold(
      appBar: AppBar(title: const Text('Cascade')),
      body: rows.isEmpty
          ? const Center(child: Text('No notes yet — tap + to add one.'))
          : ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: rows.length,
              itemBuilder: (context, index) {
                final row = rows[index];
                final node = row.node;
                return OutlineRow(
                  key: ValueKey(node.id),
                  depth: row.depth,
                  hasChildren: node.hasChildren,
                  expanded: node.expanded,
                  controller: _controllerFor(node),
                  focusNode: _focusNodeFor(node.id),
                  onToggleExpanded: () => _toggleExpanded(node.id),
                  onChanged: (text) => _updateText(node.id, text),
                  onSubmitted: () => _addSiblingAfter(node.id),
                  onIndent: () => _indent(node.id),
                  onOutdent: () => _outdent(node.id),
                  onAddChild: () => _addChild(node.id),
                  onDelete: () => _delete(node.id),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addRootNode,
        tooltip: 'Add node',
        child: const Icon(Icons.add),
      ),
    );
  }
}
