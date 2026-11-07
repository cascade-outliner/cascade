import 'package:flutter/material.dart';

import '../ai/split.dart' as ai;
import '../data/daily.dart';
import '../data/node.dart';
import 'capture_bar.dart';
import 'command_palette.dart';
import 'due_elsewhere.dart';
import 'header.dart';
import 'node_menu.dart';
import 'row.dart';
import 'slash_commands.dart';
import 'split_sheet.dart';
import 'store_scope.dart';
import 'theme.dart';
import 'widgets.dart';

class OutlineScreen extends StatefulWidget {
  const OutlineScreen({super.key});

  @override
  State<OutlineScreen> createState() => _OutlineScreenState();
}

class _OutlineScreenState extends State<OutlineScreen> {
  final history = <String?>[];
  String? zoomedId;
  bool forward = true;
  String? menuOpenId;
  String? captured;
  final captureKey = GlobalKey<CaptureBarState>();
  final editing = ValueNotifier<String?>(null);

  @override
  void initState() {
    super.initState();
    editing.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    editing.dispose();
    super.dispose();
  }

  void zoomTo(String? id) {
    if (id == zoomedId) return;
    editing.value = null;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      final store = StoreScope.read(context);
      int depth(String? n) => n == null ? -1 : store.ancestorsOf(n).length;
      forward = depth(id) >= depth(zoomedId);
      history.add(zoomedId);
      zoomedId = id;
      captured = null;
    });
  }

  void _back() {
    if (history.isEmpty) return;
    setState(() {
      forward = false;
      zoomedId = history.removeLast();
    });
  }

  void _split(String id) => showSplitSheet(context, id);

  void _menu(Node node, int childCount) async {
    setState(() => menuOpenId = node.id);
    await showNodeMenu(
      context,
      store: StoreScope.read(context),
      node: node,
      childCount: childCount,
      onZoomTo: zoomTo,
      onSplit: ai.aiEnabled ? _split : null,
    );
    if (mounted) setState(() => menuOpenId = null);
  }

  void _capture(String text, List<SlashCommand> picked) {
    final store = StoreScope.read(context);
    final id = store.create(zoomedId, text: text);
    for (final command in picked) {
      final node = store.get(id);
      if (node == null) continue;
      command.run(
        SlashContext(
          store: store,
          node: node,
          childCount: 0,
          zoomTo: zoomTo,
          copyLink: (id) => copyNodeLink(context, id),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = StoreScope.of(context);
    final c = context.colors;
    final id = zoomedId;
    final zoomed = id == null
        ? null
        : store.get(id) ??
              (isDayId(id) ? Node(id: id, parentId: null, order: '', text: dayTitle(dayDate(id)), updatedAt: 0) : null);
    final rows = store.rows(id);
    final editingNode = editing.value == null ? null : store.get(editing.value!);

    Widget body;
    if (id != null && zoomed == null) {
      body = ListView(
        padding: const EdgeInsets.all(16),
        children: [
          EmptyStateCard(
            key: const Key('node-not-found'),
            icon: Icons.link_off,
            title: 'Node not found',
            description: 'This node was deleted or the link is out of date. Its children, if it had any, went with it.',
            action: 'Back to the outline',
            onAction: () => zoomTo(null),
          ),
        ],
      );
    } else {
      body = ListView(
        key: PageStorageKey(id ?? 'home'),
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 140),
        children: [
          if (zoomed != null) _ZoomHeader(node: zoomed, locked: store.isLocked(zoomed.id)),
          if (rows.isEmpty) _empty(zoomed != null),
          for (final row in rows)
            OutlineRow(
              key: ValueKey(row.node.id),
              row: row,
              editing: editing,
              active: menuOpenId == row.node.id,
              onZoomTo: zoomTo,
              onMenu: _menu,
              onSplit: ai.aiEnabled ? _split : null,
              copyLink: (id) => copyNodeLink(context, id),
            ),
          if (id == dayId(DateTime.now()))
            DueElsewhere(
              groups: [('Due today, elsewhere', isoDay(DateTime.now())), ('Tomorrow', isoDay(shiftDay(null, 1)))],
              excluding: id!,
              onZoomTo: zoomTo,
            ),
        ],
      );
    }

    return PopScope(
      canPop: history.isEmpty,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        backgroundColor: c.canvas,
        body: SafeArea(
          child: Column(
            children: [
              OutlineHeader(
                zoomedId: id,
                onZoomTo: zoomTo,
                onSearch: () => showCommandPalette(context, zoomedId: id, onZoomTo: zoomTo),
              ),
              Expanded(
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 260),
                        switchInCurve: const Cubic(0.2, 0, 0, 1),
                        layoutBuilder: (current, previous) => current ?? const SizedBox.shrink(),
                        transitionBuilder: (child, animation) {
                          final incoming = child.key == ValueKey('page-$id');
                          final dy = (forward == incoming ? 1 : -1) * 0.04;
                          return FadeTransition(
                            opacity: animation,
                            child: SlideTransition(
                              position: Tween(begin: Offset(0, dy), end: Offset.zero).animate(animation),
                              child: child,
                            ),
                          );
                        },
                        child: KeyedSubtree(key: ValueKey('page-$id'), child: body),
                      ),
                    ),
                    Positioned(
                      left: 12,
                      right: 12,
                      bottom: 12,
                      child: editingNode != null
                          ? TextFieldTapRegion(
                              child: _EditToolbar(
                                node: editingNode,
                                onDone: () => editing.value = null,
                                onEdit: (id) => editing.value = id,
                              ),
                            )
                          : CaptureBar(
                              key: captureKey,
                              onSubmit: _capture,
                              onSplit: ai.aiEnabled ? (text) => setState(() => captured = text) : null,
                              panel: captured == null
                                  ? null
                                  : CaptureSplitPanel(
                                      key: ValueKey(captured),
                                      text: captured!,
                                      parentId: id,
                                      onClose: () {
                                        captureKey.currentState?.setText('');
                                        setState(() => captured = null);
                                      },
                                      onCancel: () {
                                        final text = captured!;
                                        setState(() => captured = null);
                                        captureKey.currentState?.setText(text);
                                      },
                                    ),
                            ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _empty(bool zoomed) {
    void focus() => captureKey.currentState?.focus();
    if (zoomed) {
      return EmptyStateCard(
        key: const Key('outline-empty-zoomed'),
        icon: Icons.zoom_in,
        title: 'No children',
        description: 'You have zoomed into a node with nothing inside it. Add steps, or zoom back out.',
        action: 'Add a step',
        onAction: focus,
      );
    }
    return Column(
      key: const Key('outline-empty'),
      children: [
        EmptyStateCard(
          icon: Icons.format_list_bulleted,
          title: 'Nothing here yet',
          description: 'Start typing to make the first node. Long-press a line to nest it under another.',
          action: 'Write the first line',
          onAction: focus,
        ),
        const EmptyStateCard(
          icon: Icons.account_tree_outlined,
          title: 'Zoom into anything',
          description: 'Tap a bullet to open that node as its own page. The breadcrumb takes you back out.',
        ),
        const EmptyStateCard(
          icon: Icons.touch_app_outlined,
          title: 'Long-press for more',
          description: 'Turn a node into a task, give it a due date, duplicate, move or delete it from its menu.',
        ),
      ],
    );
  }
}

class _ZoomHeader extends StatefulWidget {
  const _ZoomHeader({required this.node, required this.locked});
  final Node node;
  final bool locked;

  @override
  State<_ZoomHeader> createState() => _ZoomHeaderState();
}

class _ZoomHeaderState extends State<_ZoomHeader> {
  late final controller = TextEditingController(text: widget.node.text);
  final focus = FocusNode();

  @override
  void didUpdateWidget(_ZoomHeader old) {
    super.didUpdateWidget(old);
    if (!focus.hasFocus && controller.text != widget.node.text) controller.text = widget.node.text;
  }

  @override
  void dispose() {
    controller.dispose();
    focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final label = relativeDay(widget.node.id);
    const style = TextStyle(fontSize: 28, fontWeight: FontWeight.w600, letterSpacing: -0.5, height: 1.2);
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 0, 10, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.locked)
            Text(label ?? widget.node.text, key: const Key('zoom-title'), style: style)
          else
            TextField(
              key: const Key('zoom-title'),
              controller: controller,
              focusNode: focus,
              maxLines: null,
              style: style.copyWith(color: c.ink),
              onChanged: (text) => StoreScope.read(context).setText(widget.node.id, text),
              decoration: InputDecoration(
                isCollapsed: true,
                border: InputBorder.none,
                hintText: 'Untitled',
                hintStyle: style.copyWith(color: c.placeholder),
              ),
            ),
          if (label != null) ...[
            const SizedBox(height: 4),
            Text(
              '${widget.node.text}, ${monthNames[dayDate(widget.node.id).month - 1]} ${dayDate(widget.node.id).year}',
              style: TextStyle(color: c.muted, fontSize: 14),
            ),
          ],
        ],
      ),
    );
  }
}

class _EditToolbar extends StatelessWidget {
  const _EditToolbar({required this.node, required this.onDone, required this.onEdit});
  final Node node;
  final VoidCallback onDone;
  final void Function(String id) onEdit;

  @override
  Widget build(BuildContext context) {
    final store = StoreScope.of(context);
    final c = context.colors;
    Widget button(String key, IconData icon, String tooltip, VoidCallback? onTap) => IconButton(
      key: Key('toolbar-$key'),
      tooltip: tooltip,
      icon: Icon(icon, size: 20),
      color: c.ink,
      disabledColor: c.placeholder,
      onPressed: onTap,
    );
    return Container(
      key: const Key('edit-toolbar'),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: c.border),
        boxShadow: const [BoxShadow(color: Color(0x40192036), blurRadius: 30, offset: Offset(0, 10), spreadRadius: -8)],
      ),
      child: Row(
        children: [
          button(
            'outdent',
            Icons.format_indent_decrease,
            'Outdent',
            store.canOutdent(node.id) ? () => store.outdent(node.id) : null,
          ),
          button(
            'indent',
            Icons.format_indent_increase,
            'Indent',
            store.canIndent(node.id) ? () => store.indent(node.id) : null,
          ),
          button(
            'task',
            node.task == null ? Icons.radio_button_unchecked : Icons.circle,
            node.task == null ? 'Turn into task' : 'Turn into text',
            () => store.setTask(node.id, node.task == null ? const Task(done: false) : null),
          ),
          button('add-child', Icons.subdirectory_arrow_right, 'Add child', () {
            store.setCollapsed(node.id, false);
            onEdit(store.create(node.id));
          }),
          const Spacer(),
          TextButton(
            key: const Key('toolbar-done'),
            onPressed: onDone,
            child: Text(
              'Done',
              style: TextStyle(color: c.info, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
