import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('shows the seeded outline nodes', (WidgetTester tester) async {
    await tester.pumpWidget(const CascadeApp());

    expect(find.text('Welcome to Cascade'), findsOneWidget);
    expect(find.text('This is a second top-level node'), findsOneWidget);
  });

  testWidgets('collapsing a node hides its children', (WidgetTester tester) async {
    await tester.pumpWidget(const CascadeApp());

    expect(find.text('Tap the chevron to expand or collapse a node'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.expand_more).first);
    await tester.pump();

    expect(find.text('Tap the chevron to expand or collapse a node'), findsNothing);
  });

  testWidgets('tapping the FAB adds a new empty root node', (WidgetTester tester) async {
    await tester.pumpWidget(const CascadeApp());

    final textFieldsBefore = find.byType(TextField).evaluate().length;

    await tester.tap(find.byIcon(Icons.add).last);
    await tester.pump();

    final textFieldsAfter = find.byType(TextField).evaluate().length;
    expect(textFieldsAfter, textFieldsBefore + 1);
  });
}
