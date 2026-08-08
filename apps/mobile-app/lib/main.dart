import 'package:flutter/material.dart';

import 'features/outline/application/outline_controller.dart';
import 'features/outline/data/sqlite/sqlite_outline_repository.dart';
import 'features/outline/domain/outline_node.dart';
import 'features/outline/presentation/outline_screen.dart';
import 'theme/cascade_theme.dart';

void main() {
  runApp(CascadeApp(controller: _buildController()));
}

/// Shares one `OutlineIdGenerator` between the repository (which seeds the
/// initial demo nodes on a fresh install) and the controller (which
/// creates nodes afterwards) so their ids can never collide.
OutlineController _buildController() {
  final idGenerator = OutlineIdGenerator();
  final repository = SqliteOutlineRepository(idGenerator: idGenerator);
  return OutlineController(repository: repository, idGenerator: idGenerator);
}

class CascadeApp extends StatelessWidget {
  const CascadeApp({super.key, required this.controller});

  final OutlineController controller;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Cascade',
      theme: CascadeTheme.light(),
      darkTheme: CascadeTheme.dark(),
      themeMode: ThemeMode.system,
      home: OutlineScreen(controller: controller),
    );
  }
}
