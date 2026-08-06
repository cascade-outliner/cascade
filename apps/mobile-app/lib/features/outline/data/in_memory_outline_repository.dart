import '../domain/outline_node.dart';
import 'outline_repository.dart';

/// Holds the whole tree in memory and seeds it with a few demo nodes.
///
/// Used for tests/widget previews rather than the real app, which uses
/// `SqliteOutlineRepository` — nothing persists across app restarts here.
class InMemoryOutlineRepository implements OutlineRepository {
  InMemoryOutlineRepository({OutlineIdGenerator? idGenerator}) : _idGenerator = idGenerator ?? OutlineIdGenerator();

  final OutlineIdGenerator _idGenerator;

  @override
  Future<List<OutlineNode>> loadTree() async {
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

  /// No-op: the tree passed in is the same in-memory object graph this
  /// repository would otherwise hold, so there's nothing separate to write.
  @override
  Future<void> saveTree(List<OutlineNode> roots) async {}
}
