import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A single, presentational row of the outliner: a chevron to expand or
/// collapse children, a bullet, an editable text field for the node's
/// content, and per-row actions (indent, outdent, add child, delete).
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

  static const double _indentWidth = 24;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: depth * _indentWidth),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 28,
            height: 28,
            child: hasChildren
                ? IconButton(
                    padding: EdgeInsets.zero,
                    iconSize: 18,
                    icon: Icon(expanded ? Icons.expand_more : Icons.chevron_right),
                    tooltip: expanded ? 'Collapse' : 'Expand',
                    onPressed: onToggleExpanded,
                  )
                : const Center(
                    child: Icon(Icons.circle, size: 6, color: Colors.black45),
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
                decoration: const InputDecoration(border: InputBorder.none, isDense: true, hintText: 'Empty node'),
                onChanged: onChanged,
                onSubmitted: (_) => onSubmitted(),
                textInputAction: TextInputAction.done,
              ),
            ),
          ),
          IconButton(
            padding: EdgeInsets.zero,
            iconSize: 18,
            tooltip: 'Add child',
            icon: const Icon(Icons.add),
            onPressed: onAddChild,
          ),
          IconButton(
            padding: EdgeInsets.zero,
            iconSize: 18,
            tooltip: 'Delete',
            icon: const Icon(Icons.delete_outline),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}
