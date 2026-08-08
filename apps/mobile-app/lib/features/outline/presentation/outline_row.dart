import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../theme/cascade_theme.dart';

/// A single, presentational row of the outliner: a chevron to expand or
/// collapse children, a subtree-focus circle, an editable text field for the
/// node's content, and per-row actions (indent, outdent, add inside, add
/// below, delete).
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
    required this.onFocusSubtree,
    required this.onChanged,
    required this.onSubmitted,
    required this.onIndent,
    required this.onOutdent,
    required this.onAddInside,
    required this.onAddBelow,
    required this.onDelete,
  });

  final int depth;
  final bool hasChildren;
  final bool expanded;
  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback onToggleExpanded;
  final VoidCallback onFocusSubtree;
  final ValueChanged<String> onChanged;
  final VoidCallback onSubmitted;
  final VoidCallback onIndent;
  final VoidCallback onOutdent;
  final VoidCallback onAddInside;
  final VoidCallback onAddBelow;
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
              child: IconButton(
                padding: EdgeInsets.zero,
                constraints: _iconConstraints,
                iconSize: 18,
                icon: const Icon(Icons.circle_outlined),
                tooltip: 'Focus subtree',
                onPressed: onFocusSubtree,
              ),
            ),
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
                  : const Center(child: Icon(Icons.remove, size: 14, color: CascadeColors.muted)),
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
            Builder(
              builder: (buttonContext) {
                return IconButton(
                  key: const Key('outline-row-actions'),
                  padding: EdgeInsets.zero,
                  constraints: _iconConstraints,
                  iconSize: 18,
                  tooltip: 'More actions',
                  icon: const Icon(Icons.more_vert),
                  onPressed: () async {
                    final button = buttonContext.findRenderObject() as RenderBox;
                    final overlay = Overlay.of(buttonContext).context.findRenderObject() as RenderBox;
                    final position = RelativeRect.fromRect(
                      Rect.fromPoints(
                        button.localToGlobal(Offset.zero, ancestor: overlay),
                        button.localToGlobal(button.size.bottomRight(Offset.zero), ancestor: overlay),
                      ),
                      Offset.zero & overlay.size,
                    );
                    final action = await showMenu<OutlineRowAction>(
                      context: buttonContext,
                      position: position,
                      items: const [
                        PopupMenuItem(
                          key: Key('outline-row-add-inside'),
                          value: OutlineRowAction.addInside,
                          child: Text('Add inside'),
                        ),
                        PopupMenuItem(
                          key: Key('outline-row-add-below'),
                          value: OutlineRowAction.addBelow,
                          child: Text('Add below'),
                        ),
                        PopupMenuItem(
                          key: Key('outline-row-delete'),
                          value: OutlineRowAction.delete,
                          child: Text('Delete'),
                        ),
                      ],
                    );
                    if (action == null) return;
                    handleOutlineRowAction(
                      action,
                      onAddInside: onAddInside,
                      onAddBelow: onAddBelow,
                      onDelete: onDelete,
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

enum OutlineRowAction { addInside, addBelow, delete }

void handleOutlineRowAction(
  OutlineRowAction action, {
  required VoidCallback onAddInside,
  required VoidCallback onAddBelow,
  required VoidCallback onDelete,
}) {
  if (action == OutlineRowAction.addInside) {
    onAddInside();
  } else if (action == OutlineRowAction.addBelow) {
    onAddBelow();
  } else {
    onDelete();
  }
}
