import 'package:flutter/material.dart';

import 'theme.dart';

class _Template {
  const _Template(this.id, this.title, this.description, this.enabled, this.preview);
  final String id;
  final String title;
  final String description;
  final bool enabled;
  final List<(int, bool, double)> preview;
}

const _templates = [
  _Template('blank', 'Blank', 'One empty line and a blinking cursor.', true, [(0, false, 0.4)]),
  _Template('project', 'Project', 'Goals, tasks and notes, nested three deep.', false, [
    (0, false, 0.5), (1, true, 0.6), (1, true, 0.45), (2, false, 0.4), (0, false, 0.35), (1, true, 0.55), //
  ]),
  _Template('journal', 'Journal', 'A page per day with today on top.', false, [
    (0, false, 0.3), (1, false, 0.7), (1, true, 0.5), (0, false, 0.3), (1, false, 0.6), //
  ]),
];

const _basics = [
  (Icons.keyboard_return, 'Type in the bar at the bottom to add a line.'),
  (Icons.open_with, 'Long-press a bullet and drag to move a line, or nest it under another.'),
  (Icons.touch_app_outlined, 'Tap a bullet to zoom into that line as its own page.'),
  (Icons.pan_tool_alt_outlined, 'Long-press a line to make it a task, duplicate or delete it.'),
  (Icons.search, 'Tap search to find anything and jump there.'),
  (Icons.code, 'Type / for commands: tasks, due dates and more.'),
];

const _steps = ['How it works', 'Start with', 'Heads up'];

