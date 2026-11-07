import 'package:cascade/data/persistence.dart';
import 'package:cascade/data/store.dart';
import 'package:cascade/ui/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'touch_indicator.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('run through Cascade', (tester) async {
    final store = OutlineStore(MemoryPersistence());
    await store.ready;

    Future<void> pause([int ms = 900]) async {
      await Future<void>.delayed(Duration(milliseconds: ms));
      await tester.pump();
    }

    String idOf(String text) => store.nodes.values.firstWhere((n) => n.text == text).id;

    Future<void> tap(Finder finder, [int after = 900]) async {
      expect(finder, findsOneWidget);
      await tester.tap(finder);
      await pause(after);
    }

    Future<void> type(Finder field, String text, {int step = 45}) async {
      final start = tester.widget<TextField>(field).controller?.text ?? '';
      for (var i = 1; i <= text.length; i++) {
        await tester.enterText(field, start + text.substring(0, i));
        await Future<void>.delayed(Duration(milliseconds: step));
        await tester.pump();
      }
      await pause(400);
    }

    final capture = find.byKey(const Key('capture-input'));
    Future<void> submit() async {
      await tester.tap(find.byKey(const Key('capture-submit')));
      await pause(800);
    }

    Future<void> menu(String text, String action) async {
      await tester.longPress(find.text(text).first);
      await pause(1100);
      await tap(find.byKey(Key('menu-$action')), 1000);
    }

    Future<void> drag(Finder from, Offset to) async {
      final start = tester.getCenter(from);
      final gesture = await tester.startGesture(start);
      await pause(800);
      final delta = to - start;
      for (var i = 0; i < 24; i++) {
        await gesture.moveBy(delta / 24);
        await Future<void>.delayed(const Duration(milliseconds: 35));
        await tester.pump();
      }
      await pause(500);
      await gesture.up();
      await pause(1000);
    }

    final rowInput = find.byWidgetPredicate(
      (w) => w is TextField && w.key is ValueKey<String> && (w.key! as ValueKey<String>).value.startsWith('row-input'),
    );

    await tester.pumpWidget(
      TouchIndicator(
        child: CascadeApp(store: store, themeMode: ThemeMode.light),
      ),
    );
    await pause(1800);

    await tap(find.byKey(const Key('onboarding-continue')), 1600);
    await tap(find.byKey(const Key('onboarding-continue')), 1600);
    await tap(find.byKey(const Key('onboarding-start')), 1600);

    await tap(capture, 500);
    await type(capture, 'Plan the product launch');
    await submit();
    await type(capture, 'Write release notes /task');
    await pause(900);
    await tap(find.byKey(const Key('slash-turn-into-task')), 600);
    await submit();
    await type(capture, 'Email beta testers /tom');
    await pause(700);
    await tap(find.byKey(const Key('slash-due-tomorrow')), 600);
    await type(capture, ' /task');
    await tap(find.byKey(const Key('slash-turn-into-task')), 600);
    await submit();
    await type(capture, 'Book a venue for the party');
    await submit();
    await type(capture, 'Ideas');
    await submit();
    FocusManager.instance.primaryFocus?.unfocus();
    await pause(800);

    await menu('Write release notes', 'indent');
    await menu('Email beta testers', 'indent');
    await tap(find.byKey(Key('task-${idOf('Write release notes')}')));

    await tap(find.byKey(Key('chevron-${idOf('Plan the product launch')}')), 1000);
    await tap(find.byKey(Key('chevron-${idOf('Plan the product launch')}')), 1000);

    await tap(find.text('Book a venue for the party'), 700);
    await type(rowInput, ' /due to');
    await pause(800);
    await tap(find.byKey(const Key('slash-due-today')), 900);
    await tap(find.byKey(const Key('toolbar-done')), 900);

    final ideas = idOf('Ideas');
    await drag(
      find.byKey(Key('bullet-${idOf('Book a venue for the party')}')),
      tester.getTopLeft(find.byKey(Key('row-${idOf('Plan the product launch')}'))) + const Offset(80, 4),
    );
    await drag(
      find.byKey(Key('bullet-${idOf('Book a venue for the party')}')),
      tester.getBottomLeft(find.byKey(Key('row-$ideas'))) + const Offset(150, -6),
    );

    await tap(find.byKey(Key('bullet-$ideas')), 1400);
    await tap(capture, 400);
    await type(capture, 'Dark mode for the mobile app');
    await submit();
    await type(capture, 'Offline sync /due');
    await pause(600);
    await tap(find.byKey(const Key('slash-due-next-week')), 500);
    await submit();
    FocusManager.instance.primaryFocus?.unfocus();
    await pause(800);
    await tap(find.byKey(const Key('zoom-title')), 500);
    await type(find.byKey(const Key('zoom-title')), ' & roadmap');
    FocusManager.instance.primaryFocus?.unfocus();
    await pause(700);
    await tap(find.byKey(const Key('header-home')), 1400);

    await menu('Plan the product launch', 'duplicate-children');
    await pause(600);
    await tester.longPress(find.text('Plan the product launch').last);
    await pause(1000);
    await tap(find.byKey(const Key('menu-delete')), 1200);

    await tap(find.byKey(const Key('header-search')), 900);
    final palette = find.byKey(const Key('palette-input'));
    await type(palette, 'beta email', step: 70);
    await pause(1400);
    await tap(find.byKey(Key('palette-node-${idOf('Email beta testers')}')), 1600);
    await tap(find.text('Home'), 1300);

    await tap(find.byKey(const Key('header-search')), 900);
    await type(palette, 'Team offsite');
    await pause(900);
    await tap(find.byKey(const Key('palette-create')), 1000);

    await tap(find.byKey(const Key('header-search')), 900);
    await tap(find.byKey(const Key('palette-today')), 1800);
    await tap(capture, 400);
    await type(capture, 'Standup at 10 /task');
    await tap(find.byKey(const Key('slash-turn-into-task')), 500);
    await submit();
    await type(capture, 'Review launch checklist');
    await submit();
    FocusManager.instance.primaryFocus?.unfocus();
    await pause(1500);

    await tap(find.byKey(const Key('day-older')), 1300);
    await tap(find.byKey(const Key('strip-previous')), 1300);
    await tap(find.byKey(const Key('strip-3')), 1300);
    await tap(find.byKey(const Key('day-switcher')), 1300);
    final pick = DateTime.now().add(const Duration(days: 3));
    final key = 'calendar-${pick.year}-${pick.month.toString().padLeft(2, '0')}-${pick.day.toString().padLeft(2, '0')}';
    if (find.byKey(Key(key)).evaluate().isEmpty) {
      await tap(find.byTooltip('Next month'), 700);
    }
    await tap(find.byKey(Key(key)), 1300);
    await tap(find.text('Daily nodes'), 1300);
    await tap(find.byKey(const Key('header-home')), 1500);

    await tester.pumpWidget(
      TouchIndicator(
        child: CascadeApp(store: store, themeMode: ThemeMode.dark),
      ),
    );
    await pause(2000);
    await tap(find.byKey(const Key('header-search')), 900);
    await tap(find.byKey(const Key('palette-today')), 2200);
    await tap(find.byKey(const Key('header-home')), 2500);

    expect(store.nodes.values.where((n) => n.text == 'Plan the product launch'), hasLength(1));
    expect(store.get(idOf('Email beta testers'))!.parentId, idOf('Plan the product launch'));
    expect(store.get(idOf('Book a venue for the party'))!.parentId, ideas);
    expect(store.get(idOf('Write release notes'))!.task!.done, isTrue);
  });
}
