import 'package:flutter/material.dart';

import '../data/daily.dart';
import '../data/node.dart';
import '../data/store.dart';
import 'calendar.dart';
import 'store_scope.dart';
import 'theme.dart';
import 'widgets.dart';

class StripItem {
  const StripItem({required this.name, required this.label, required this.marked, required this.onPick});
  final String name;
  final String label;
  final bool marked;
  final VoidCallback onPick;
}

class OutlineHeader extends StatelessWidget {
  const OutlineHeader({super.key, required this.zoomedId, required this.onZoomTo, required this.onSearch});

  final String? zoomedId;
  final void Function(String? id) onZoomTo;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    final store = StoreScope.of(context);
    final c = context.colors;
    final parents = {for (final n in store.nodes.values) n.parentId};
    bool marked(DateTime date) => parents.contains(dayId(date));
    final zoomed = zoomedId == null ? null : store.get(zoomedId!);
    final ancestors = zoomed == null ? const <Node>[] : store.ancestorsOf(zoomed.id);
    final crumbs = <(String, VoidCallback)>[
      if (zoomed != null)
        for (final node in ancestors)
          (relativeDay(node.id) ?? (node.text.isEmpty ? 'Untitled' : node.text), () => onZoomTo(node.id))
      else if (zoomedId != null && isDayId(zoomedId!))
        ...() {
          final date = dayDate(zoomedId!);
          return [
            (
              'Daily nodes',
              () {
                openYear(store, date.year);
                onZoomTo(dailyRoot);
              },
            ),
            ('${date.year}', () => onZoomTo(openYear(store, date.year))),
            (monthNames[date.month - 1], () => onZoomTo(openMonth(store, date.year, date.month - 1))),
          ];
        }(),
    ];
    final label = (zoomedId != null ? dayLabel(zoomedId!) : null) ?? 'Today';
    final isToday = zoomedId == dayId(DateTime.now());
    final strip = _strip(store, parents);

    return Container(
      decoration: BoxDecoration(
        color: c.canvas,
        border: Border(bottom: BorderSide(color: c.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
            child: Row(
              children: [
                InkWell(
                  key: const Key('header-home'),
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => onZoomTo(null),
                  child: const Padding(
                    padding: EdgeInsets.all(2),
                    child: Row(
                      children: [
                        LogoMark(),
                        SizedBox(width: 8),
                        Text(
                          'Cascade',
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 17, letterSpacing: -0.3),
                        ),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                _DaySwitcher(
                  label: label,
                  active: isToday,
                  onOlder: () => onZoomTo(dayId(shiftDay(zoomedId, -1))),
                  onNewer: () => onZoomTo(dayId(shiftDay(zoomedId, 1))),
                  onPick: () async {
                    final date = await pickDay(
                      context,
                      selected: zoomedId != null && isDayId(zoomedId!) ? dayDate(zoomedId!) : DateTime.now(),
                      marked: marked,
                      title: 'Jump to a day',
                    );
                    if (date != null) onZoomTo(dayId(date));
                  },
                ),
                const SizedBox(width: 6),
                _SquareButton(key: const Key('header-search'), icon: Icons.search, tooltip: 'Search', onTap: onSearch),
              ],
            ),
          ),
          if (crumbs.isNotEmpty)
            SizedBox(
              height: 34,
              child: ListView(
                key: const Key('breadcrumbs'),
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                children: [
                  _Crumb(label: 'Home', onTap: () => onZoomTo(null)),
                  for (final (label, onTap) in crumbs) ...[
                    Icon(Icons.chevron_right, size: 16, color: c.placeholder),
                    _Crumb(label: label, onTap: onTap),
                  ],
                ],
              ),
            ),
          ?strip,
        ],
      ),
    );
  }

  Widget? _strip(OutlineStore store, Set<String?> parents) {
    final id = zoomedId;
    if (id == null) return null;
    final match = RegExp(r'^daily-(\d{4})(?:-(\d{2}))?(-\d{2})?$').firstMatch(id);
    if (match == null) return null;
    final year = int.parse(match.group(1)!);
    bool has(String id) => parents.contains(id);
    if (match.group(3) != null) {
      final date = dayDate(id);
      final index = date.weekday - 1;
      return PeriodStrip(
        selected: index,
        onShift: (by) => onZoomTo(dayId(shiftDay(id, 7 * by))),
        items: [
          for (var i = 0; i < 7; i++)
            () {
              final day = DateTime(date.year, date.month, date.day - index + i);
              return StripItem(
                name: weekdayNames[day.weekday - 1].substring(0, 3),
                label: '${day.day}',
                marked: has(dayId(day)),
                onPick: () => onZoomTo(dayId(day)),
              );
            }(),
        ],
      );
    }
    if (match.group(2) != null) {
      final m = int.parse(match.group(2)!) - 1;
      return PeriodStrip(
        selected: m,
        onShift: (by) => onZoomTo(openMonth(store, year + by, m)),
        items: [
          for (var i = 0; i < 12; i++)
            StripItem(
              name: '$year',
              label: monthNames[i].substring(0, 3),
              marked: has(monthId(year, i)),
              onPick: () => onZoomTo(openMonth(store, year, i)),
            ),
        ],
      );
    }
    return PeriodStrip(
      selected: 3,
      onShift: (by) => onZoomTo(openYear(store, year + 7 * by)),
      items: [
        for (var i = 0; i < 7; i++)
          StripItem(
            name: 'Year',
            label: '${year - 3 + i}',
            marked: has(yearId(year - 3 + i)),
            onPick: () => onZoomTo(openYear(store, year - 3 + i)),
          ),
      ],
    );
  }
}

class _Crumb extends StatelessWidget {
  const _Crumb({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(6),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 160),
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, color: context.colors.muted, fontWeight: FontWeight.w500),
          ),
        ),
      ),
    );
  }
}

