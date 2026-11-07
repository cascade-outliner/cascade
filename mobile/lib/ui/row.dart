import 'package:flutter/material.dart';

import '../data/daily.dart';
import '../data/node.dart';
import '../data/search.dart';
import 'slash_commands.dart';
import 'store_scope.dart';
import 'theme.dart';
import 'widgets.dart';

const indentWidth = 22.0;

enum DropZone { before, after, child }

class OutlineRow extends StatefulWidget {
  const OutlineRow({
    super.key,
    required this.row,
    required this.onZoomTo,
    required this.onMenu,
    required this.editing,
    this.onSplit,
    this.copyLink,
    this.highlight,
    this.active = false,
  });

  final OutlineRowData row;
  final void Function(String? id) onZoomTo;
  final void Function(Node node, int childCount) onMenu;
  final ValueNotifier<String?> editing;
  final void Function(String id)? onSplit;
  final void Function(String id)? copyLink;
  final List<String>? highlight;
  final bool active;

  @override
  State<OutlineRow> createState() => _OutlineRowState();
}

class _OutlineRowState extends State<OutlineRow> {
  late final TextEditingController controller = TextEditingController(text: widget.row.node.text);
  final focus = FocusNode();
  String? slashQuery;
  DropZone? zone;

  Node get node => widget.row.node;

