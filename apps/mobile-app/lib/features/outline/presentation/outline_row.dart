import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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

  static const double height = 46;
  static const double _indentWidth = 16;
  static const double _iconSlot = 26;
  static const _iconConstraints = BoxConstraints.tightFor(
    width: _iconSlot,
    height: _iconSlot,
  );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      height: height,
      child: Padding(
        padding: EdgeInsets.only(left: depth * _indentWidth),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              _CascadeRoundIconButton(
                tooltip: 'Focus subtree',
                icon: CupertinoIcons.circle,
                onPressed: onFocusSubtree,
              ),
              const SizedBox(width: 4),
              hasChildren
                  ? _CascadeRoundIconButton(
                      tooltip: expanded ? 'Collapse' : 'Expand',
                      icon: expanded
                          ? CupertinoIcons.chevron_down
                          : CupertinoIcons.chevron_right,
                      onPressed: onToggleExpanded,
                    )
                  : SizedBox(
                      width: _iconSlot,
                      height: _iconSlot,
                      child: Center(
                        child: Container(
                          width: 8,
                          height: 2,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.onSurfaceVariant
                                .withOpacity(0.6),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                    ),
              const SizedBox(width: 6),
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
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      disabledBorder: InputBorder.none,
                      isCollapsed: true,
                      contentPadding: EdgeInsets.symmetric(vertical: 2),
                      hintText: 'Empty node',
                      fillColor: Colors.transparent,
                      filled: false,
                    ),
                    style: theme.textTheme.bodyMedium,
                    onChanged: onChanged,
                    onSubmitted: (_) => onSubmitted(),
                    textInputAction: TextInputAction.done,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Builder(
                builder: (sheetContext) {
                  return _CascadeRoundIconButton(
                    key: const Key('outline-row-actions'),
                    tooltip: 'More actions',
                    icon: CupertinoIcons.ellipsis,
                    onPressed: () async {
                      final action =
                          await showModalBottomSheet<OutlineRowAction>(
                            context: sheetContext,
                            useSafeArea: true,
                            isScrollControlled: true,
                            builder: (context) => _OutlineRowActionSheet(
                              onAction: (action) =>
                                  Navigator.of(context).pop(action),
                            ),
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
      ),
    );
  }
}

class _CascadeRoundIconButton extends StatelessWidget {
  const _CascadeRoundIconButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

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
          key: key,
          borderRadius: BorderRadius.circular(999),
          onTap: onPressed,
          child: SizedBox(
            width: OutlineRow._iconSlot,
            height: OutlineRow._iconSlot,
            child: Icon(
              icon,
              size: 13,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }
}

class _OutlineRowActionSheet extends StatelessWidget {
  const _OutlineRowActionSheet({required this.onAction});

  final ValueChanged<OutlineRowAction> onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
      child: Container(
        decoration: BoxDecoration(
          color: theme.scaffoldBackgroundColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: theme.colorScheme.outline),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 32,
                    height: 3,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.onSurfaceVariant.withOpacity(
                        0.35,
                      ),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text('Node actions', style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                _OutlineRowActionButton(
                  key: const Key('outline-row-add-inside'),
                  label: 'Add inside',
                  icon: CupertinoIcons.add_circled,
                  onPressed: () => onAction(OutlineRowAction.addInside),
                ),
                const SizedBox(height: 6),
                _OutlineRowActionButton(
                  key: const Key('outline-row-add-below'),
                  label: 'Add below',
                  icon: CupertinoIcons.arrow_down_circle,
                  onPressed: () => onAction(OutlineRowAction.addBelow),
                ),
                const SizedBox(height: 6),
                _OutlineRowActionButton(
                  key: const Key('outline-row-delete'),
                  label: 'Delete',
                  icon: CupertinoIcons.delete,
                  destructive: true,
                  onPressed: () => onAction(OutlineRowAction.delete),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OutlineRowActionButton extends StatelessWidget {
  const _OutlineRowActionButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.destructive = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final foreground = destructive
        ? theme.colorScheme.error
        : theme.colorScheme.onSurface;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        key: key,
        borderRadius: BorderRadius.circular(14),
        onTap: onPressed,
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: theme.colorScheme.outline),
          ),
          child: Row(
            children: [
              Icon(icon, size: 16, color: foreground),
              const SizedBox(width: 10),
              Text(
                label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: foreground,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
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
