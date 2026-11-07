import 'package:flutter/material.dart';

import 'slash_commands.dart';
import 'theme.dart';

class CaptureBar extends StatefulWidget {
  const CaptureBar({
    super.key,
    required this.onSubmit,
    this.onSplit,
    this.panel,
    this.placeholder = 'Capture a thought…',
  });

  final void Function(String text, List<SlashCommand> picked) onSubmit;
  final void Function(String text)? onSplit;
  final Widget? panel;
  final String placeholder;

  @override
  State<CaptureBar> createState() => CaptureBarState();
}

class CaptureBarState extends State<CaptureBar> {
  final controller = TextEditingController();
  final focusNode = FocusNode();
  final picked = <SlashCommand>[];
  String? slashQuery;

  void focus() => focusNode.requestFocus();

  void setText(String text) {
    controller.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
    setState(() {});
    focus();
  }

  @override
  void dispose() {
    controller.dispose();
    focusNode.dispose();
    super.dispose();
  }

  List<SlashCommand> get _items =>
      slashQuery == null ? const [] : filterSlash(captureSlashCommands.where((c) => !picked.contains(c)), slashQuery!);

  void _onChanged(String text) {
    setState(
      () => slashQuery = slashQueryBefore(
        text,
        controller.selection.baseOffset,
        captureSlashCommands.where((c) => !picked.contains(c)),
      ),
    );
  }

  void _pick(SlashCommand command) {
    final (text, caret) = removeSlashQuery(controller.text, controller.selection.baseOffset);
    controller.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: caret),
    );
    setState(() {
      picked.add(command);
      slashQuery = null;
    });
    focus();
  }

  void _submit() {
    if (slashQuery != null && _items.isNotEmpty) {
      _pick(_items.first);
      return;
    }
    final text = controller.text.trim();
    if (text.isEmpty) {
      focus();
      return;
    }
    final commands = [...picked];
    controller.clear();
    setState(() {
      picked.clear();
      slashQuery = null;
    });
    widget.onSubmit(text, commands);
    focus();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasText = controller.text.trim().isNotEmpty;
    return TextFieldTapRegion(
      child: Container(
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: focusNode.hasFocus ? c.info.withValues(alpha: 0.4) : c.border),
          boxShadow: const [
            BoxShadow(color: Color(0x40192036), blurRadius: 30, offset: Offset(0, 10), spreadRadius: -8),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AnimatedSize(
              duration: const Duration(milliseconds: 220),
              curve: const Cubic(0.2, 0, 0, 1),
              alignment: Alignment.bottomCenter,
              child: widget.panel ?? const SizedBox(width: double.infinity),
            ),
            if (slashQuery != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: SlashMenu(key: const Key('capture-slash-menu'), items: _items, onSelect: _pick, maxHeight: 240),
              ),
            if (picked.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final command in picked)
                      InputChip(
                        key: Key('capture-chip-${command.id}'),
                        avatar: Icon(command.icon, size: 14),
                        label: Text(command.label, style: const TextStyle(fontSize: 12)),
                        visualDensity: VisualDensity.compact,
                        side: BorderSide(color: c.border),
                        backgroundColor: c.inkSubtle,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                        onDeleted: () => setState(() => picked.remove(command)),
                      ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 8, 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 14, right: 10),
                    child: Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: c.placeholder),
                    ),
                  ),
                  Expanded(
                    child: Focus(
                      onFocusChange: (_) => setState(() {}),
                      child: TextField(
                        key: const Key('capture-input'),
                        controller: controller,
                        focusNode: focusNode,
                        minLines: 1,
                        maxLines: 5,
                        textInputAction: TextInputAction.send,
                        onChanged: _onChanged,
                        onSubmitted: (_) => _submit(),
                        style: TextStyle(fontSize: 16, color: c.ink),
                        decoration: InputDecoration(
                          hintText: widget.placeholder,
                          hintStyle: TextStyle(color: c.placeholder),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ),
                  if (widget.onSplit != null && hasText)
                    IconButton(
                      key: const Key('capture-split'),
                      tooltip: 'Break into steps',
                      icon: Icon(Icons.auto_awesome_outlined, color: c.highlight),
                      onPressed: () => widget.onSplit!(controller.text.trim()),
                    ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: hasText ? c.primary : c.primaryMuted,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: IconButton(
                        key: const Key('capture-submit'),
                        padding: EdgeInsets.zero,
                        tooltip: 'Add',
                        icon: Icon(Icons.arrow_upward, size: 18, color: hasText ? c.onPrimary : c.placeholder),
                        onPressed: hasText ? _submit : null,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
