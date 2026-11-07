import 'package:flutter/material.dart';

import '../data/daily.dart';
import '../data/search.dart';
import 'theme.dart';

class LogoMark extends StatelessWidget {
  const LogoMark({super.key, this.size = 24});
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return CustomPaint(size: Size.square(size), painter: _LogoPainter(c.primary, c.canvas));
  }
}

class _LogoPainter extends CustomPainter {
  _LogoPainter(this.bg, this.fg);
  final Color bg;
  final Color fg;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 24;
    canvas.drawRRect(RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(6 * s)), Paint()..color = bg);
    final paint = Paint()..color = fg;
    for (final (x, y, w) in [(4.75, 6.75, 12.5), (7.25, 11.0, 9.25), (9.5, 15.25, 6.75)]) {
      canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(x * s, y * s, w * s, 2 * s), Radius.circular(s)), paint);
    }
  }

  @override
  bool shouldRepaint(_LogoPainter old) => old.bg != bg || old.fg != fg;
}

class Bullet extends StatelessWidget {
  const Bullet({super.key, required this.collapsed, this.onTap});
  final bool collapsed;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: SizedBox(
        width: 28,
        height: 32,
        child: Center(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: collapsed ? 18 : 7,
            height: collapsed ? 18 : 7,
            decoration: BoxDecoration(shape: BoxShape.circle, color: collapsed ? c.inkSubtleHover : c.ink),
            alignment: Alignment.center,
            child: collapsed
                ? Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: c.ink),
                  )
                : null,
          ),
        ),
      ),
    );
  }
}

class Chevron extends StatelessWidget {
  const Chevron({super.key, required this.open, required this.hidden, this.onTap});
  final bool open;
  final bool hidden;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    if (hidden) return const SizedBox(width: 22);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: SizedBox(
        width: 22,
        height: 32,
        child: AnimatedRotation(
          turns: open ? 0.25 : 0,
          duration: const Duration(milliseconds: 150),
          child: Icon(Icons.chevron_right, size: 18, color: context.colors.muted),
        ),
      ),
    );
  }
}

class TaskMarker extends StatelessWidget {
  const TaskMarker({super.key, required this.done, this.onTap});
  final bool done;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      checked: done,
      label: done ? 'Mark as not done' : 'Mark as done',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          width: 28,
          height: 32,
          child: Center(
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: done ? c.primary : Colors.transparent,
                border: Border.all(color: done ? c.primary : c.borderStrong, width: 1.5),
              ),
              child: done ? Icon(Icons.check, size: 12, color: c.onPrimary) : null,
            ),
          ),
        ),
      ),
    );
  }
}

class DuePill extends StatelessWidget {
  const DuePill({super.key, required this.due});
  final String due;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final urgent = due.compareTo(isoDay(DateTime.now())) <= 0;
    return Container(
      key: const Key('due-pill'),
      margin: const EdgeInsets.only(left: 6, top: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: urgent ? c.primary : c.infoMuted, borderRadius: BorderRadius.circular(999)),
      child: Text(
        dueLabel(due),
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: urgent ? c.onPrimary : c.info),
      ),
    );
  }
}

class HighlightedText extends StatelessWidget {
  const HighlightedText({super.key, required this.text, required this.ranges, this.style, this.maxLines});
  final String text;
  final List<TextRange> ranges;
  final TextStyle? style;
  final int? maxLines;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final spans = <TextSpan>[];
    var at = 0;
    for (final (start, end) in ranges) {
      if (start > at) spans.add(TextSpan(text: text.substring(at, start)));
      spans.add(
        TextSpan(
          text: text.substring(start, end.clamp(start, text.length)),
          style: TextStyle(backgroundColor: c.infoMuted, color: c.info, fontWeight: FontWeight.w600),
        ),
      );
      at = end;
    }
    if (at < text.length) spans.add(TextSpan(text: text.substring(at)));
    return Text.rich(
      TextSpan(style: style, children: spans),
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
    );
  }
}

class EmptyStateCard extends StatelessWidget {
  const EmptyStateCard({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.action,
    this.onAction,
  });
  final IconData icon;
  final String title;
  final String description;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: c.inkSubtle, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 20, color: c.ink),
          ),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 4),
          Text(description, style: TextStyle(color: c.muted, height: 1.45)),
          if (action != null) ...[
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: onAction,
              style: OutlinedButton.styleFrom(
                foregroundColor: c.ink,
                side: BorderSide(color: c.border),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(action!),
            ),
          ],
        ],
      ),
    );
  }
}

class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.trailing});
  final String text;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 0, 10, 8),
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.border)),
      ),
      child: Row(
        children: [
          Text(
            text.toUpperCase(),
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 1, color: c.muted),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 8),
            Text(trailing!, style: TextStyle(fontSize: 11, color: c.placeholder)),
          ],
        ],
      ),
    );
  }
}
