import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'node.dart';

class Snapshot {
  const Snapshot(this.nodes, this.onboarded);
  final List<Node> nodes;
  final bool onboarded;
}

abstract class OutlinePersistence {
  Future<Snapshot> load();
  void save(Iterable<Node> nodes, bool onboarded);
}

class MemoryPersistence implements OutlinePersistence {
  MemoryPersistence([this.initial = const Snapshot([], false)]);
  Snapshot initial;

  @override
  Future<Snapshot> load() async => initial;

  @override
  void save(Iterable<Node> nodes, bool onboarded) {
    initial = Snapshot(nodes.map((n) => n.copy()).toList(), onboarded);
  }
}

class FilePersistence implements OutlinePersistence {
  FilePersistence(this.file);
  final File file;
  Timer? _debounce;
  String? _pending;

  @override
  Future<Snapshot> load() async {
    try {
      if (!await file.exists()) return const Snapshot([], false);
      final json = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
      final nodes = (json['nodes'] as List).map((each) => Node.fromJson(each as Map<String, dynamic>)).toList();
      return Snapshot(nodes, (json['onboarded'] as bool?) ?? false);
    } catch (error) {
      stderr.writeln('Outline: load failed, starting empty: $error');
      return const Snapshot([], false);
    }
  }

  @override
  void save(Iterable<Node> nodes, bool onboarded) {
    _pending = jsonEncode({'version': 1, 'onboarded': onboarded, 'nodes': nodes.map((n) => n.toJson()).toList()});
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), flush);
  }

  Future<void> flush() async {
    final data = _pending;
    if (data == null) return;
    _pending = null;
    await file.parent.create(recursive: true);
    final tmp = File('${file.path}.tmp');
    await tmp.writeAsString(data, flush: true);
    await tmp.rename(file.path);
  }
}
