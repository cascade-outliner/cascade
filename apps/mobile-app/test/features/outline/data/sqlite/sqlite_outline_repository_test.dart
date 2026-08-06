import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/outline/data/sqlite/app_database.dart';
import 'package:mobile/features/outline/data/sqlite/sqlite_outline_repository.dart';
import 'package:mobile/features/outline/domain/outline_node.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Builds a repository backed by a fresh, uniquely-named in-memory SQLite
/// database via `sqflite_common_ffi`, so each test gets its own isolated
/// storage without touching the filesystem or a real platform channel.
SqliteOutlineRepository _repository() {
  return SqliteOutlineRepository(
    database: AppDatabase(fileName: inMemoryDatabasePath, databaseFactoryOverride: databaseFactoryFfi),
  );
}

OutlineNode _node(String id, {String text = '', List<OutlineNode>? children, bool expanded = true}) =>
    OutlineNode(id: id, text: text, children: children, expanded: expanded);

void main() {
  sqfliteFfiInit();

  group('SqliteOutlineRepository', () {
    test('loadTree seeds demo content on a fresh database', () async {
      final repository = _repository();

      final roots = await repository.loadTree();

      expect(roots.map((n) => n.text), ['Welcome to Cascade', 'This is a second top-level node']);
      expect(roots.first.children, hasLength(2));
    });

    test('saveTree then loadTree round-trips text, expanded state, and nesting', () async {
      final repository = _repository();
      final child = _node('child', text: 'a child', expanded: false);
      final root = _node('root', text: 'a root', children: [child]);

      await repository.saveTree([root]);
      final loaded = await repository.loadTree();

      expect(loaded, hasLength(1));
      expect(loaded.single.id, 'root');
      expect(loaded.single.text, 'a root');
      expect(loaded.single.expanded, isTrue);
      expect(loaded.single.children, hasLength(1));
      expect(loaded.single.children.single.id, 'child');
      expect(loaded.single.children.single.text, 'a child');
      expect(loaded.single.children.single.expanded, isFalse);
    });

    test('saveTree preserves sibling order', () async {
      final repository = _repository();

      await repository.saveTree([_node('a'), _node('b'), _node('c')]);
      final loaded = await repository.loadTree();

      expect(loaded.map((n) => n.id), ['a', 'b', 'c']);
    });

    test('saveTree replaces whatever was previously stored', () async {
      final repository = _repository();

      await repository.saveTree([_node('a'), _node('b')]);
      await repository.saveTree([_node('c')]);
      final loaded = await repository.loadTree();

      expect(loaded.map((n) => n.id), ['c']);
    });
  });
}
