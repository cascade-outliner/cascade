import 'package:flutter/material.dart';

import '../data/daily.dart';
import '../data/node.dart';
import 'store_scope.dart';
import 'theme.dart';
import 'widgets.dart';

class DueElsewhere extends StatelessWidget {
  const DueElsewhere({super.key, required this.groups, required this.excluding, required this.onZoomTo});

  final List<(String, String)> groups;
  final String excluding;
  final void Function(String? id) onZoomTo;

  @override
  Widget build(BuildContext context) {
    final store = StoreScope.of(context);
    final c = context.colors;
    final filled = [
      for (final (label, day) in groups)
        if (store.dueOn(day, excluding: excluding) case final nodes when nodes.isNotEmpty) (label, day, nodes),
    ];
    if (filled.isEmpty) return const SizedBox.shrink();
    return Padding(
      key: const Key('due-elsewhere'),
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (label, day, nodes) in filled) ...[
            SectionLabel(label, trailing: '${nodes.length}'),
            for (final node in nodes)
              Padding(
                key: Key('due-$day-${node.id}'),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Row(
                  children: [
                    if (node.task != null)
                      TaskMarker(
                        done: node.task!.done,
                        onTap: () => store.setTask(node.id, Task(done: !node.task!.done)),
                      )
                    else
                      const SizedBox(width: 10),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        node.text,
                        style: TextStyle(
                          color: node.task?.done ?? false ? c.muted : c.ink,
                          decoration: node.task?.done ?? false ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ),
                    TextButton.icon(
                      style: TextButton.styleFrom(
                        foregroundColor: c.muted,
                        visualDensity: VisualDensity.compact,
                        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                      onPressed: () => onZoomTo(node.parentId),
                      iconAlignment: IconAlignment.end,
                      icon: const Icon(Icons.north_east, size: 12),
                      label: Text(() {
                        final parent = node.parentId == null ? null : store.get(node.parentId!);
                        if (parent == null) return 'Home';
                        return relativeDay(parent.id) ?? parent.text;
                      }()),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 20),
          ],
        ],
      ),
    );
  }
}
