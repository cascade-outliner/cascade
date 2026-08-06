import 'package:flutter/widgets.dart';

/// Owns the ephemeral, per-row editing state — `TextEditingController`s and
/// `FocusNode`s keyed by node id — that has to survive rebuilds but has no
/// place in `OutlineController`: it's about how a row is currently being
/// edited on screen, not about the tree itself. Kept as its own class
/// (rather than raw maps on the screen's `State`) so lifecycle rules
/// (create-on-first-use, dispose-on-removal, dispose-all-on-teardown) live
/// in one place instead of being re-derived at each call site.
class OutlineRowEditingControllers {
  final _textControllers = <String, TextEditingController>{};
  final _focusNodes = <String, FocusNode>{};

  TextEditingController textControllerFor(String id, {required String initialText}) {
    return _textControllers.putIfAbsent(id, () => TextEditingController(text: initialText));
  }

  FocusNode focusNodeFor(String id) {
    return _focusNodes.putIfAbsent(id, FocusNode.new);
  }

  void requestFocus(String id) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      focusNodeFor(id).requestFocus();
    });
  }

  void disposeFor(Iterable<String> ids) {
    for (final id in ids) {
      _textControllers.remove(id)?.dispose();
      _focusNodes.remove(id)?.dispose();
    }
  }

  void disposeAll() {
    for (final controller in _textControllers.values) {
      controller.dispose();
    }
    for (final focusNode in _focusNodes.values) {
      focusNode.dispose();
    }
    _textControllers.clear();
    _focusNodes.clear();
  }
}
