import 'dart:math';

import 'package:flutter/foundation.dart';

import 'daily.dart';
import 'node.dart';
import 'order.dart';
import 'persistence.dart';
import 'search.dart';

typedef Children = Map<String?, List<Node>>;

final _random = Random();

String newId() {
  String hex(int n) => List.generate(n, (_) => _random.nextInt(16).toRadixString(16)).join();
  return '${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}';
}

class OutlineStore extends ChangeNotifier {
  OutlineStore([OutlinePersistence? persistence]) : _persistence = persistence ?? MemoryPersistence() {
    ready = _load();
  }

  final OutlinePersistence _persistence;
  final Map<String, Node> nodes = {};
  late final Future<void> ready;
  bool loaded = false;
  bool onboarded = false;
  Children? _tree;

  int get size => nodes.length;

  Node? get(String id) => nodes[id];

  Children get tree => _tree ??= _index();

  Children _index() {
    final groups = <String?, List<Node>>{};
    for (final node in nodes.values) {
      (groups[node.parentId] ??= []).add(node);
    }
    for (final siblings in groups.values) {
      siblings.sort(byOrder);
    }
    return groups;
  }

  List<Node> childrenOf(String? parentId) => tree[parentId] ?? const [];

  int indexOf(Node node) => childrenOf(node.parentId).indexOf(node);

  List<OutlineRowData> rows([String? rootId]) {
    final rows = <OutlineRowData>[];
    final seen = <String>{?rootId};
    void walk(String? parentId, int depth) {
      for (final node in childrenOf(parentId)) {
        if (!seen.add(node.id)) continue;
        final childCount = childrenOf(node.id).length;
        rows.add(OutlineRowData(node: node, depth: depth, childCount: childCount));
        if (childCount > 0 && !node.collapsed) walk(node.id, depth + 1);
      }
    }

    walk(rootId, 0);
    return rows;
  }

  String? parentOf(String id) => nodes[id]?.parentId;

  List<Node> ancestorsOf(String id) {
    final chain = <Node>[];
    var current = nodes[id]?.parentId;
    while (current != null) {
      final node = nodes[current];
      if (node == null || chain.contains(node)) break;
      chain.add(node);
      current = node.parentId;
    }
    return chain.reversed.toList();
  }

  List<String> descendantsOf(String id) {
    final collected = <String>{};
    final stack = [id];
    while (stack.isNotEmpty) {
      final current = stack.removeLast();
      if (!collected.add(current)) continue;
      stack.addAll(childrenOf(current).map((c) => c.id));
    }
    return collected.toList();
  }

  bool isDescendant(String id, String ancestorId) {
    var current = nodes[id]?.parentId;
    while (current != null) {
      if (current == ancestorId) return true;
      current = nodes[current]?.parentId;
    }
    return false;
  }

  SearchResult search(String query, {int limit = 20, String? within, String? excluding}) {
    Iterable<Node> pool = nodes.values;
    if (within != null) {
      pool = descendantsOf(within).where((id) => id != within).map((id) => nodes[id]).whereType<Node>();
    } else if (excluding != null) {
      final skip = descendantsOf(excluding).toSet();
      pool = pool.where((n) => !skip.contains(n.id));
    }
    return searchNodes(pool, query, limit);
  }

  bool isLocked(String id) => isDailyNode(id);

  String _orderAt(String? parentId, int? index, [String? excluding]) {
    final siblings = childrenOf(parentId).where((n) => n.id != excluding).toList();
    final at = index == null ? siblings.length : index.clamp(0, siblings.length);
    return orderBetween(at > 0 ? siblings[at - 1].order : null, at < siblings.length ? siblings[at].order : null);
  }

  String create(String? parentId, {String? id, int? index, String text = ''}) {
    if (parentId != null && !nodes.containsKey(parentId) && isDayId(parentId)) {
      openDay(this, dayDate(parentId));
    }
    if (parentId != null && !nodes.containsKey(parentId)) {
      throw ArgumentError('create: unknown parent $parentId');
    }
    final node = Node(
      id: id ?? newId(),
      parentId: parentId,
      order: _orderAt(parentId, index),
      text: text,
      updatedAt: _now(),
    );
    _put(node);
    _changed();
    return node.id;
  }

  void setText(String id, String text) {
    final node = nodes[id];
    if (node == null || isLocked(id) || node.text == text) return;
    node.text = text;
    _touch(node);
    _changed();
  }

  void setCollapsed(String id, bool collapsed) {
    final node = nodes[id];
    if (node == null) return;
    node.collapsed = collapsed;
    _touch(node);
    _changed();
  }

