import 'package:flutter/material.dart';

import '../data/daily.dart';
import '../data/node.dart';
import '../data/search.dart';
import '../data/store.dart';

class SlashContext {
  const SlashContext({
    required this.store,
    required this.node,
    required this.childCount,
    required this.zoomTo,
    this.split,
    this.copyLink,
  });
  final OutlineStore store;
  final Node node;
  final int childCount;
  final void Function(String? id) zoomTo;
  final void Function(String id)? split;
  final void Function(String id)? copyLink;
}

class SlashCommand {
  const SlashCommand({
    required this.id,
    required this.group,
    required this.label,
    required this.icon,
    required this.run,
    this.keywords = const [],
    this.description,
    this.available,
    this.capture = false,
    this.danger = false,
  });
  final String id;
  final String group;
  final String label;
  final IconData icon;
  final List<String> keywords;
  final String? description;
  final bool Function(SlashContext)? available;
  final void Function(SlashContext) run;
  final bool capture;
  final bool danger;
}

final slashCommands = <SlashCommand>[
  SlashCommand(
    id: 'turn-into-task',
    capture: true,
    group: 'Convert',
    label: 'Turn into task',
    keywords: ['todo', 'checkbox'],
    icon: Icons.radio_button_unchecked,
    available: (c) => c.node.task == null,
    run: (c) => c.store.setTask(c.node.id, const Task(done: false)),
  ),
  SlashCommand(
    id: 'turn-into-text',
    group: 'Convert',
    label: 'Turn into text',
    keywords: ['plain', 'note'],
    icon: Icons.circle,
    available: (c) => c.node.task != null,
    run: (c) => c.store.setTask(c.node.id, null),
  ),
  SlashCommand(
    id: 'complete-task',
    group: 'Convert',
    label: 'Complete task',
    keywords: ['done', 'finish', 'check'],
    icon: Icons.check_circle,
    available: (c) => c.node.task != null && !c.node.task!.done,
    run: (c) => c.store.setTask(c.node.id, const Task(done: true)),
  ),
  SlashCommand(
    id: 'reopen-task',
    group: 'Convert',
    label: 'Reopen task',
    keywords: ['undone', 'uncheck'],
    icon: Icons.radio_button_unchecked,
    available: (c) => c.node.task?.done ?? false,
    run: (c) => c.store.setTask(c.node.id, const Task(done: false)),
  ),
  SlashCommand(
    id: 'due-today',
    capture: true,
    group: 'Due date',
    label: 'Due today',
    keywords: ['date', 'deadline'],
    icon: Icons.calendar_today_outlined,
    run: (c) => c.store.setDue(c.node.id, isoDay(DateTime.now())),
  ),
  SlashCommand(
    id: 'due-tomorrow',
    capture: true,
    group: 'Due date',
    label: 'Due tomorrow',
    keywords: ['date', 'deadline'],
    icon: Icons.calendar_today_outlined,
    run: (c) => c.store.setDue(c.node.id, isoDay(shiftDay(null, 1))),
  ),
  SlashCommand(
    id: 'due-next-week',
    capture: true,
    group: 'Due date',
    label: 'Due next week',
    keywords: ['date', 'deadline'],
    icon: Icons.calendar_today_outlined,
    run: (c) => c.store.setDue(c.node.id, isoDay(shiftDay(null, 7))),
  ),
  SlashCommand(
    id: 'remove-due',
    group: 'Due date',
    label: 'Remove due date',
    keywords: ['clear', 'unschedule'],
    icon: Icons.event_busy_outlined,
    available: (c) => c.node.due != null,
    run: (c) => c.store.setDue(c.node.id, null),
  ),
  SlashCommand(
    id: 'indent',
    group: 'Organize',
    label: 'Indent',
    keywords: ['nest', 'right'],
    icon: Icons.format_indent_increase,
    available: (c) => c.store.canIndent(c.node.id),
    run: (c) => c.store.indent(c.node.id),
  ),
  SlashCommand(
    id: 'outdent',
    group: 'Organize',
    label: 'Outdent',
    keywords: ['unnest', 'left'],
    icon: Icons.format_indent_decrease,
    available: (c) => c.store.canOutdent(c.node.id),
    run: (c) => c.store.outdent(c.node.id),
  ),
  SlashCommand(
    id: 'duplicate',
    group: 'Organize',
    label: 'Duplicate',
    keywords: ['copy', 'clone'],
    icon: Icons.copy_outlined,
    run: (c) => c.store.duplicate(c.node.id),
  ),
  SlashCommand(
    id: 'duplicate-with-children',
    group: 'Organize',
    label: 'Duplicate with children',
    keywords: ['copy', 'clone', 'subtree'],
    icon: Icons.copy_all_outlined,
    available: (c) => c.childCount > 0,
    run: (c) => c.store.duplicateWithChildren(c.node.id),
  ),
  SlashCommand(
    id: 'zoom-in',
    capture: true,
    group: 'Node',
    label: 'Zoom in',
    keywords: ['open', 'focus'],
    icon: Icons.zoom_in,
    run: (c) => c.zoomTo(c.node.id),
  ),
  SlashCommand(
    id: 'break-into-steps',
    group: 'Node',
    label: 'Break into steps',
    description: 'Let AI split this note into tasks',
    keywords: ['split', 'ai', 'tasks'],
    icon: Icons.auto_awesome_outlined,
    available: (c) => c.split != null,
    run: (c) {
      if (c.node.text.trim().isNotEmpty) c.split?.call(c.node.id);
    },
  ),
  SlashCommand(
    id: 'copy-link',
    group: 'Node',
    label: 'Copy link',
    keywords: ['url', 'share'],
    icon: Icons.link,
    run: (c) => c.copyLink?.call(c.node.id),
  ),
  SlashCommand(
    id: 'delete',
    group: 'Node',
    label: 'Delete',
    keywords: ['remove', 'trash'],
    icon: Icons.delete_outline,
    danger: true,
    run: (c) => c.store.remove(c.node.id),
  ),
];

