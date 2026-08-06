import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// Opens (creating on first launch) the on-device SQLite database that
/// backs [SqliteOutlineRepository], and owns its schema.
///
/// A thin wrapper around `sqflite` so the repository talks in terms of
/// "the nodes table" rather than connection/schema lifecycle, and so tests
/// can point it at a different [DatabaseFactory] (e.g.
/// `sqflite_common_ffi`) or file name instead of the real on-device path.
class AppDatabase {
  AppDatabase({this.fileName = 'cascade.db', DatabaseFactory? databaseFactoryOverride})
    : _databaseFactory = databaseFactoryOverride ?? databaseFactory;

  final String fileName;
  final DatabaseFactory _databaseFactory;

  Database? _database;

  /// Returns the open database, opening (and creating the schema for) it
  /// on first use. Idempotent — later calls reuse the same connection.
  Future<Database> open() async {
    final existing = _database;
    if (existing != null) return existing;

    // `inMemoryDatabasePath` (":memory:") is a magic value sqlite
    // recognizes as "don't touch disk at all" — joining it onto a real
    // directory (as done below for every other file name) would turn it
    // into an ordinary file named literally ":memory:" instead.
    final path = fileName == inMemoryDatabasePath
        ? fileName
        : p.join(await _databaseFactory.getDatabasesPath(), fileName);

    final database = await _databaseFactory.openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: 1,
        onConfigure: (db) => db.execute('PRAGMA foreign_keys = ON'),
        onCreate: (db, version) async {
          await db.execute('''
            CREATE TABLE nodes (
              id TEXT PRIMARY KEY,
              parent_id TEXT REFERENCES nodes (id) ON DELETE CASCADE,
              position INTEGER NOT NULL,
              text TEXT NOT NULL DEFAULT '',
              expanded INTEGER NOT NULL DEFAULT 1
            )
          ''');
          await db.execute('CREATE INDEX idx_nodes_parent_id ON nodes (parent_id)');
        },
      ),
    );
    _database = database;
    return database;
  }

  Future<void> close() async {
    final database = _database;
    if (database == null) return;
    _database = null;
    await database.close();
  }
}
