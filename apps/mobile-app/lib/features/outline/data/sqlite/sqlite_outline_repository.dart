import 'package:sqflite/sqflite.dart';

import '../../domain/outline_node.dart';
import '../outline_repository.dart';
import 'app_database.dart';

/// Persists the outline tree to an on-device SQLite database via
/// `sqflite`, so edits survive app restarts.
///
/// Each node is one row (`id`, `parent_id`, `position`, `text`,
/// `expanded`) in a single `nodes` table; `parent_id IS NULL` marks a
/// root. `saveTree` replaces the whole table in a single transaction
/// rather than diffing against what's already stored — outline trees on a
/// personal mobile client are small enough that a full rewrite per edit is
/// simpler to keep correct than incremental CRUD mirroring every operation
/// in `outline_tree.dart`, and it means this repository can't drift out of
/// sync with whatever `OutlineController` does next.
///
/// On a fresh install the `nodes` table is empty, so `loadTree` seeds (and
/// persists) the same demo content `InMemoryOutlineRepository` used to
/// show unconditionally — after that first save, later launches load
/// whatever the user actually left in the tree.
class SqliteOutlineRepository implements OutlineRepository {
  SqliteOutlineRepository({AppDatabase? database, OutlineIdGenerator? idGenerator})
    : _database = database ?? AppDatabase(),
      _idGenerator = idGenerator ?? OutlineIdGenerator();

  final AppDatabase _database;
  final OutlineIdGenerator _idGenerator;

  @override
  Future<List<OutlineNode>> loadTree() async {
    final db = await _database.open();
    final rows = await db.query('nodes', orderBy: 'parent_id, position');

    if (rows.isEmpty) {
      final seeded = _seedDemoTree();
      await saveTree(seeded);
      return seeded;
    }

    final nodesById = <String, OutlineNode>{
      for (final row in rows)
        row['id'] as String: OutlineNode(
          id: row['id'] as String,
          text: row['text'] as String,
          expanded: (row['expanded'] as int) != 0,
        ),
    };

    final roots = <OutlineNode>[];
    for (final row in rows) {
      final node = nodesById[row['id'] as String]!;
      final parentId = row['parent_id'] as String?;
      final parent = parentId == null ? null : nodesById[parentId];
      if (parent == null) {
        roots.add(node);
      } else {
        parent.children.add(node);
      }
    }
    return roots;
  }

  @override
  Future<void> saveTree(List<OutlineNode> roots) async {
    final db = await _database.open();
    await db.transaction((txn) async {
      await txn.delete('nodes');
      final batch = txn.batch();
      _batchInsertLevel(batch, roots, null);
      await batch.commit(noResult: true);
    });
  }

  void _batchInsertLevel(Batch batch, List<OutlineNode> nodes, String? parentId) {
    for (var i = 0; i < nodes.length; i++) {
      final node = nodes[i];
      batch.insert('nodes', {
        'id': node.id,
        'parent_id': parentId,
        'position': i,
        'text': node.text,
        'expanded': node.expanded ? 1 : 0,
      });
      _batchInsertLevel(batch, node.children, node.id);
    }
  }

  List<OutlineNode> _seedDemoTree() {
    final welcome = OutlineNode(id: _idGenerator.next(), text: 'Welcome to Cascade');
    final firstChild = OutlineNode(id: _idGenerator.next(), text: 'Tap the chevron to expand or collapse a node');
    final secondChild = OutlineNode(
      id: _idGenerator.next(),
      text: 'Tap + to add a child, or press enter for a new node below',
    );
    welcome.children = [firstChild, secondChild];

    final second = OutlineNode(id: _idGenerator.next(), text: 'This is a second top-level node');

    return [welcome, second];
  }
}
