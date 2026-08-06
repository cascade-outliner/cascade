import 'package:flutter/material.dart';

import 'features/outline/application/outline_controller.dart';
import 'features/outline/data/in_memory_outline_repository.dart';
import 'features/outline/domain/outline_node.dart';
import 'features/outline/presentation/outline_screen.dart';

void main() {
  runApp(CascadeApp(controller: _buildController()));
}

/// Shares one `OutlineIdGenerator` between the repository (which seeds the
/// initial demo nodes) and the controller (which creates nodes afterwards)
/// so their ids can never collide.
OutlineController _buildController() {
  final idGenerator = OutlineIdGenerator();
  final repository = InMemoryOutlineRepository(idGenerator: idGenerator);
  return OutlineController(repository: repository, idGenerator: idGenerator);
}

class CascadeApp extends StatelessWidget {
  const CascadeApp({super.key, required this.controller});

  final OutlineController controller;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cascade',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple)),
      home: OutlineScreen(controller: controller),
    );
  }
}
