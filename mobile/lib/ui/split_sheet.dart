import 'package:flutter/material.dart';

import '../ai/split.dart';
import '../data/daily.dart';
import '../data/search.dart';
import 'store_scope.dart';
import 'theme.dart';
import 'widgets.dart';

class _SplitBody extends StatelessWidget {
  const _SplitBody({required this.text, required this.future, required this.actions});
  final String text;
  final Future<SplitResult> future;
  final Widget Function(SplitResult result) actions;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return FutureBuilder<SplitResult>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Text("Couldn't split this line right now.", style: TextStyle(color: c.danger)),
          );
        }
        if (!snapshot.hasData) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: c.highlight)),
                const SizedBox(width: 12),
                Text('Breaking into steps…', style: TextStyle(color: c.muted)),
              ],
            ),
          );
        }
        final result = snapshot.data!;
        final tasks = result.offered;
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              HighlightedText(
                text: text,
                ranges: phraseRanges(text, [for (final t in tasks) t.source]),
                style: TextStyle(color: c.muted, height: 1.45),
              ),
              const SizedBox(height: 12),
              if (tasks.isEmpty)
                Text(cantSplit, style: TextStyle(color: c.muted))
              else ...[
                Text(result.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                const SizedBox(height: 6),
                for (final task in tasks)
                  Row(
                    children: [
                      const TaskMarker(done: false),
                      Expanded(child: Text(task.owner == null ? task.text : '${task.text} @${task.owner}')),
                      if (task.due != null) DuePill(due: task.due!),
                    ],
                  ),
              ],
              const SizedBox(height: 12),
              actions(result),
            ],
          ),
        );
      },
    );
  }
}

Future<void> showSplitSheet(BuildContext context, String nodeId) {
  final store = StoreScope.read(context);
  final node = store.get(nodeId);
  if (node == null) return Future.value();
  final text = node.text;
  final future = splitIntoTasks(text);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheet) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.auto_awesome_outlined, size: 18),
                SizedBox(width: 8),
                Text('Break into steps', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 17)),
              ],
            ),
          ),
          _SplitBody(
            text: text,
            future: future,
            actions: (result) => Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: () => Navigator.pop(sheet), child: const Text('Cancel')),
                if (result.offered.isNotEmpty)
                  FilledButton(
                    key: const Key('split-accept'),
                    onPressed: () {
                      store.setText(nodeId, result.title);
                      addTasks(store, nodeId, result.offered);
                      Navigator.pop(sheet);
                    },
                    child: const Text('Add steps'),
                  ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class CaptureSplitPanel extends StatefulWidget {
  const CaptureSplitPanel({
    super.key,
    required this.text,
    required this.parentId,
    required this.onClose,
    required this.onCancel,
  });
  final String text;
  final String? parentId;
  final VoidCallback onClose;
  final VoidCallback onCancel;

  @override
  State<CaptureSplitPanel> createState() => _CaptureSplitPanelState();
}

class _CaptureSplitPanelState extends State<CaptureSplitPanel> {
  late final future = splitIntoTasks(widget.text);

  @override
  Widget build(BuildContext context) {
    final store = StoreScope.read(context);
    return _SplitBody(
      text: widget.text,
      future: future,
      actions: (result) => Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          TextButton(onPressed: widget.onCancel, child: const Text('Keep as one line')),
          if (result.offered.isNotEmpty)
            FilledButton(
              onPressed: () {
                final parent = widget.parentId;
                if (parent != null && store.get(parent) == null && isDayId(parent)) openDay(store, dayDate(parent));
                final id = store.create(parent, text: result.title);
                addTasks(store, id, result.offered);
                widget.onClose();
              },
              child: const Text('Add steps'),
            ),
        ],
      ),
    );
  }
}
