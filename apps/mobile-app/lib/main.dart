import 'package:flutter/material.dart';

import 'screens/outline_screen.dart';

void main() {
  runApp(const CascadeApp());
}

class CascadeApp extends StatelessWidget {
  const CascadeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cascade',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple)),
      home: const OutlineScreen(),
    );
  }
}
