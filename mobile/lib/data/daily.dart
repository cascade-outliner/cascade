import 'order.dart';
import 'store.dart';

const dailyRoot = 'daily';
const _prefix = '$dailyRoot-';
final _day = RegExp(r'^daily-\d{4}-\d{2}-\d{2}$');

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', //
  'August', 'September', 'October', 'November', 'December',
];
const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

String _pad(int n) => n.toString().padLeft(2, '0');

String isoDay(DateTime date) => '${date.year}-${_pad(date.month)}-${_pad(date.day)}';

String dayId(DateTime date) => _prefix + isoDay(date);

bool isDayId(String id) => _day.hasMatch(id);

bool isDailyNode(String id) => id == dailyRoot || id.startsWith(_prefix);

DateTime dayDate(String id) => fromIsoDay(id.substring(_prefix.length));

DateTime fromIsoDay(String day) {
  final parts = day.split('-').map(int.parse).toList();
  return DateTime(parts[0], parts[1], parts[2]);
}

String yearId(int year) => '$_prefix$year';

String monthId(int year, int month0) => '${yearId(year)}-${_pad(month0 + 1)}';

String _ensure(OutlineStore store, String id, String? parentId, String text) {
  if (store.get(id) != null) return id;
  final siblings = store.nodes.values.where((n) => n.parentId == parentId).toList()..sort(byOrder);
  var index = siblings.length;
  for (var at = 0; at < siblings.length; at++) {
    final node = siblings[at];
    if (!isDailyNode(node.id)) continue;
    if (node.id.compareTo(id) > 0) {
      index = at;
      break;
    }
    index = at + 1;
  }
  return store.create(parentId, id: id, index: index, text: text);
}

String openDay(OutlineStore store, DateTime date) {
  final month = monthId(date.year, date.month - 1);
  openMonth(store, date.year, date.month - 1);
  return _ensure(store, dayId(date), month, dayTitle(date));
}

String openYear(OutlineStore store, int year) {
  _ensure(store, dailyRoot, null, 'Daily nodes');
  return _ensure(store, yearId(year), dailyRoot, '$year');
}

String openMonth(OutlineStore store, int year, int month0) {
  final y = year + (month0 ~/ 12) - (month0 < 0 && month0 % 12 != 0 ? 1 : 0);
  final m = month0 % 12;
  openYear(store, y);
  return _ensure(store, monthId(y, m), yearId(y), monthNames[m]);
}

String ordinal(int day) {
  if (day % 100 >= 11 && day % 100 <= 13) return '${day}th';
  switch (day % 10) {
    case 1:
      return '${day}st';
    case 2:
      return '${day}nd';
    case 3:
      return '${day}rd';
  }
  return '${day}th';
}

String dayTitle(DateTime date) => '${weekdayNames[date.weekday - 1]}, ${ordinal(date.day)}';

DateTime shiftDay(String? id, int by, [DateTime? now]) {
  final base = id != null && isDayId(id) ? dayDate(id) : (now ?? DateTime.now());
  return DateTime(base.year, base.month, base.day + by);
}

String? relativeDay(String id, [DateTime? now]) {
  if (!isDayId(id)) return null;
  const relative = {-1: 'Yesterday', 0: 'Today', 1: 'Tomorrow'};
  for (final entry in relative.entries) {
    if (dayId(shiftDay(null, entry.key, now)) == id) return entry.value;
  }
  return null;
}

String shortDate(DateTime date) => '${monthNames[date.month - 1].substring(0, 3)} ${date.day}';

String? dayLabel(String id, [DateTime? now]) {
  if (!isDayId(id)) return null;
  return relativeDay(id, now) ?? shortDate(dayDate(id));
}

String dueLabel(String due, [DateTime? now]) => dayLabel(_prefix + due, now) ?? due;
