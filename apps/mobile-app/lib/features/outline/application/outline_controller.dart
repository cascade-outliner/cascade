import 'dart:async';

import 'package:flutter/foundation.dart';

import '../data/outline_repository.dart';
import '../domain/outline_node.dart';
import '../domain/outline_tree.dart' as tree;

/// Default `persistDebounce` (see `OutlineController`): how long to wait
/// after the last edit before persisting, so a burst of keystrokes (or
/// several structural edits in quick succession) collapses into a single
/// `saveTree` write instead of one per change.
const _defaultPersistDebounce = Duration(milliseconds: 400);

/// Owns the outline tree's state and every operation that can change it.
///
/// This is the single source of truth for the tree: `OutlineScreen` only
/// reads from it (via `roots`/`visibleRows`) and calls its command methods
/// (`addChild`, `indent`, `delete`, ...) — it never mutates a node
/// directly. That keeps the editing rules in one, widget-free place (this
/// class delegates the actual tree surgery to the pure functions in
/// `outline_tree.dart`) so they can grow — undo/redo, optimistic
/// server sync, multi-select — without the presentation layer changing.
///
/// Every command that changes the tree also schedules a debounced
/// `OutlineRepository.saveTree` call so edits survive app restarts; see
/// `_schedulePersist`.
class OutlineController extends ChangeNotifier {
  OutlineController({
    required OutlineRepository repository,
    OutlineIdGenerator? idGenerator,
    this.persistDebounce = _defaultPersistDebounce,
  }) : _repository = repository,
       _idGenerator = idGenerator ?? OutlineIdGenerator();

  final OutlineRepository _repository;
  final OutlineIdGenerator _idGenerator;

  /// How long to wait after the last edit before persisting. Overridable
  /// (down to `Duration.zero`) so tests don't have to wait out the real
  /// default to observe a persist.
  final Duration persistDebounce;

  List<OutlineNode> _roots = [];
  bool _isLoading = false;
  Object? _error;
  Timer? _persistTimer;

  bool get isLoading => _isLoading;
  Object? get error => _error;
  List<OutlineNode> get roots => List.unmodifiable(_roots);
  List<tree.VisibleOutlineRow> get visibleRows => tree.flattenVisible(_roots);

  Future<void> load() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _roots = await _repository.loadTree();
    } catch (e) {
      _error = e;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Updates a node's text. Deliberately doesn't `notifyListeners` — text
  /// edits don't change which rows are visible or how they're laid out, so
  /// there's nothing for the row list to rebuild for. The text field's own
  /// `TextEditingController` (owned by the presentation layer) already
  /// reflects what the user typed. Still schedules a persist, since the
  /// text itself did change.
  void updateText(String id, String text) {
    if (tree.setNodeText(_roots, id, text)) _schedulePersist();
  }

  void toggleExpanded(String id) {
    if (tree.toggleExpanded(_roots, id)) {
      notifyListeners();
      _schedulePersist();
    }
  }

  String addRoot() {
    final node = OutlineNode(id: _idGenerator.next());
    _roots.add(node);
    notifyListeners();
    _schedulePersist();
    return node.id;
  }

  String addSiblingAfter(String id) {
    final node = OutlineNode(id: _idGenerator.next());
    tree.insertSiblingAfter(_roots, id, node);
    notifyListeners();
    _schedulePersist();
    return node.id;
  }

  String addChild(String id) {
    final node = OutlineNode(id: _idGenerator.next());
    tree.insertChild(_roots, id, node);
    notifyListeners();
    _schedulePersist();
    return node.id;
  }

  void indent(String id) {
    if (tree.indentNode(_roots, id)) {
      notifyListeners();
      _schedulePersist();
    }
  }

  void outdent(String id) {
    if (tree.outdentNode(_roots, id)) {
      notifyListeners();
      _schedulePersist();
    }
  }

  /// Deletes a node (and its subtree), returning every removed node's id so
  /// the presentation layer can dispose of any per-node UI state (text
  /// controllers, focus nodes) it was keeping for them.
  List<String> delete(String id) {
    final removed = tree.deleteNode(_roots, id);
    if (removed == null) return const [];
    notifyListeners();
    _schedulePersist();
    return tree.subtreeOf(removed).map((node) => node.id).toList();
  }

  /// Debounces `saveTree` calls: each call cancels any pending one and
  /// restarts the timer, so a run of edits (e.g. typing) only persists once
  /// the tree has been quiet for `persistDebounce`. `saveTree` always reads
  /// `_roots` at the time it actually runs, so a call left stale by a newer
  /// one still ends up writing current state, not outdated state.
  void _schedulePersist() {
    _persistTimer?.cancel();
    _persistTimer = Timer(persistDebounce, () {
      unawaited(_persist());
    });
  }

  Future<void> _persist() async {
    try {
      await _repository.saveTree(_roots);
    } catch (e) {
      _error = e;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _persistTimer?.cancel();
    super.dispose();
  }
}