class Onboarding extends StatefulWidget {
  const Onboarding({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  State<Onboarding> createState() => _OnboardingState();
}

class _OnboardingState extends State<Onboarding> {
  int step = 0;
  bool back = false;
  String template = 'blank';

  void _go(int to) => setState(() {
    back = to < step;
    step = to;
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final last = _steps.length - 1;
    return Scaffold(
      key: const Key('onboarding'),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(color: c.primary, borderRadius: BorderRadius.circular(7)),
                    alignment: Alignment.center,
                    child: Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: c.onPrimary),
                    ),
                  ),
                  const Spacer(),
                  _Stepper(current: step),
                ],
              ),
              const SizedBox(height: 28),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 280),
                  layoutBuilder: (current, previous) =>
                      Stack(alignment: Alignment.topLeft, children: [...previous, ?current]),
                  transitionBuilder: (child, animation) {
                    final incoming = child.key == ValueKey(step);
                    final dx = (incoming ? 1 : -1) * (back ? -0.15 : 0.15);
                    return FadeTransition(
                      opacity: animation,
                      child: SlideTransition(
                        position: Tween(begin: Offset(dx, 0), end: Offset.zero).animate(animation),
                        child: child,
                      ),
                    );
                  },
                  child: KeyedSubtree(
                    key: ValueKey(step),
                    child: SingleChildScrollView(child: _content(c)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Spacer(),
                  if (step > 0)
                    OutlinedButton(
                      key: const Key('onboarding-back'),
                      onPressed: () => _go(step - 1),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: c.ink,
                        side: BorderSide(color: c.border),
                        minimumSize: const Size(0, 46),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Back'),
                    ),
                  const SizedBox(width: 10),
                  FilledButton(
                    key: Key(step < last ? 'onboarding-continue' : 'onboarding-start'),
                    onPressed: () => step < last ? _go(step + 1) : widget.onDone(),
                    style: FilledButton.styleFrom(
                      backgroundColor: c.primary,
                      foregroundColor: c.onPrimary,
                      minimumSize: const Size(0, 46),
                      padding: const EdgeInsets.symmetric(horizontal: 22),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(step < last ? 'Continue' : 'Start writing'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _title(String title, String subtitle, CascadeColors c) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(title, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w600, letterSpacing: -0.5)),
      const SizedBox(height: 6),
      Text(subtitle, style: TextStyle(fontSize: 15, color: c.muted, height: 1.4)),
      const SizedBox(height: 22),
    ],
  );

  Widget _card(CascadeColors c, {required Widget child, Color? color, bool selected = false}) => AnimatedContainer(
    duration: const Duration(milliseconds: 150),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: color ?? c.surface,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: selected ? c.primary : c.border, width: selected ? 2 : 1),
    ),
    child: child,
  );

  Widget _content(CascadeColors c) {
    switch (step) {
      case 0:
        return Column(
          key: const Key('onboarding-step-intro'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _title('Everything is a line', 'Cascade is an outliner. Lines nest inside lines, as deep as you like.', c),
            _card(
              c,
              child: Column(
                children: [
                  for (final (icon, text) in _basics)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Container(
                            width: 34,
                            height: 30,
                            decoration: BoxDecoration(
                              color: c.canvas,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: c.border),
                            ),
                            child: Icon(icon, size: 16, color: c.ink),
                          ),
                          const SizedBox(width: 12),
                          Expanded(child: Text(text, style: const TextStyle(fontSize: 14.5, height: 1.35))),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        );
      case 1:
        return Column(
          key: const Key('onboarding-step-template'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _title('How do you want to start?', 'You can change everything later. Templates are just nodes.', c),
            for (final t in _templates)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Opacity(
                  opacity: t.enabled ? 1 : 0.4,
                  child: GestureDetector(
                    key: Key('onboarding-template-${t.id}'),
                    onTap: t.enabled ? () => setState(() => template = t.id) : null,
                    child: _card(
                      c,
                      selected: template == t.id,
                      child: Row(
                        children: [
                          Container(
                            width: 96,
                            height: 80,
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(color: c.canvas, borderRadius: BorderRadius.circular(9)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                for (final (depth, task, width) in t.preview.take(5))
                                  Padding(
                                    padding: EdgeInsets.only(left: depth * 9.0, bottom: 5),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 6,
                                          height: 6,
                                          decoration: BoxDecoration(shape: BoxShape.circle, color: c.inkSubtleHover),
                                        ),
                                        if (task) ...[
                                          const SizedBox(width: 3),
                                          Container(
                                            width: 6,
                                            height: 6,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              border: Border.all(color: c.borderStrong, width: 0.8),
                                            ),
                                          ),
                                        ],
                                        const SizedBox(width: 4),
                                        Container(
                                          width: 50 * width,
                                          height: 4,
                                          decoration: BoxDecoration(
                                            color: c.inkSubtle,
                                            borderRadius: BorderRadius.circular(3),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(t.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                                    const Spacer(),
                                    if (!t.enabled)
                                      Text(
                                        'Coming soon',
                                        style: TextStyle(fontSize: 11, color: c.muted, fontWeight: FontWeight.w500),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(t.description, style: TextStyle(color: c.muted, fontSize: 13.5, height: 1.4)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      default:
        return Column(
          key: const Key('onboarding-step-account'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _title('Still in development', 'Cascade is early. Expect rough edges.', c),
            _card(
              c,
              color: c.primaryMuted,
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Your outline is saved on this device: every edit lands here first, and it works fully offline.',
                    style: TextStyle(fontSize: 14.5, height: 1.55),
                  ),
                  SizedBox(height: 10),
                  Text('Templates, import and more are on the way.', style: TextStyle(fontSize: 14.5, height: 1.55)),
                ],
              ),
            ),
          ],
        );
    }
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({required this.current});
  final int current;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      key: const Key('onboarding-stepper'),
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < _steps.length; i++) ...[
          if (i > 0)
            Container(width: 14, height: 1, margin: const EdgeInsets.symmetric(horizontal: 6), color: c.borderStrong),
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: i < current ? c.primary : Colors.transparent,
              border: i < current
                  ? null
                  : Border.all(color: i == current ? c.primary : c.border, width: i == current ? 1.5 : 1),
            ),
            alignment: Alignment.center,
            child: i < current
                ? Icon(Icons.check, size: 12, color: c.onPrimary)
                : Text(
                    '${i + 1}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: i == current ? c.primary : c.muted,
                    ),
                  ),
          ),
          if (i == current) ...[
            const SizedBox(width: 6),
            Text(_steps[i], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          ],
        ],
      ],
    );
  }
}
