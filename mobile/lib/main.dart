import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';

import 'data/persistence.dart';
import 'data/store.dart';
import 'ui/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final dir = await getApplicationSupportDirectory();
  final store = OutlineStore(FilePersistence(File('${dir.path}/outline.json')));
  await store.ready;
  runApp(CascadeApp(store: store));
}
