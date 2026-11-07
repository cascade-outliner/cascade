import 'package:flutter/widgets.dart';

import '../data/store.dart';

class StoreScope extends InheritedNotifier<OutlineStore> {
  const StoreScope({super.key, required OutlineStore store, required super.child}) : super(notifier: store);

  static OutlineStore of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<StoreScope>()!.notifier!;

  static OutlineStore read(BuildContext context) => context.getInheritedWidgetOfExactType<StoreScope>()!.notifier!;
}
