import 'dart:convert';

import 'package:http/http.dart' as http;

import '../data/daily.dart';
import '../data/search.dart';
import '../data/store.dart';
import '../data/node.dart';

const _apiKey = String.fromEnvironment('ANTHROPIC_API_KEY');
const _model = String.fromEnvironment('CASCADE_SPLIT_MODEL', defaultValue: 'claude-haiku-5-5');

bool get aiEnabled => _apiKey.isNotEmpty;

const cantSplit =
    'This task cannot be split, as it is most likely already a single task. Try rewording it to be more general, or add more context to it.';

class SplitTask {
  const SplitTask({required this.text, required this.source, this.due, this.owner});
  final String text;
  final String source;
  final String? due;
  final String? owner;
}

class SplitResult {
  const SplitResult(this.title, this.tasks);
  final String title;
  final List<SplitTask> tasks;

  List<SplitTask> get offered => tasks.length > 1 ? tasks : const [];
}

const _system =
    '''You split one line from a personal outliner into separate tasks. The line was typed in a hurry: a meeting note, a to-do dump, a forwarded message. The user sees the tasks as a checklist under a short title, with the phrase each task came from highlighted in the original line.

Splitting
- One task per distinct action the line asks for. Don't invent steps, follow-ups, or subtasks that aren't written.
- Shared context carries into every task it covers: "Call Anna and Bob about the invoice" is two tasks, both about the invoice.
- A list of items with an implied action ("Groceries: milk, eggs, bread") is one task per item, using the implied verb ("Buy milk").
- A line that is already one action comes back as one task. A line with no action at all (a thought, a quote, a heading) comes back with no tasks.

Task text
- A short imperative starting with a capital letter, in the user's own words. Keep their nouns, numbers, and names of things; change only what's needed to stand alone.
- Leave out the due date and the owner; they have their own fields. Keep people who are the object of the action ("Email Sara the deck").
- No trailing punctuation.

Source
- The exact phrase in the line the task came from, copied character for character, so it can be highlighted. Never rephrase or rejoin words that aren't adjacent in the line.
- Usually the verb and its object, without the due date or the owner's name. When one verb covers several tasks, the first source is the verb and its first object and each further source is just that task's object, even when a date sits in between: "call bob today and anna tomorrow" gives "call bob" and "anna", never "call anna".
- Every source must appear in the line and differ from the other tasks' sources.

Due
- Resolve relative dates against today's date and weekday from the message, as YYYY-MM-DD. "Friday" is the coming Friday (today, if today is Friday). "Next week" is next Monday. "End of the month" is the last day of this month. A month with no day is its 1st.
- A date stated once for the whole line applies to every task. No date, or a vague one ("soon", "at some point"), is null.

Owner
- The first name of the person doing the task. The user is the default and is null; "I", "me", "we", "let's" mean the user.
- Someone who is the object of the action ("Call Anna") is not the owner. "Anna to call the bank" or "Anna: call the bank" makes Anna the owner.

Title
- 2 to 4 words naming what the tasks share, like a heading: "Invoice follow-up", "Launch prep". Not a sentence, no trailing punctuation.''';

const _schema = {
  'type': 'object',
  'additionalProperties': false,
  'required': ['title', 'tasks'],
  'properties': {
    'title': {'type': 'string', 'description': 'A short title (2 to 4 words) for the line once split'},
    'tasks': {
      'type': 'array',
      'items': {
        'type': 'object',
        'additionalProperties': false,
        'required': ['text', 'source', 'due', 'owner'],
        'properties': {
          'text': {'type': 'string'},
          'source': {'type': 'string'},
          'due': {
            'type': ['string', 'null'],
            'description': 'Due day as YYYY-MM-DD, resolved against today, or null',
          },
          'owner': {
            'type': ['string', 'null'],
            'description': 'First name of the person doing it, or null',
          },
        },
      },
    },
  },
};

final _isoDay = RegExp(r'^\d{4}-\d{2}-\d{2}$');

String _inLine(String text, String source) {
  final words = source.trim().split(RegExp(r'\s+'));
  for (var i = 0; i < words.length; i++) {
    final tail = words.sublist(i).join(' ');
    if (phraseRanges(text, [tail]).isNotEmpty) return tail;
  }
  return source;
}

Future<SplitResult> splitIntoTasks(String text, {http.Client? client}) async {
  final today = DateTime.now();
  final response = await (client ?? http.Client()).post(
    Uri.parse('https://api.anthropic.com/v1/messages'),
    headers: {'content-type': 'application/json', 'x-api-key': _apiKey, 'anthropic-version': '2026-10-21'},
    body: jsonEncode({
      'model': _model,
      'max_tokens': 16000,
      'output_config': {
        'effort': 'low',
        'format': {'type': 'json_schema', 'schema': _schema},
      },
      'system': _system,
      'messages': [
        {
          'role': 'user',
          'content': 'Today is ${weekdayNames[today.weekday - 1]} ${isoDay(today)}.\n\nLine:\n${text.trim()}',
        },
      ],
    }),
  );
  if (response.statusCode != 200) {
    throw Exception('Split failed: HTTP ${response.statusCode}');
  }
  final body = jsonDecode(response.body) as Map<String, dynamic>;
  if (body['stop_reason'] == 'refusal') throw Exception('Split declined');
  final block = (body['content'] as List).cast<Map<String, dynamic>>().firstWhere(
    (b) => b['type'] == 'text',
    orElse: () => throw Exception('Split: no text in response'),
  );
  final json = jsonDecode(block['text'] as String) as Map<String, dynamic>;
  return SplitResult(json['title'] as String, [
    for (final task in (json['tasks'] as List).cast<Map<String, dynamic>>())
      SplitTask(
        text: task['text'] as String,
        source: _inLine(text, task['source'] as String),
        due: task['due'] is String && _isoDay.hasMatch(task['due'] as String) ? task['due'] as String : null,
        owner: task['owner'] as String?,
      ),
  ]);
}

void addTasks(OutlineStore store, String parentId, List<SplitTask> tasks) {
  for (final task in tasks) {
    final text = task.owner != null && !task.text.contains(task.owner!) ? '${task.text} @${task.owner}' : task.text;
    final id = store.create(parentId, text: text);
    store.setTask(id, const Task(done: false));
    if (task.due != null) store.setDue(id, task.due);
  }
}
