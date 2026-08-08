import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

import '../application/outline_controller.dart';
import '../domain/outline_tree.dart' as tree;
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

  String _titleForCurrentFocus() {
    final focusRootId = widget.focusRootId;
    if (focusRootId == null) return 'Cascade';
    final focusLocation = tree.locateNode(_controller.roots, focusRootId);
    if (focusLocation == null) return 'Focused node';
    final title = focusLocation.node.text.trim();
    return title.isEmpty ? 'Empty node' : title;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = _titleForCurrentFocus();

    return Scaffold(
      body: SafeArea(
        minimum: const EdgeInsets.fromLTRB(10, 10, 10, 8),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _OutlineHeader(
                  title: title,
                  canGoBack: widget.focusRootId != null,
                  onBack: widget.focusRootId == null
                      ? null
                      : () => Navigator.of(context).maybePop(),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListenableBuilder(
                    listenable: _controller,
                    builder: (context, _) {
                      if (_controller.isLoading) {
                        return _StatePanel(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 28,
                                height: 28,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.4,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    theme.colorScheme.primary,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                'Loading your outline…',
                                style: theme.textTheme.titleMedium,
                              ),
                            ],
                          ),
                        );
                      }
                      if (_controller.error != null) {
                        return _StatePanel(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Something went wrong',
                                style: theme.textTheme.titleMedium,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _controller.error.toString(),
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        );
                      }
                      final rows = _controller.visibleRowsForFocusRoot(
                        widget.focusRootId,
                      );
                      if (rows.isEmpty) {
                        return _StatePanel(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                widget.focusRootId == null
                                    ? 'No notes yet'
                                    : 'This node no longer exists',
                                style: theme.textTheme.titleMedium,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                widget.focusRootId == null
                                    ? 'Create your first root node to start outlining.'
                                    : 'Go back to the main outline and pick another branch.',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              if (widget.focusRootId == null) ...[
                                const SizedBox(height: 10),
                                _CascadePillButton(
                                  label: 'New root node',
                                  icon: CupertinoIcons.add,
                                  tooltip: 'Add node',
                                  onPressed: _addRoot,
                                ),
                              ],
                            ],
                          ),
                        );
                      }
                      return Container(
                        decoration: BoxDecoration(
                          color: theme.cardTheme.color,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: theme.colorScheme.outline),
                        ),
                        child: Scrollbar(
                          controller: _scrollController,
                          thumbVisibility: true,
                          child: ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.fromLTRB(6, 6, 6, 72),
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
                                controller: _editing.textControllerFor(
                                  node.id,
                                  initialText: node.text,
                                ),
                                focusNode: _editing.focusNodeFor(node.id),
                                onToggleExpanded: () =>
                                    _controller.toggleExpanded(node.id),
                                onFocusSubtree: () => _focusSubtree(node.id),
                                onChanged: (text) =>
                                    _controller.updateText(node.id, text),
                                onSubmitted: () => _addBelow(node.id),
                                onIndent: () => _indent(node.id),
                                onOutdent: () => _outdent(node.id),
                                onAddInside: () => _addInside(node.id),
                                onAddBelow: () => _addBelow(node.id),
                                onDelete: () => _delete(node.id),
                              );
                            },
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            Positioned(
              right: 0,
              bottom: 4,
              child: _FloatingAddButton(
                tooltip: 'Add node',
                onPressed: _addRoot,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OutlineHeader extends StatelessWidget {
  const _OutlineHeader({
    required this.title,
    this.canGoBack = false,
    this.onBack,
  });

  final String title;
  final bool canGoBack;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: theme.cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Row(
        children: [
          if (canGoBack) ...[
            _CascadeIconButton(
              icon: CupertinoIcons.back,
              tooltip: 'Back',
              onPressed: onBack,
              size: 28,
            ),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Text(
              key: const Key('outline-header-title'),
              title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatePanel extends StatelessWidget {
  const _StatePanel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardTheme.color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Center(child: child),
    );
  }
}

class _CascadePillButton extends StatelessWidget {
  const _CascadePillButton({
    required this.label,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onPressed,
          child: Ink(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 16, color: theme.colorScheme.onPrimary),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: theme.colorScheme.onPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CascadeIconButton extends StatelessWidget {
  const _CascadeIconButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.size = 42,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onPressed,
          child: Ink(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: theme.colorScheme.outline),
            ),
            child: Icon(
              icon,
              size: size * 0.42,
              color: theme.colorScheme.onSurface,
            ),
          ),
        ),
      ),
    );
  }
}

class _FloatingAddButton extends StatelessWidget {
  const _FloatingAddButton({required this.tooltip, required this.onPressed});

  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onPressed,
          child: Ink(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: BorderRadius.circular(999),
              boxShadow: [
                BoxShadow(
                  color: theme.colorScheme.primary.withOpacity(0.28),
                  blurRadius: 12,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Icon(
              CupertinoIcons.add,
              size: 18,
              color: theme.colorScheme.onPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
