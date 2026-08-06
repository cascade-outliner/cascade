import 'package:flutter/material.dart';

import '../application/outline_controller.dart';
import 'outline_row.dart';
import 'outline_row_editing_controllers.dart';

/// The outliner screen. Owns an `OutlineController` (the tree's state and
/// edit operations) and an `OutlineRowEditingControllers` (ephemeral,
/// per-row text/focus state) and wires the two together — the widget layer
/// itself holds no tree logic.
class OutlineScreen extends StatefulWidget {
  const OutlineScreen({super.key, required this.controller});

  final OutlineController controller;

  @override
  State<OutlineScreen> createState() => _OutlineScreenState();
}

class _OutlineScreenState extends State<OutlineScreen> {
  final _editing = OutlineRowEditingControllers();

  OutlineController get _controller => widget.controller;

  @override
  void initState() {
    super.initState();
    _controller.load();
  }

  @override
  void dispose() {
    _editing.disposeAll();
    super.dispose();
  }

  void _addChild(String id) {
    final newId = _controller.addChild(id);
    _editing.requestFocus(newId);
  }

  void _addSiblingAfter(String id) {
    final newId = _controller.addSiblingAfter(id);
    _editing.requestFocus(newId);
  }

  void _addRoot() {
    final newId = _controller.addRoot();
    _editing.requestFocus(newId);
  }

  void _indent(String id) {
    _controller.indent(id);
    _editing.requestFocus(id);
  }

  void _outdent(String id) {
    _controller.outdent(id);
    _editing.requestFocus(id);
  }

  void _delete(String id) {
    final removedIds = _controller.delete(id);
    _editing.disposeFor(removedIds);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cascade')),
      body: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          if (_controller.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (_controller.error != null) {
            return Center(child: Text('Something went wrong: ${_controller.error}'));
          }
          final rows = _controller.visibleRows;
          if (rows.isEmpty) {
            return const Center(child: Text('No notes yet — tap + to add one.'));
          }
          return ListView.builder(
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
                controller: _editing.textControllerFor(node.id, initialText: node.text),
                focusNode: _editing.focusNodeFor(node.id),
                onToggleExpanded: () => _controller.toggleExpanded(node.id),
                onChanged: (text) => _controller.updateText(node.id, text),
                onSubmitted: () => _addSiblingAfter(node.id),
                onIndent: () => _indent(node.id),
                onOutdent: () => _outdent(node.id),
                onAddChild: () => _addChild(node.id),
                onDelete: () => _delete(node.id),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(onPressed: _addRoot, tooltip: 'Add node', child: const Icon(Icons.add)),
    );
  }
}