  @override
  void initState() {
    super.initState();
    focus.addListener(_onFocus);
    widget.editing.addListener(_onEditing);
    if (widget.editing.value == node.id) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) focus.requestFocus();
      });
    }
  }

  @override
  void didUpdateWidget(OutlineRow old) {
    super.didUpdateWidget(old);
    if (old.editing != widget.editing) {
      old.editing.removeListener(_onEditing);
      widget.editing.addListener(_onEditing);
    }
    if (!focus.hasFocus && controller.text != node.text) controller.text = node.text;
  }

  @override
  void dispose() {
    widget.editing.removeListener(_onEditing);
    if (widget.editing.value == node.id) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (widget.editing.value == node.id) widget.editing.value = null;
      });
    }
    focus.dispose();
    controller.dispose();
    super.dispose();
  }

  void _onEditing() {
    if (!mounted) return;
    final editing = widget.editing.value == node.id;
    if (editing && !focus.hasFocus) {
      setState(() {});
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) focus.requestFocus();
      });
    } else if (!editing && focus.hasFocus) {
      focus.unfocus();
    }
  }

  void _onFocus() {
    if (focus.hasFocus) {
      widget.editing.value = node.id;
    } else {
      if (widget.editing.value == node.id) widget.editing.value = null;
      if (mounted) setState(() => slashQuery = null);
    }
  }

  void _startEditing() {
    controller.text = node.text;
    controller.selection = TextSelection.collapsed(offset: node.text.length);
    widget.editing.value = node.id;
  }

  SlashContext _context() {
    final store = StoreScope.read(context);
    final current = store.get(node.id) ?? node;
    return SlashContext(
      store: store,
      node: current,
      childCount: store.childrenOf(node.id).length,
      zoomTo: widget.onZoomTo,
      split: widget.onSplit,
      copyLink: widget.copyLink,
    );
  }

  void _onChanged(String text) {
    StoreScope.read(context).setText(node.id, text);
    final available = slashCommands.where((s) => s.available?.call(_context()) ?? true);
    setState(() => slashQuery = slashQueryBefore(text, controller.selection.baseOffset, available));
  }

  void _runSlash(SlashCommand command) {
    final (text, caret) = removeSlashQuery(controller.text, controller.selection.baseOffset);
    controller.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: caret),
    );
    StoreScope.read(context).setText(node.id, text);
    setState(() => slashQuery = null);
    command.run(_context());
  }

  DropZone _zoneFor(Offset global) {
    final box = context.findRenderObject() as RenderBox?;
    if (box == null) return DropZone.after;
    final local = box.globalToLocal(global);
    if (local.dy < box.size.height / 2) return DropZone.before;
    final childX = (widget.row.depth + 1) * indentWidth + 40;
    return local.dx > childX ? DropZone.child : DropZone.after;
  }

  void _accept(String draggedId) {
    final store = StoreScope.read(context);
    final target = store.get(node.id);
    final z = zone ?? DropZone.after;
    setState(() => zone = null);
    if (target == null || draggedId == target.id || store.isDescendant(target.id, draggedId)) return;
    if (z == DropZone.child) {
      store.setCollapsed(target.id, false);
      store.move(draggedId, target.id, 0);
      return;
    }
    final siblings = store.childrenOf(target.parentId).where((n) => n.id != draggedId).toList();
    final at = siblings.indexOf(target);
    store.move(draggedId, target.parentId, z == DropZone.before ? at : at + 1);
  }

  @override
  Widget build(BuildContext context) {
    final store = StoreScope.of(context);
    final c = context.colors;
    final childCount = widget.row.childCount;
    final locked = store.isLocked(node.id);
    final editing = widget.editing.value == node.id && !locked;
    final done = node.task?.done ?? false;
    final textStyle = TextStyle(
      fontSize: 16,
      height: 1.4,
      color: done ? c.muted : c.ink,
      decoration: done ? TextDecoration.lineThrough : null,
      decorationColor: c.muted,
    );
    final label = relativeDay(node.id);

    Widget content;
    if (editing) {
      content = TextField(
        key: Key('row-input-${node.id}'),
        controller: controller,
        focusNode: focus,
        style: textStyle,
        maxLines: null,
        keyboardType: TextInputType.text,
        textInputAction: TextInputAction.done,
        onChanged: _onChanged,
        onSubmitted: (_) {
          final items = slashQuery == null
              ? const <SlashCommand>[]
              : filterSlash(slashCommands.where((s) => s.available?.call(_context()) ?? true), slashQuery!);
          if (items.isNotEmpty) {
            _runSlash(items.first);
            focus.requestFocus();
          } else {
            focus.unfocus();
          }
        },
        decoration: const InputDecoration(
          isCollapsed: true,
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(vertical: 6),
        ),
      );
    } else {
      final text = label ?? node.text;
      content = GestureDetector(
        key: Key('row-text-${node.id}'),
        behavior: HitTestBehavior.opaque,
        onTap: locked ? () => widget.onZoomTo(node.id) : _startEditing,
        onLongPress: () => widget.onMenu(node, childCount),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: widget.highlight != null
              ? HighlightedText(text: node.text, ranges: phraseRanges(node.text, widget.highlight!), style: textStyle)
              : Text(text.isEmpty ? ' ' : text, style: textStyle.copyWith(fontWeight: locked ? FontWeight.w500 : null)),
        ),
      );
    }

    final line = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: widget.row.depth * indentWidth),
        Chevron(
          key: Key('chevron-${node.id}'),
          open: !node.collapsed,
          hidden: childCount == 0,
          onTap: () => store.setCollapsed(node.id, !node.collapsed),
        ),
        LongPressDraggable<String>(
          data: node.id,
          dragAnchorStrategy: pointerDragAnchorStrategy,
          maxSimultaneousDrags: locked ? 0 : 1,
          feedback: _DragGhost(text: label ?? node.text),
          childWhenDragging: Opacity(opacity: 0.3, child: Bullet(collapsed: node.collapsed && childCount > 0)),
          child: Bullet(
            key: Key('bullet-${node.id}'),
            collapsed: node.collapsed && childCount > 0,
            onTap: () => widget.onZoomTo(node.id),
          ),
        ),
        if (node.task != null)
          TaskMarker(
            key: Key('task-${node.id}'),
            done: done,
            onTap: () => store.setTask(node.id, Task(done: !done)),
          ),
        Expanded(child: content),
        if (node.due != null) DuePill(due: node.due!),
      ],
    );

    final indicatorLeft = (widget.row.depth + (zone == DropZone.child ? 1 : 0)) * indentWidth + 22;
    final menuItems = slashQuery == null
        ? const <SlashCommand>[]
        : filterSlash(slashCommands.where((s) => s.available?.call(_context()) ?? true), slashQuery!);

    return DragTarget<String>(
      onWillAcceptWithDetails: (details) => details.data != node.id && !store.isDescendant(node.id, details.data),
      onMove: (details) {
        final z = _zoneFor(details.offset);
        if (z != zone) setState(() => zone = z);
      },
      onLeave: (_) => setState(() => zone = null),
      onAcceptWithDetails: (details) => _accept(details.data),
      builder: (context, candidates, rejected) {
        return Column(
          key: Key('row-${node.id}'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 120),
                  padding: const EdgeInsets.only(right: 6),
                  decoration: BoxDecoration(
                    color: widget.active || widget.highlight != null || editing ? c.inkSubtle : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: line,
                ),
                if (zone != null && candidates.isNotEmpty)
                  Positioned(
                    left: indicatorLeft,
                    right: 0,
                    top: zone == DropZone.before ? 0 : null,
                    bottom: zone == DropZone.before ? null : 0,
                    child: Container(height: 2, color: c.info),
                  ),
              ],
            ),
            if (editing && slashQuery != null)
              TextFieldTapRegion(
                child: Container(
                  margin: EdgeInsets.only(left: widget.row.depth * indentWidth + 50, top: 4, bottom: 4),
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: c.border),
                    boxShadow: const [BoxShadow(color: Color(0x33192036), blurRadius: 20, offset: Offset(0, 8))],
                  ),
                  child: SlashMenu(items: menuItems, onSelect: _runSlash, maxHeight: 220),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _DragGhost extends StatelessWidget {
  const _DragGhost({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Transform.translate(
      offset: const Offset(-14, -18),
      child: Material(
        color: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 260),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(12),
            boxShadow: const [BoxShadow(color: Color(0x40192036), blurRadius: 24, offset: Offset(0, 10))],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(shape: BoxShape.circle, color: c.ink),
              ),
              const SizedBox(width: 10),
              Flexible(
                child: Text(
                  text.isEmpty ? 'Untitled' : text,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: c.ink),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
