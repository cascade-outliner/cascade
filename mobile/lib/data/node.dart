class Node {
  Node({
    required this.id,
    required this.parentId,
    required this.order,
    this.text = '',
    this.collapsed = false,
    this.task,
    this.due,
    required this.updatedAt,
  });

  final String id;
  String? parentId;
  String order;
  String text;
  bool collapsed;
  Task? task;
  String? due;
  int updatedAt;

  Node copy() => Node(
    id: id,
    parentId: parentId,
    order: order,
    text: text,
    collapsed: collapsed,
    task: task == null ? null : Task(done: task!.done),
    due: due,
    updatedAt: updatedAt,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'parentId': parentId,
    'order': order,
    'text': text,
    'collapsed': collapsed,
    if (task != null) 'task': {'done': task!.done},
    if (due != null) 'due': due,
    'updatedAt': updatedAt,
  };

  factory Node.fromJson(Map<String, dynamic> json) => Node(
    id: json['id'] as String,
    parentId: json['parentId'] as String?,
    order: json['order'] as String,
    text: (json['text'] as String?) ?? '',
    collapsed: (json['collapsed'] as bool?) ?? false,
    task: json['task'] == null ? null : Task(done: (json['task'] as Map)['done'] as bool),
    due: json['due'] as String?,
    updatedAt: (json['updatedAt'] as num).toInt(),
  );
}

class Task {
  const Task({required this.done});
  final bool done;
}

class OutlineRowData {
  const OutlineRowData({required this.node, required this.depth, required this.childCount});
  final Node node;
  final int depth;
  final int childCount;
}