  void setTask(String id, Task? task) {
    final node = nodes[id];
    if (node == null || isLocked(id)) return;
    node.task = task;
    _touch(node);
    _changed();
  }

  void setDue(String id, String? due) {
    final node = nodes[id];
    if (node == null || isLocked(id)) return;
    node.due = due;
    _touch(node);
    _changed();
  }

  List<Node> dueOn(String day, {String? excluding}) {
    final skip = excluding == null ? <String>{} : descendantsOf(excluding).toSet();
    final due = <String>{
      for (final node in nodes.values)
        if (node.due == day && !skip.contains(node.id)) node.id,
    };
    return _documentOrder(due).map((id) => nodes[id]!).toList();
  }

  String? duplicate(String id) {
    final node = nodes[id];
    if (node == null || isLocked(id)) return null;
    final copy = node.copy();
    final clone = Node(
      id: newId(),
      parentId: node.parentId,
      order: _orderAt(node.parentId, indexOf(node) + 1),
      text: copy.text,
      task: copy.task,
      due: copy.due,
      updatedAt: _now(),
    );
    _put(clone);
    _changed();
    return clone.id;
  }

  String? duplicateWithChildren(String id) {
    final node = nodes[id];
    if (node == null || isLocked(id)) return null;
    final snapshot = tree;
    Node clone(Node source, String? parentId, String order) {
      final copy = Node(
        id: newId(),
        parentId: parentId,
        order: order,
        text: source.text,
        collapsed: source.collapsed,
        task: source.task == null ? null : Task(done: source.task!.done),
        due: source.due,
        updatedAt: _now(),
      );
      nodes[copy.id] = copy;
      String? previous;
      for (final child in snapshot[source.id] ?? const <Node>[]) {
        previous = orderBetween(previous, null);
        clone(child, copy.id, previous);
      }
      return copy;
    }

    final root = clone(node, node.parentId, _orderAt(node.parentId, indexOf(node) + 1));
    _changed();
    return root.id;
  }

  bool canIndent(String id) {
    final node = nodes[id];
    return node != null && !isLocked(id) && indexOf(node) > 0;
  }

  bool indent(String id) {
    final node = nodes[id];
    if (node == null) return false;
    final siblings = childrenOf(node.parentId);
    final at = siblings.indexOf(node);
    if (at <= 0) return false;
    return move(id, siblings[at - 1].id);
  }

  bool canOutdent(String id) => !isLocked(id) && nodes[id]?.parentId != null;

  bool outdent(String id) {
    final node = nodes[id];
    if (node == null || node.parentId == null) return false;
    final parent = nodes[node.parentId];
    if (parent == null) return false;
    return move(id, parent.parentId, indexOf(parent) + 1);
  }

  bool move(String id, String? newParentId, [int? index]) {
    final node = nodes[id];
    if (node == null || isLocked(id)) return false;
    if (newParentId != null &&
        (newParentId == id || !nodes.containsKey(newParentId) || isDescendant(newParentId, id))) {
      return false;
    }
    node.order = _orderAt(newParentId, index, id);
    node.parentId = newParentId;
    _touch(node);
    _changed();
    return true;
  }

  void remove(String id) => removeMany([id]);

  void removeMany(Iterable<String> ids) {
    final all = <String>{
      for (final id in ids)
        if (nodes.containsKey(id)) ...descendantsOf(id),
    };
    if (all.isEmpty) return;
    for (final id in all) {
      nodes.remove(id);
    }
    _changed();
  }

  void clearAll() {
    nodes.clear();
    _changed();
  }

  void completeOnboarding() {
    onboarded = true;
    _changed();
  }

  Future<void> _load() async {
    final snapshot = await _persistence.load();
    for (final node in snapshot.nodes) {
      _put(node);
    }
    onboarded = snapshot.onboarded;
    loaded = true;
    _tree = null;
    notifyListeners();
  }

  List<String> _documentOrder(Set<String> ids) {
    final ordered = <String>[];
    void walk(String? parentId) {
      for (final child in childrenOf(parentId)) {
        if (ids.contains(child.id)) ordered.add(child.id);
        walk(child.id);
      }
    }

    walk(null);
    return ordered;
  }

  int _lastNow = 0;
  int _now() {
    final now = DateTime.now().millisecondsSinceEpoch;
    _lastNow = now > _lastNow ? now : _lastNow + 1;
    return _lastNow;
  }

  void _touch(Node node) => node.updatedAt = _now();

  void _put(Node node) => nodes[node.id] = node;

  void _changed() {
    _tree = null;
    _persistence.save(nodes.values, onboarded);
    notifyListeners();
  }
}
