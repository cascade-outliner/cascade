import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/outline/domain/outline_node.dart';
import 'package:mobile/features/outline/domain/outline_tree.dart';

OutlineNode _node(String id, {List<OutlineNode>? children}) => OutlineNode(id: id, text: id, children: children);

void main() {
  group('locateNode', () {
    test('finds a top-level node', () {
      final roots = [_node('a'), _node('b')];
      final loc = locateNode(roots, 'b');
      expect(loc, isNotNull);
      expect(loc!.node.id, 'b');
      expect(loc.parent, isNull);
    });

    test('finds a nested node and reports its parent', () {
      final child = _node('child');
      final roots = [
        _node('a', children: [child]),
      ];
      final loc = locateNode(roots, 'child');
      expect(loc, isNotNull);
      expect(loc!.parent?.id, 'a');
    });

    test('returns null for an unknown id', () {
      expect(locateNode([_node('a')], 'missing'), isNull);
    });
  });

  group('flattenVisible', () {
    test('omits children of a collapsed node', () {
      final roots = [
        OutlineNode(id: 'a', expanded: false, children: [_node('a1')]),
        _node('b'),
      ];
      final rows = flattenVisible(roots);
      expect(rows.map((r) => r.node.id), ['a', 'b']);
    });

    test('includes children of an expanded node, with correct depth', () {
      final roots = [
        _node('a', children: [_node('a1')]),
      ];
      final rows = flattenVisible(roots);
      expect(rows.map((r) => r.node.id), ['a', 'a1']);
      expect(rows.map((r) => r.depth), [0, 1]);
    });
  });

  group('indentNode / outdentNode', () {
    test('indent makes a node the last child of its previous sibling', () {
      final roots = [_node('a'), _node('b')];
      final changed = indentNode(roots, 'b');
      expect(changed, isTrue);
      expect(roots.map((n) => n.id), ['a']);
      expect(roots[0].children.map((n) => n.id), ['b']);
    });

    test('indent is a no-op for the first sibling', () {
      final roots = [_node('a'), _node('b')];
      final changed = indentNode(roots, 'a');
      expect(changed, isFalse);
      expect(roots.map((n) => n.id), ['a', 'b']);
    });

    test('outdent moves a node to become its parent\'s next sibling', () {
      final roots = [
        _node('a', children: [_node('a1'), _node('a2')]),
      ];
      final changed = outdentNode(roots, 'a1');
      expect(changed, isTrue);
      expect(roots.map((n) => n.id), ['a', 'a1']);
      expect(roots[0].children.map((n) => n.id), ['a2']);
    });

    test('outdent is a no-op for a top-level node', () {
      final roots = [_node('a')];
      expect(outdentNode(roots, 'a'), isFalse);
    });
  });

  group('insertSiblingAfter / insertChild', () {
    test('insertSiblingAfter places the new node immediately after the target', () {
      final roots = [_node('a'), _node('c')];
      insertSiblingAfter(roots, 'a', _node('b'));
      expect(roots.map((n) => n.id), ['a', 'b', 'c']);
    });

    test('insertChild appends and expands the parent', () {
      final roots = [_node('a', children: [])..expanded = false];
      insertChild(roots, 'a', _node('a1'));
      expect(roots[0].children.map((n) => n.id), ['a1']);
      expect(roots[0].expanded, isTrue);
    });
  });

  group('deleteNode', () {
    test('removes the node and returns it', () {
      final target = _node('b');
      final roots = [_node('a'), target];
      final removed = deleteNode(roots, 'b');
      expect(removed, same(target));
      expect(roots.map((n) => n.id), ['a']);
    });

    test('removing a parent also removes its subtree from the tree', () {
      final roots = [
        _node('a', children: [_node('a1')]),
        _node('b'),
      ];
      deleteNode(roots, 'a');
      expect(roots.map((n) => n.id), ['b']);
    });
  });

  group('subtreeOf', () {
    test('yields the node itself and every descendant, depth-first', () {
      final node = _node(
        'a',
        children: [
          _node('a1', children: [_node('a1a')]),
          _node('a2'),
        ],
      );
      expect(subtreeOf(node).map((n) => n.id), ['a', 'a1', 'a1a', 'a2']);
    });
  });
}
