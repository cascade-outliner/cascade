import 'package:cascade/data/daily.dart';
import 'package:cascade/data/node.dart';
import 'package:cascade/data/order.dart';
import 'package:cascade/data/persistence.dart';
import 'package:cascade/data/search.dart';
import 'package:cascade/data/store.dart';
import 'package:flutter_test/flutter_test.dart';

Future<OutlineStore> fresh() async {
  final store = OutlineStore(MemoryPersistence());
  await store.ready;
  return store;
}

List<String> texts(OutlineStore store, [String? root]) =>
    store.rows(root).map((r) => '${'  ' * r.depth}${r.node.text}').toList();

void main() {
  group('order', () {
    test('matches fractional-indexing keys', () {
      expect(generateKeyBetween(null, null), 'a0');
      expect(generateKeyBetween('a0', null), 'a1');
      expect(generateKeyBetween(null, 'a0'), 'Zz');
      expect(generateKeyBetween('a0', 'a1'), 'a0V');
      expect(generateKeyBetween('a0V', 'a1'), 'a0l');
      expect(generateKeyBetween('az', null), 'b00');
      expect(generateKeyBetween('Zz', 'a0'), 'ZzV');
    });

    test('stays sorted across many inserts', () {
      final keys = <String>[];
      String? prev;
      for (var i = 0; i < 200; i++) {
        prev = orderBetween(prev, null);
        keys.add(prev);
      }
      expect([...keys]..sort(), keys);
      var a = 'a0', b = 'a1';
      for (var i = 0; i < 50; i++) {
        final m = orderBetween(a, b);
        expect(a.compareTo(m) < 0 && m.compareTo(b) < 0, isTrue);
        b = m;
      }
    });
  });

  group('store', () {
    test('creates, nests and outdents', () async {
      final store = await fresh();
      final a = store.create(null, text: 'A');
      final b = store.create(null, text: 'B');
      store.create(null, text: 'C');
      expect(store.indent(b), isTrue);
      expect(texts(store), ['A', '  B', 'C']);
      expect(store.outdent(b), isTrue);
      expect(texts(store), ['A', 'B', 'C']);
      expect(store.canIndent(a), isFalse);
    });

    test('collapse hides children, rows below a zoomed root', () async {
      final store = await fresh();
      final a = store.create(null, text: 'A');
      store.create(a, text: 'child');
      store.setCollapsed(a, true);
      expect(texts(store), ['A']);
      expect(texts(store, a), ['child']);
    });

    test('move refuses cycles', () async {
      final store = await fresh();
      final a = store.create(null, text: 'A');
      final b = store.create(a, text: 'B');
      expect(store.move(a, b), isFalse);
      expect(store.move(b, null, 0), isTrue);
      expect(texts(store), ['B', 'A']);
    });

    test('duplicate with children copies the subtree next to it', () async {
      final store = await fresh();
      final a = store.create(null, text: 'A');
      final b = store.create(a, text: 'B');
      store.create(b, text: 'C');
      store.create(null, text: 'Z');
      store.duplicateWithChildren(a);
      expect(texts(store), ['A', '  B', '    C', 'A', '  B', '    C', 'Z']);
    });

    test('remove takes descendants', () async {
      final store = await fresh();
      final a = store.create(null, text: 'A');
      store.create(a, text: 'B');
      store.remove(a);
      expect(store.size, 0);
    });

    test('daily nodes are locked and created on demand', () async {
      final store = await fresh();
      final day = DateTime(2026, 11, 7);
      final child = store.create(dayId(day), text: 'note');
      expect(store.get(dayId(day))!.text, 'Saturday, 7th');
      expect(store.get(monthId(2026, 10))!.text, 'November');
      expect(store.get(yearId(2026))!.text, '2026');
      expect(store.get(dailyRoot)!.text, 'Daily nodes');
      store.setText(dayId(day), 'changed');
      expect(store.get(dayId(day))!.text, 'Saturday, 7th');
      expect(store.move(dayId(day), null), isFalse);
      expect(store.get(child)!.parentId, dayId(day));
    });

    test('daily siblings sort by date', () async {
      final store = await fresh();
      openDay(store, DateTime(2026, 11, 9));
      openDay(store, DateTime(2026, 11, 2));
      openDay(store, DateTime(2026, 11, 5));
      final days = store.childrenOf(monthId(2026, 10)).map((n) => n.id).toList();
      expect(days, ['daily-2026-11-02', 'daily-2026-11-05', 'daily-2026-11-09']);
    });

    test('dueOn excludes a subtree and keeps outline order', () async {
      final store = await fresh();
      final x = store.create(null, text: 'X');
      final y = store.create(null, text: 'Y');
      final inner = store.create(y, text: 'inner');
      for (final id in [x, y, inner]) {
        store.setDue(id, '2026-11-07');
      }
      expect(store.dueOn('2026-11-07').map((n) => n.text), ['X', 'Y', 'inner']);
      expect(store.dueOn('2026-11-07', excluding: y).map((n) => n.text), ['X']);
    });

    test('persists through a snapshot', () async {
      final persistence = MemoryPersistence();
      final store = OutlineStore(persistence);
      await store.ready;
      final a = store.create(null, text: 'A');
      store.setTask(a, const Task(done: true));
      store.completeOnboarding();
      final again = OutlineStore(persistence);
      await again.ready;
      expect(again.get(a)!.task!.done, isTrue);
      expect(again.onboarded, isTrue);
    });
  });

  group('search', () {
    test('every term must match; word starts rank first', () {
      Node n(String id, String text) => Node(id: id, parentId: null, order: 'a0', text: text, updatedAt: 0);
      final result = searchNodes([n('1', 'Plan the café launch'), n('2', 'replan'), n('3', 'other')], 'plan', 10);
      expect(result.hits.map((h) => h.node.id), ['1', '2']);
      expect(searchNodes([n('1', 'Plan the café launch')], 'cafe launch', 10).total, 1);
      expect(searchNodes([n('1', 'Plan')], 'plan zzz', 10).total, 0);
    });

    test('highlights phrases', () {
      expect(phraseRanges('Call Bob today and Anna', ['call bob', 'anna']), [(0, 8), (19, 23)]);
    });
  });

  group('daily labels', () {
    test('titles and relative days', () {
      final now = DateTime(2026, 11, 7);
      expect(dayTitle(DateTime(2026, 11, 1)), 'Sunday, 1st');
      expect(dayTitle(DateTime(2026, 11, 12)), 'Thursday, 12th');
      expect(dayTitle(DateTime(2026, 11, 23)), 'Monday, 23rd');
      expect(relativeDay('daily-2026-11-08', now), 'Tomorrow');
      expect(dayLabel('daily-2026-11-20', now), 'Nov 20');
      expect(dueLabel('2026-11-06', now), 'Yesterday');
    });
  });
}
