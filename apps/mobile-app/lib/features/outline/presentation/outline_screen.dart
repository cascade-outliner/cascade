import 'package:flutter/material.dart';

import '../application/outline_controller.dart';
import 'outline_row.dart';
import 'outline_row_editing_controllers.dart';

/// The outliner screen. Owns an `OutlineController` (the tree's state and
/// edit operations) and an `OutlineRowEditingControllers` (ephemeral,
/// per-row text/focus state) and wires the two together — the widget layer
/// itself holds no tree logic.
class OutlineScreen extends StatefulWidget {
  const OutlineScreen({super.key, required this.controller, this.focusRootId});

  final OutlineController controller;
  final String? focusRootId;

  @override
  State<OutlineScreen> createState() => _OutlineScreenState();
}

class _OutlineScreenState extends State<OutlineScreen> {
  final _editing = OutlineRowEditingControllers();
  final _scrollController = ScrollController();

  OutlineController get _controller => widget.controller;

  @override
  void initState() {
    super.initState();
    _controller.load();
  }

  @override
  void dispose() {
    _editing.disposeAll();
    _scrollController.dispose();
    super.dispose();
  }

  void _addBelow(String id) {
    final newId = _controller.addSiblingAfter(id);
    _editing.requestFocus(newId);
  }

  void _addInside(String id) {
    final newId = _controller.addChild(id);
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

  void _focusSubtree(String id) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => OutlineScreen(controller: _controller, focusRootId: id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.focusRootId == null ? 'Cascade' : 'Focused node')),
      body: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          if (_controller.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (_controller.error != null) {
            return Center(child: Text('Something went wrong: ${_controller.error}'));
          }
          final rows = _controller.visibleRowsForFocusRoot(widget.focusRootId);
          if (rows.isEmpty) {
            return Center(
              child: Text(
                widget.focusRootId == null ? 'No notes yet — tap + to add one.' : 'This node no longer exists.',
              ),
            );
          }
          return Scrollbar(
            controller: _scrollController,
            thumbVisibility: true,
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(vertical: 8),
              // A fixed extent (every OutlineRow is exactly this tall — see
              // its doc comment) lets Flutter compute scroll position and
              // the scrollbar thumb size in O(1) instead of laying out
              // every row between here and the target offset. Without it,
              // flinging to the bottom of a tree with thousands of nodes
              // gets progressively more expensive the further it scrolls.
              itemExtent: OutlineRow.height,
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
                  onFocusSubtree: () => _focusSubtree(node.id),
                  onChanged: (text) => _controller.updateText(node.id, text),
                  onSubmitted: () => _addBelow(node.id),
                  onIndent: () => _indent(node.id),
                  onOutdent: () => _outdent(node.id),
                  onAddInside: () => _addInside(node.id),
                  onAddBelow: () => _addBelow(node.id),
                  onDelete: () => _delete(node.id),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(onPressed: _addRoot, tooltip: 'Add node', child: const Icon(Icons.add)),
    );
  }
}
