import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/outline/presentation/outline_row.dart';

void main() {
  testWidgets('shows add below and delete in the trailing menu', (tester) async {
    final controller = TextEditingController();
    final focusNode = FocusNode();
    addTearDown(controller.dispose);
    addTearDown(focusNode.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OutlineRow(
            depth: 0,
            hasChildren: false,
            expanded: false,
            controller: controller,
            focusNode: focusNode,
            onToggleExpanded: () {},
            onChanged: (_) {},
            onSubmitted: () {},
            onIndent: () {},
            onOutdent: () {},
            onAddInside: () {},
            onAddBelow: () {},
            onDelete: () {},
          ),
        ),
      ),
    );

    await tester.tap(find.byTooltip('More actions'));
    await tester.pumpAndSettle();

    expect(find.text('Add inside'), findsOneWidget);
    expect(find.text('Add below'), findsOneWidget);
    expect(find.text('Delete'), findsOneWidget);
  });

  test('menu actions invoke the matching callbacks', () {
    var addInsideTapped = false;
    var addBelowTapped = false;
    var deleteTapped = false;

    handleOutlineRowAction(
      OutlineRowAction.addInside,
      onAddInside: () => addInsideTapped = true,
      onAddBelow: () => addBelowTapped = true,
      onDelete: () => deleteTapped = true,
    );

    expect(addInsideTapped, isTrue);
    expect(addBelowTapped, isFalse);
    expect(deleteTapped, isFalse);

    handleOutlineRowAction(
      OutlineRowAction.addBelow,
      onAddInside: () => addInsideTapped = true,
      onAddBelow: () => addBelowTapped = true,
      onDelete: () => deleteTapped = true,
    );

    expect(addBelowTapped, isTrue);
    expect(deleteTapped, isFalse);

    handleOutlineRowAction(
      OutlineRowAction.delete,
      onAddInside: () => addInsideTapped = true,
      onAddBelow: () => addBelowTapped = true,
      onDelete: () => deleteTapped = true,
    );
    expect(deleteTapped, isTrue);
  });
}
