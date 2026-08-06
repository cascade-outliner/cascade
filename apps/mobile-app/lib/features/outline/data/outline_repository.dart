import '../domain/outline_node.dart';

/// Loads (and, eventually, persists) the outline tree.
///
/// `OutlineController` depends on this abstraction rather than on any
/// concrete storage, the same way the web app's node procedures sit behind
/// the oRPC client — so swapping the in-memory implementation for one
/// backed by the real API is a new class, not a rewrite of the controller
/// or UI. `loadTree` returns a `Future` even though today's implementation
/// is synchronous, so callers already handle the async/loading shape a
/// network-backed repository will need.
abstract class OutlineRepository {
  Future<List<OutlineNode>> loadTree();
}
