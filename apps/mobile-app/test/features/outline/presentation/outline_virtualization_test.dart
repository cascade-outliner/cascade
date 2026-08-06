import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/outline/application/outline_controller.dart';
import 'package:mobile/features/outline/data/outline_repository.dart';
import 'package:mobile/features/outline/domain/outline_node.dart';
import 'package:mobile/features/outline/presentation/outline_screen.dart';

/// A tree big enough that mounting a widget per node would be obviously
/// too slow/heavy for a mobile device — stands in for "a lot of nodes".
const _nodeCount = 3000;

class _LargeTreeRepository implements OutlineRepository {
  @override
  Future<List<OutlineNode>> loadTree() async {
    return List.generate(_nodeCount, (i) => OutlineNode(id: 'node-$i', text: 'Node $i'));
  }

  @override
  Future<void> saveTree(List<OutlineNode> roots) async {}
}

void main() {
  testWidgets('only renders rows near the viewport, regardless of tree size', (WidgetTester tester) async {
    // A fixed, phone-sized viewport so the expected number of visible rows
    // is bounded and predictable.
    tester.view.physicalSize = const Size(400, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final controller = OutlineController(repository: _LargeTreeRepository());
    addTearDown(controller.dispose);
    await tester.pumpWidget(MaterialApp(home: OutlineScreen(controller: controller)));
    await tester.pump();

    expect(controller.visibleRows, hasLength(_nodeCount), reason: 'the full tree is still held in memory');

    // 800 logical px of viewport at 44px per row is ~18 rows; allow
    // generous headroom for Flutter's cache extent above/below the
    // viewport without letting this regress to "renders everything".
    final mountedRows = find.byType(TextField).evaluate().length;
    expect(mountedRows, lessThan(100));
    expect(mountedRows, lessThan(_nodeCount));

    // Scrolling deep into the tree still only mounts a bounded window of
    // rows — proves this isn't just "small trees stay small", the list
    // stays virtualized at any scroll offset.
    await tester.fling(find.byType(ListView), const Offset(0, -100000), 8000);
    await tester.pumpAndSettle();

    expect(find.byType(TextField).evaluate().length, lessThan(100));
  });
}
