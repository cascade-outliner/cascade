import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/features/outline/application/outline_controller.dart';
import 'package:mobile/features/outline/data/in_memory_outline_repository.dart';
import 'package:mobile/main.dart';

OutlineController _controller() {
  final controller = OutlineController(repository: InMemoryOutlineRepository());
  addTearDown(controller.dispose);
  return controller;
}

void main() {
  testWidgets('shows the seeded outline nodes', (WidgetTester tester) async {
    await tester.pumpWidget(CascadeApp(controller: _controller()));
    await tester.pump();

    expect(find.text('Welcome to Cascade'), findsOneWidget);
    expect(find.text('This is a second top-level node'), findsOneWidget);
  });

  testWidgets('collapsing a node hides its children', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(CascadeApp(controller: _controller()));
    await tester.pump();

    expect(
      find.text('Tap the chevron to expand or collapse a node'),
      findsOneWidget,
    );

    await tester.tap(find.byTooltip('Collapse').first);
    await tester.pump();

    expect(
      find.text('Tap the chevron to expand or collapse a node'),
      findsNothing,
    );

    // Flushes the debounced persist timer the tap above scheduled, so it
    // doesn't outlive the test.
    await tester.pump(const Duration(milliseconds: 500));
  });

  testWidgets('tapping the add button adds a new empty root node', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(CascadeApp(controller: _controller()));
    await tester.pump();

    final textFieldsBefore = find.byType(TextField).evaluate().length;

    await tester.tap(find.byTooltip('Add node').first);
    await tester.pump();

    final textFieldsAfter = find.byType(TextField).evaluate().length;
    expect(textFieldsAfter, textFieldsBefore + 1);

    // Flushes the debounced persist timer the tap above scheduled, so it
    // doesn't outlive the test.
    await tester.pump(const Duration(milliseconds: 500));
  });

  testWidgets('focus subtree opens a new page with only that node branch', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(CascadeApp(controller: _controller()));
    await tester.pump();

    await tester.tap(find.byTooltip('Focus subtree').first);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('outline-header-title')), findsOneWidget);
    expect(
      (tester.widget<Text>(find.byKey(const Key('outline-header-title')))).data,
      'Welcome to Cascade',
    );
    expect(find.text('Focused node'), findsNothing);
    expect(
      find.text('Tap the chevron to expand or collapse a node'),
      findsOneWidget,
    );
    expect(find.text('This is a second top-level node'), findsNothing);
  });
}
