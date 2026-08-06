import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/features/outline/application/outline_controller.dart';
import 'package:mobile/features/outline/data/in_memory_outline_repository.dart';
import 'package:mobile/main.dart';

OutlineController _controller() => OutlineController(repository: InMemoryOutlineRepository());

void main() {
  testWidgets('shows the seeded outline nodes', (WidgetTester tester) async {
    await tester.pumpWidget(CascadeApp(controller: _controller()));
    await tester.pump();

    expect(find.text('Welcome to Cascade'), findsOneWidget);
    expect(find.text('This is a second top-level node'), findsOneWidget);
  });

  testWidgets('collapsing a node hides its children', (WidgetTester tester) async {
    await tester.pumpWidget(CascadeApp(controller: _controller()));
    await tester.pump();

    expect(find.text('Tap the chevron to expand or collapse a node'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.expand_more).first);
    await tester.pump();

    expect(find.text('Tap the chevron to expand or collapse a node'), findsNothing);
  });

  testWidgets('tapping the FAB adds a new empty root node', (WidgetTester tester) async {
    await tester.pumpWidget(CascadeApp(controller: _controller()));
    await tester.pump();

    final textFieldsBefore = find.byType(TextField).evaluate().length;

    await tester.tap(find.byIcon(Icons.add).last);
    await tester.pump();

    final textFieldsAfter = find.byType(TextField).evaluate().length;
    expect(textFieldsAfter, textFieldsBefore + 1);
  });
}
