import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/outline/application/outline_controller.dart';
import 'package:mobile/features/outline/data/outline_repository.dart';
import 'package:mobile/features/outline/domain/outline_node.dart';

/// Records every `saveTree` call (as a snapshot of node ids at call time)
/// instead of actually persisting anything, so tests can assert on when
/// and how often `OutlineController` decides to persist.
class _RecordingRepository implements OutlineRepository {
  final List<List<String>> saveCalls = [];

  @override
  Future<List<OutlineNode>> loadTree() async => [];

  @override
  Future<void> saveTree(List<OutlineNode> roots) async {
    saveCalls.add(roots.map((n) => n.id).toList());
  }
}

OutlineController _controller(_RecordingRepository repository) =>
    OutlineController(repository: repository, persistDebounce: Duration.zero);

void main() {
  group('OutlineController persistence', () {
    test('addRoot schedules a saveTree call reflecting the new tree', () async {
      final repository = _RecordingRepository();
      final controller = _controller(repository);

      final id = controller.addRoot();
      await Future<void>.delayed(Duration.zero);

      expect(repository.saveCalls, [
        [id],
      ]);
    });

    test('rapid edits collapse into a single saveTree once things go quiet', () async {
      final repository = _RecordingRepository();
      final controller = _controller(repository);

      final firstId = controller.addRoot();
      final secondId = controller.addRoot();
      // Both calls above scheduled (and the first cancelled) a debounced
      // persist; nothing has actually run yet.
      expect(repository.saveCalls, isEmpty);

      await Future<void>.delayed(Duration.zero);

      expect(repository.saveCalls, [
        [firstId, secondId],
      ]);
    });

    test('delete schedules a saveTree call with the node removed', () async {
      final repository = _RecordingRepository();
      final controller = _controller(repository);
      final id = controller.addRoot();
      await Future<void>.delayed(Duration.zero);
      repository.saveCalls.clear();

      controller.delete(id);
      await Future<void>.delayed(Duration.zero);

      expect(repository.saveCalls, [[]]);
    });

    test('a saveTree failure is surfaced as controller.error', () async {
      final controller = OutlineController(repository: _ThrowingRepository(), persistDebounce: Duration.zero);

      controller.addRoot();
      await Future<void>.delayed(Duration.zero);

      expect(controller.error, isNotNull);
    });
  });
}

class _ThrowingRepository implements OutlineRepository {
  @override
  Future<List<OutlineNode>> loadTree() async => [];

  @override
  Future<void> saveTree(List<OutlineNode> roots) async {
    throw StateError('disk full');
  }
}
