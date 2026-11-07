import 'package:flutter/material.dart';

import '../data/daily.dart';
import 'theme.dart';

class MonthCalendar extends StatefulWidget {
  const MonthCalendar({super.key, this.selected, required this.onPick, this.marked});
  final DateTime? selected;
  final void Function(DateTime) onPick;
  final bool Function(DateTime)? marked;

  @override
  State<MonthCalendar> createState() => _MonthCalendarState();
}

class _MonthCalendarState extends State<MonthCalendar> {
  late DateTime month;

  @override
  void initState() {
    super.initState();
    final base = widget.selected ?? DateTime.now();
    month = DateTime(base.year, base.month);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final today = DateTime.now();
    final first = DateTime(month.year, month.month);
    final lead = (first.weekday + 6) % 7;
    final days = DateTime(month.year, month.month + 1, 0).day;
    bool same(DateTime a, DateTime? b) => b != null && a.year == b.year && a.month == b.month && a.day == b.day;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            IconButton(
              tooltip: 'Previous month',
              icon: const Icon(Icons.chevron_left),
              onPressed: () => setState(() => month = DateTime(month.year, month.month - 1)),
            ),
            Expanded(
              child: Text(
                '${monthNames[month.month - 1]} ${month.year}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
            ),
            IconButton(
              tooltip: 'Next month',
              icon: const Icon(Icons.chevron_right),
              onPressed: () => setState(() => month = DateTime(month.year, month.month + 1)),
            ),
          ],
        ),
        Row(
          children: [
            for (final d in ['M', 'T', 'W', 'T', 'F', 'S', 'S'])
              Expanded(
                child: Center(
                  child: Text(
                    d,
                    style: TextStyle(fontSize: 11, color: c.muted, fontWeight: FontWeight.w500),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        GridView.count(
          crossAxisCount: 7,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.1,
          children: [
            for (var i = 0; i < lead; i++) const SizedBox.shrink(),
            for (var d = 1; d <= days; d++)
              Builder(
                builder: (context) {
                  final date = DateTime(month.year, month.month, d);
                  final selected = same(date, widget.selected);
                  final isToday = same(date, today);
                  final marked = widget.marked?.call(date) ?? false;
                  return InkWell(
                    key: Key('calendar-${isoDay(date)}'),
                    customBorder: const CircleBorder(),
                    onTap: () => widget.onPick(date),
                    child: Container(
                      margin: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: selected ? c.primary : null,
                        border: isToday && !selected ? Border.all(color: c.border) : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '$d',
                            style: TextStyle(
                              fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                              color: selected ? c.onPrimary : c.ink,
                            ),
                          ),
                          Container(
                            width: 4,
                            height: 4,
                            margin: const EdgeInsets.only(top: 2),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: marked ? (selected ? c.onPrimary : c.ink) : Colors.transparent,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ],
    );
  }
}

Future<DateTime?> pickDay(
  BuildContext context, {
  DateTime? selected,
  bool Function(DateTime)? marked,
  String title = 'Pick a day',
}) {
  return showModalBottomSheet<DateTime>(
    context: context,
    isScrollControlled: true,
    builder: (context) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 17)),
            const SizedBox(height: 8),
            MonthCalendar(selected: selected, marked: marked, onPick: (date) => Navigator.pop(context, date)),
            const SizedBox(height: 8),
            TextButton(
              key: const Key('calendar-today'),
              onPressed: () => Navigator.pop(context, DateTime.now()),
              child: const Text('Today'),
            ),
          ],
        ),
      ),
    ),
  );
}