class _SquareButton extends StatelessWidget {
  const _SquareButton({super.key, required this.icon, required this.tooltip, required this.onTap});
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            border: Border.all(color: c.border),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 18, color: c.muted),
        ),
      ),
    );
  }
}

class _DaySwitcher extends StatelessWidget {
  const _DaySwitcher({
    required this.label,
    required this.active,
    required this.onOlder,
    required this.onNewer,
    required this.onPick,
  });
  final String label;
  final bool active;
  final VoidCallback onOlder;
  final VoidCallback onNewer;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    Widget arrow(IconData icon, String key, VoidCallback onTap) => InkWell(
      key: Key(key),
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: SizedBox(width: 30, height: 34, child: Icon(icon, size: 18, color: c.muted)),
    );
    return Container(
      height: 36,
      decoration: BoxDecoration(
        border: Border.all(color: c.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          arrow(Icons.chevron_left, 'day-older', onOlder),
          InkWell(
            key: const Key('day-switcher'),
            borderRadius: BorderRadius.circular(8),
            onTap: onPick,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: active ? c.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.calendar_today_outlined, size: 13, color: active ? c.onPrimary : c.ink),
                  const SizedBox(width: 6),
                  Text(
                    label,
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: active ? c.onPrimary : c.ink),
                  ),
                ],
              ),
            ),
          ),
          arrow(Icons.chevron_right, 'day-newer', onNewer),
        ],
      ),
    );
  }
}

class PeriodStrip extends StatelessWidget {
  const PeriodStrip({super.key, required this.items, required this.selected, required this.onShift});
  final List<StripItem> items;
  final int selected;
  final void Function(int by) onShift;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      key: const Key('period-strip'),
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
      child: Row(
        children: [
          IconButton(
            key: const Key('strip-previous'),
            visualDensity: VisualDensity.compact,
            tooltip: 'Previous',
            icon: Icon(Icons.chevron_left, size: 18, color: c.muted),
            onPressed: () => onShift(-1),
          ),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth / items.length;
                return Stack(
                  children: [
                    AnimatedPositioned(
                      duration: const Duration(milliseconds: 260),
                      curve: const Cubic(0.2, 0, 0, 1),
                      left: width * selected + 2,
                      top: 0,
                      bottom: 0,
                      width: width - 4,
                      child: Container(
                        decoration: BoxDecoration(color: c.primary, borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                    Row(
                      children: [
                        for (var i = 0; i < items.length; i++)
                          Expanded(
                            child: GestureDetector(
                              key: Key('strip-$i'),
                              behavior: HitTestBehavior.opaque,
                              onTap: items[i].onPick,
                              child: _StripCell(item: items[i], selected: i == selected, compact: items.length > 7),
                            ),
                          ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ),
          IconButton(
            key: const Key('strip-next'),
            visualDensity: VisualDensity.compact,
            tooltip: 'Next',
            icon: Icon(Icons.chevron_right, size: 18, color: c.muted),
            onPressed: () => onShift(1),
          ),
        ],
      ),
    );
  }
}

class _StripCell extends StatelessWidget {
  const _StripCell({required this.item, required this.selected, required this.compact});
  final StripItem item;
  final bool selected;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final color = selected ? c.onPrimary : c.ink;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            item.name,
            maxLines: 1,
            style: TextStyle(
              fontSize: compact ? 8 : 10,
              fontWeight: FontWeight.w500,
              color: color.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 2),
          FittedBox(
            child: Text(
              item.label,
              style: TextStyle(fontSize: compact ? 12 : 15, fontWeight: FontWeight.w600, color: color),
            ),
          ),
          const SizedBox(height: 3),
          Container(
            width: 4,
            height: 4,
            decoration: BoxDecoration(shape: BoxShape.circle, color: item.marked ? color : Colors.transparent),
          ),
        ],
      ),
    );
  }
}