final captureSlashCommands = slashCommands.where((c) => c.capture).toList();

List<SlashCommand> filterSlash(Iterable<SlashCommand> items, String query) {
  final q = terms(query);
  if (q.isEmpty) return items.toList();
  return items.where((item) {
    final hay = fold([item.label, ...item.keywords].join(' '));
    return q.every(hay.contains);
  }).toList();
}

final _slashQuery = RegExp(r'(?:^|\s)/([\w-]*(?: [\w-]*){0,2})$');

String? slashQueryBefore(String text, int caret, [Iterable<SlashCommand>? items]) {
  if (caret < 0 || caret > text.length) return null;
  final query = _slashQuery.firstMatch(text.substring(0, caret))?.group(1);
  if (query == null || items == null || !query.contains(' ')) return query;
  return filterSlash(items, query).isEmpty ? null : query;
}

(String, int) removeSlashQuery(String text, int caret) {
  final before = text.substring(0, caret);
  final at = before.lastIndexOf('/');
  if (at < 0) return (text, caret);
  final kept = before.substring(0, at).trimRight();
  final after = text.substring(caret);
  final joined = kept.isEmpty ? after.trimLeft() : (after.isEmpty ? kept : '$kept ${after.trimLeft()}');
  return (joined, kept.length);
}

class SlashMenu extends StatelessWidget {
  const SlashMenu({super.key, required this.items, required this.onSelect, this.maxHeight = 260});

  final List<SlashCommand> items;
  final void Function(SlashCommand) onSelect;
  final double maxHeight;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (items.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(12),
        child: Text('No matching commands', style: theme.textTheme.bodySmall),
      );
    }
    final children = <Widget>[];
    String? group;
    for (final item in items) {
      if (item.group != group) {
        group = item.group;
        children.add(
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
            child: Text(
              group.toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 1, color: theme.hintColor),
            ),
          ),
        );
      }
      final color = item.danger ? theme.colorScheme.error : null;
      children.add(
        ListTile(
          key: Key('slash-${item.id}'),
          dense: true,
          visualDensity: VisualDensity.compact,
          leading: Icon(item.icon, size: 18, color: color),
          title: Text(item.label, style: TextStyle(color: color)),
          subtitle: item.description == null ? null : Text(item.description!),
          onTap: () => onSelect(item),
        ),
      );
    }
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxHeight),
      child: ListView(shrinkWrap: true, padding: const EdgeInsets.only(bottom: 6), children: children),
    );
  }
}
