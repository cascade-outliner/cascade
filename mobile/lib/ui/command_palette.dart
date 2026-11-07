import 'package:flutter/material.dart';

import '../data/daily.dart';
import '../data/node.dart';
import '../data/search.dart';
import 'store_scope.dart';
import 'theme.dart';
import 'widgets.dart';

const _nodeLimit = 8;

Future<void> showCommandPalette(
  BuildContext context, {
  required String? zoomedId,
  required void Function(String? id) onZoomTo,
}) {
  return showGeneralDialog(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Close search',
    barrierColor: context.colors.ink.withValues(alpha: 0.4),
    transitionDuration: const Duration(milliseconds: 180),
    transitionBuilder: (context, animation, _, child) => FadeTransition(
      opacity: animation,
      child: SlideTransition(
        position: Tween(begin: const Offset(0, -0.03), end: Offset.zero).animate(animation),
        child: child,
      ),
    ),
    pageBuilder: (context, _, _) => _CommandPalette(zoomedId: zoomedId, onZoomTo: onZoomTo),
  );
}

class _Item {
  const _Item({
    required this.key,
    required this.label,
    required this.icon,
    required this.onSelect,
    this.ranges = const [],
    this.detail,
  });
  final String key;
  final String label;
  final Widget icon;
  final VoidCallback onSelect;
  final List<TextRange> ranges;
  final String? detail;
}

class _CommandPalette extends StatefulWidget {
  const _CommandPalette({required this.zoomedId, required this.onZoomTo});
  final String? zoomedId;
  final void Function(String? id) onZoomTo;

  @override
  State<_CommandPalette> createState() => _CommandPaletteState();
}

class _CommandPaletteState extends State<_CommandPalette> {
  String query = '';

  Widget _icon(Node node, CascadeColors c) {
    if (node.task == null) {
      return Container(
        width: 6,
        height: 6,
        decoration: BoxDecoration(shape: BoxShape.circle, color: c.ink),
      );
    }
    return Icon(node.task!.done ? Icons.check_circle : Icons.radio_button_unchecked, size: 16, color: c.ink);
  }

  void _go(String? id) {
    Navigator.pop(context);
    widget.onZoomTo(id);
  }

  @override
  Widget build(BuildContext context) {
    final store = StoreScope.of(context);
    final c = context.colors;
    final zoomedId = widget.zoomedId;

    List<_Item> nodeItems(List<SearchHit> hits, [String? pathFrom]) => [
      for (final hit in hits)
        () {
          final ancestors = store.ancestorsOf(hit.node.id);
          final from = ancestors.indexWhere((a) => a.id == pathFrom) + 1;
          final path = ancestors
              .skip(from)
              .map((a) => relativeDay(a.id) ?? (a.text.isEmpty ? 'Untitled' : a.text))
              .join(' / ');
          return _Item(
            key: 'node-${hit.node.id}',
            label: hit.text,
            ranges: hit.match.ranges,
            detail: path.isEmpty ? null : path,
            icon: _icon(hit.node, c),
            onSelect: () => _go(hit.node.id),
          );
        }(),
    ];

    final groups = <(String, List<_Item>)>[];
    final children = zoomedId == null ? null : store.search(query, limit: _nodeLimit, within: zoomedId);
    final others = store.search(query, limit: _nodeLimit, excluding: zoomedId);
    final total = (children?.total ?? 0) + others.total;
    if (children != null) groups.add(('Children', nodeItems(children.hits, zoomedId)));
    groups.add(('Nodes', nodeItems(others.hits)));
    final trimmed = query.trim();
    if (trimmed.isNotEmpty) {
      groups.add((
        'Create',
        [
          _Item(
            key: 'create',
            label: 'New node “$trimmed”',
            icon: Icon(Icons.add, size: 16, color: c.ink),
            onSelect: () {
              Navigator.pop(context);
              store.create(zoomedId, text: trimmed);
            },
          ),
        ],
      ));
    }
    groups.add((
      'Navigation',
      [
        _Item(
          key: 'today',
          label: "Today's note",
          icon: Icon(Icons.calendar_today_outlined, size: 16, color: c.ink),
          onSelect: () => _go(dayId(DateTime.now())),
        ),
        if (zoomedId != null)
          _Item(
            key: 'home',
            label: 'Go back home',
            icon: Icon(Icons.home_outlined, size: 16, color: c.ink),
            onSelect: () => _go(null),
          ),
      ],
    ));

    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Material(
            color: c.surface,
            borderRadius: BorderRadius.circular(20),
            clipBehavior: Clip.antiAlias,
            elevation: 12,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75, maxWidth: 640),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 6, 8, 6),
                    child: Row(
                      children: [
                        Icon(Icons.search, size: 20, color: c.muted),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            key: const Key('palette-input'),
                            autofocus: true,
                            onChanged: (value) => setState(() => query = value),
                            onSubmitted: (_) {
                              final first = groups.expand((g) => g.$2).firstOrNull;
                              first?.onSelect();
                            },
                            style: const TextStyle(fontSize: 16),
                            decoration: InputDecoration(
                              hintText: 'Find or create a node…',
                              hintStyle: TextStyle(color: c.placeholder),
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                        if (trimmed.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: Text(
                              '$total result${total == 1 ? '' : 's'}',
                              key: const Key('palette-status'),
                              style: TextStyle(fontSize: 12, color: c.muted),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Divider(height: 1, color: c.border),
                  Flexible(
                    child: ListView(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      children: [
                        for (final (label, items) in groups)
                          if (items.isNotEmpty) ...[
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                              child: Text(
                                label.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 11,
                                  letterSpacing: 1,
                                  color: c.muted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            for (final item in items)
                              InkWell(
                                key: Key('palette-${item.key}'),
                                onTap: item.onSelect,
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                  child: Row(
                                    children: [
                                      SizedBox(width: 20, child: Center(child: item.icon)),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            HighlightedText(
                                              text: item.label.isEmpty ? 'Untitled' : item.label,
                                              ranges: item.label.isEmpty ? const [] : item.ranges,
                                              maxLines: 1,
                                              style: TextStyle(fontSize: 15, color: c.ink),
                                            ),
                                            if (item.detail != null)
                                              Text(
                                                item.detail!,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(fontSize: 12, color: c.muted),
                                              ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                      ],
                    ),
                  ),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    color: c.inkSubtle,
                    child: Text('Searching all nodes · tap to zoom in', style: TextStyle(fontSize: 11, color: c.muted)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
