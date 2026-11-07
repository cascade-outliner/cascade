import 'package:flutter/material.dart';

class TouchIndicator extends StatefulWidget {
  const TouchIndicator({super.key, required this.child});
  final Widget child;

  @override
  State<TouchIndicator> createState() => _TouchIndicatorState();
}

class _TouchIndicatorState extends State<TouchIndicator> with SingleTickerProviderStateMixin {
  Offset? position;
  bool down = false;
  late final fade = AnimationController(vsync: this, duration: const Duration(milliseconds: 450));

  @override
  void dispose() {
    fade.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Listener(
        behavior: HitTestBehavior.translucent,
        onPointerDown: (e) => setState(() {
          position = e.position;
          down = true;
          fade.value = 1;
        }),
        onPointerMove: (e) => setState(() => position = e.position),
        onPointerUp: (e) {
          setState(() => down = false);
          fade.reverse(from: 1);
        },
        child: Stack(
          children: [
            widget.child,
            if (position != null)
              AnimatedBuilder(
                animation: fade,
                builder: (context, _) => Positioned(
                  left: position!.dx - 22,
                  top: position!.dy - 22,
                  child: IgnorePointer(
                    child: Opacity(
                      opacity: fade.value,
                      child: AnimatedScale(
                        scale: down ? 1 : 1.3,
                        duration: const Duration(milliseconds: 200),
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0x550177BB),
                            border: Border.all(color: const Color(0xAA0177BB), width: 2),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
