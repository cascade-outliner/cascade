import 'package:flutter/material.dart';

import '../data/store.dart';
import 'onboarding.dart';
import 'outline_screen.dart';
import 'store_scope.dart';
import 'theme.dart';

class CascadeApp extends StatelessWidget {
  const CascadeApp({super.key, required this.store, this.themeMode = ThemeMode.system});

  final OutlineStore store;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    return StoreScope(
      store: store,
      child: MaterialApp(
        title: 'Cascade',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(Brightness.light),
        darkTheme: buildTheme(Brightness.dark),
        themeMode: themeMode,
        home: const _Home(),
      ),
    );
  }
}

class _Home extends StatelessWidget {
  const _Home();

  @override
  Widget build(BuildContext context) {
    final store = StoreScope.of(context);
    if (!store.loaded) return const SizedBox.shrink();
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: !store.onboarded && store.size == 0
          ? Onboarding(key: const ValueKey('onboarding'), onDone: store.completeOnboarding)
          : const OutlineScreen(key: ValueKey('outline')),
    );
  }
}
