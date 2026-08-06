import '../domain/outline_node.dart';

/// Loads and persists the outline tree.
///
/// `OutlineController` depends on this abstraction rather than on any
/// concrete storage, the same way the web app's node procedures sit behind
/// the oRPC client — so swapping the on-device SQLite implementation
/// (`SqliteOutlineRepository`) for one backed by the real network API is a
/// new class, not a rewrite of the controller or UI.
abstract class OutlineRepository {
  Future<List<OutlineNode>> loadTree();

  /// Persists the current state of [roots] (and every descendant),
  /// replacing whatever this repository previously had stored for the
  /// tree. Called by `OutlineController` after every edit.
  Future<void> saveTree(List<OutlineNode> roots);
}
