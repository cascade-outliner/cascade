import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/daily.dart';
import '../data/node.dart';
import '../data/store.dart';
import 'calendar.dart';
import 'theme.dart';

void copyNodeLink(BuildContext context, String id) {
  Clipboard.setData(ClipboardData(text: 'cascade://node/$id'));
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(const SnackBar(content: Text('Link copied'), duration: Duration(seconds: 2)));
}

Future<void> showNodeMenu(
  BuildContext context, {
  required OutlineStore store,
  required Node node,
  required int childCount,
  required void Function(String? id) onZoomTo,
  void Function(String id)? onSplit,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheet) => _NodeMenu(
      store: store,
      node: node,
      childCount: childCount,
      onZoomTo: onZoomTo,
      onSplit: onSplit,
      parent: context,
    ),
  );
}

class _NodeMenu extends StatelessWidget {
  const _NodeMenu({
    required this.store,
    required this.node,
    required this.childCount,
    required this.onZoomTo,
    required this.onSplit,
    required this.parent,
  });
  final OutlineStore store;
  final Node node;
  final int childCount;
  final void Function(String? id) onZoomTo;
  final void Function(String id)? onSplit;
  final BuildContext parent;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final locked = store.isLocked(node.id);
    void close(VoidCallback action) {
      Navigator.pop(context);
      action();
    }

    Widget item(String key, IconData icon, String label, VoidCallback? onTap, {bool danger = false}) {
      final color = danger ? c.danger : null;
      return ListTile(
        key: Key('menu-$key'),
        enabled: onTap != null,
        dense: true,
        leading: Icon(icon, size: 20, color: onTap == null ? null : color),
        title: Text(label, style: TextStyle(fontSize: 15, color: onTap == null ? null : color)),
        onTap: onTap == null ? null : () => close(onTap),
      );
    }

    Widget chip(String key, String label, VoidCallback? onTap, {bool selected = false, IconData? icon}) => Padding(
      padding: const EdgeInsets.only(right: 8, bottom: 8),
      child: ChoiceChip(
        key: Key('menu-$key'),
        label: Text(label),
        avatar: icon == null ? null : Icon(icon, size: 16, color: selected ? c.onPrimary : c.ink),
        selected: selected,
        showCheckmark: false,
        onSelected: onTap == null ? null : (_) => close(onTap),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        side: BorderSide(color: c.border),
        selectedColor: c.primary,
        labelStyle: TextStyle(color: selected ? c.onPrimary : c.ink),
      ),
    );

    Widget heading(String text) => Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(fontSize: 11, letterSpacing: 1, fontWeight: FontWeight.w500, color: c.muted),
      ),
    );

    final title = relativeDay(node.id) ?? (node.text.isEmpty ? 'Untitled' : node.text);
    final today = isoDay(DateTime.now());

    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                child: Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 17),
                ),
              ),
              heading('Convert into'),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Wrap(
                  children: [
                    chip(
                      'text',
                      'Text',
                      locked ? null : () => store.setTask(node.id, null),
                      selected: node.task == null,
                      icon: Icons.circle,
                    ),
                    chip(
                      'task',
                      'Task',
                      locked ? null : () => store.setTask(node.id, const Task(done: false)),
                      selected: node.task != null,
                      icon: Icons.radio_button_unchecked,
                    ),
                  ],
                ),
              ),
              heading('Due date'),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Wrap(
                  children: [
                    chip(
                      'due-today',
                      'Today',
                      locked ? null : () => store.setDue(node.id, today),
                      selected: node.due == today,
                    ),
                    chip(
                      'due-tomorrow',
                      'Tomorrow',
                      locked ? null : () => store.setDue(node.id, isoDay(shiftDay(null, 1))),
                      selected: node.due == isoDay(shiftDay(null, 1)),
                    ),
                    chip(
                      'due-next-week',
                      'Next week',
                      locked ? null : () => store.setDue(node.id, isoDay(shiftDay(null, 7))),
                      selected: node.due == isoDay(shiftDay(null, 7)),
                    ),
                    chip(
                      'due-pick',
                      'Pick a day…',
                      locked
                          ? null
                          : () async {
                              final date = await pickDay(
                                parent,
                                selected: node.due == null ? null : fromIsoDay(node.due!),
                                title: 'Due date',
                              );
                              if (date != null) store.setDue(node.id, isoDay(date));
                            },
                      icon: Icons.calendar_month_outlined,
                    ),
                    chip(
                      'due-remove',
                      'Remove',
                      locked || node.due == null ? null : () => store.setDue(node.id, null),
                      icon: Icons.event_busy_outlined,
                    ),
                  ],
                ),
              ),
              const Divider(height: 16),
              item('zoom', Icons.zoom_in, 'Zoom in', () => onZoomTo(node.id)),
              item('duplicate', Icons.copy_outlined, 'Duplicate', locked ? null : () => store.duplicate(node.id)),
              item(
                'duplicate-children',
                Icons.copy_all_outlined,
                'Duplicate with children',
                locked || childCount == 0 ? null : () => store.duplicateWithChildren(node.id),
              ),
              item(
                'indent',
                Icons.format_indent_increase,
                'Indent',
                store.canIndent(node.id) ? () => store.indent(node.id) : null,
              ),
              item(
                'outdent',
                Icons.format_indent_decrease,
                'Outdent',
                store.canOutdent(node.id) ? () => store.outdent(node.id) : null,
              ),
              const Divider(height: 16),
              item(
                'split',
                Icons.auto_awesome_outlined,
                'Break into steps',
                onSplit == null || locked || node.text.trim().isEmpty ? null : () => onSplit!(node.id),
              ),
              item('copy-link', Icons.link, 'Copy link', () => copyNodeLink(parent, node.id)),
              const Divider(height: 16),
              item('delete', Icons.delete_outline, 'Delete', () => store.remove(node.id), danger: true),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
