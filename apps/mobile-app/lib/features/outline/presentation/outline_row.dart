import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../theme/cascade_theme.dart';

/// A single, presentational row of the outliner: a chevron to expand or
/// collapse children, a bullet, an editable text field for the node's
/// content, and per-row actions (indent, outdent, add child, delete).
///
/// Purely a function of its parameters — it knows nothing about
/// `OutlineController` or how the tree is stored, so it's reusable as-is
/// however the tree ends up being edited (e.g. a future drag-and-drop
/// reorder) as long as the caller wires up the callbacks.
///
/// Every row is exactly [height] tall (icon buttons and the text field are
/// explicitly constrained below that) so the list can use a fixed
/// `itemExtent` — see `OutlineScreen` — which is what lets Flutter jump to
/// any scroll offset in a tree of thousands of nodes without laying out
/// everything in between first.
class OutlineRow extends StatelessWidget {
  const OutlineRow({
    super.key,
    required this.depth,
    required this.hasChildren,
    required this.expanded,
    required this.controller,
    required this.focusNode,
    required this.onToggleExpanded,
    required this.onChanged,
    required this.onSubmitted,
    required this.onIndent,
    required this.onOutdent,
    required this.onAddChild,
    required this.onDelete,
  });

  final int depth;
  final bool hasChildren;
  final bool expanded;
  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback onToggleExpanded;
  final ValueChanged<String> onChanged;
  final VoidCallback onSubmitted;
  final VoidCallback onIndent;
  final VoidCallback onOutdent;
  final VoidCallback onAddChild;
  final VoidCallback onDelete;

  static const double height = 44;
  static const double _indentWidth = 24;
  static const double _iconSlot = 32;
  static const _iconConstraints = BoxConstraints.tightFor(width: _iconSlot, height: _iconSlot);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: Padding(
        padding: EdgeInsets.only(left: depth * _indentWidth),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SizedBox(
              width: _iconSlot,
              height: _iconSlot,
              child: hasChildren
                  ? IconButton(
                      padding: EdgeInsets.zero,
                      constraints: _iconConstraints,
                      iconSize: 18,
                      icon: Icon(expanded ? Icons.expand_more : Icons.chevron_right),
                      tooltip: expanded ? 'Collapse' : 'Expand',
                      onPressed: onToggleExpanded,
                    )
                  : const Center(
                      child: Icon(Icons.circle, size: 6, color: CascadeColors.muted),
                    ),
            ),
            Expanded(
              child: Focus(
                onKeyEvent: (node, event) {
                  if (event is! KeyDownEvent) return KeyEventResult.ignored;
                  if (event.logicalKey == LogicalKeyboardKey.tab) {
                    if (HardwareKeyboard.instance.isShiftPressed) {
                      onOutdent();
                    } else {
                      onIndent();
                    }
                    return KeyEventResult.handled;
                  }
                  return KeyEventResult.ignored;
                },
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    isCollapsed: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 4),
                    hintText: 'Empty node',
                  ),
                  onChanged: onChanged,
                  onSubmitted: (_) => onSubmitted(),
                  textInputAction: TextInputAction.done,
                ),
              ),
            ),
            IconButton(
              padding: EdgeInsets.zero,
              constraints: _iconConstraints,
              iconSize: 18,
              tooltip: 'Add child',
              icon: const Icon(Icons.add),
              onPressed: onAddChild,
            ),
            IconButton(
              padding: EdgeInsets.zero,
              constraints: _iconConstraints,
              iconSize: 18,
              tooltip: 'Delete',
              icon: const Icon(Icons.delete_outline),
              onPressed: onDelete,
            ),
          ],
        ),
      ),
    );
  }
}
