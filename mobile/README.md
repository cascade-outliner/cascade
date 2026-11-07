# Cascade mobile

A Flutter port of the Cascade web app's outliner. It covers every web feature except sign-in and Postgres sync. The outline is stored on the device as JSON and works offline.

## Features

- **Outline**: nested lines with collapse, zoom into any line, breadcrumbs, and an editable title when zoomed in.
- **Editing**: tap a line to edit it in place. While editing, a toolbar offers indent, outdent, task toggle, add child and done.
- **Capture bar**: type at the bottom to add a line under the current page. Slash commands picked while typing (`/task`, `/due today`, `/due tomorrow`, `/due next week`, `/zoom in`) stay as chips and run on the new line.
- **Slash commands in lines**: type `/` while editing a line for convert, due date, organize and node commands.
- **Line menu**: long-press a line for convert, due date with calendar, zoom, duplicate, duplicate with children, indent, outdent, break into steps, copy link and delete.
- **Drag and drop**: long-press a bullet and drag. Drop on the top half to place before, the bottom half to place after, or further right to nest inside.
- **Tasks and due dates**: task markers, due pills, and a "due today, elsewhere" and "tomorrow" list under today's note.
- **Daily notes**: a day switcher with a marked calendar, and a week, month or year strip on daily pages. Day, month and year nodes are locked, like on the web.
- **Search**: a command palette with ranked, accent-insensitive search, highlighted matches, create-from-query and navigation shortcuts.
- **Onboarding**: the three-step intro from the web app, adapted for touch.
- **Break into steps**: AI splitting through the Claude API, enabled only when a key is provided at build time.
- **Theme**: the core design system palette in light and dark, with the Onest font.

## Run

```sh
cd mobile
flutter pub get
flutter run                     # any connected device, simulator or desktop
flutter run --dart-define=ANTHROPIC_API_KEY=sk-ant-...   # enables "Break into steps"
```

A build-time key ships inside the app binary. Use it for local development only.

## Test

```sh
flutter analyze
flutter test                                    # data layer unit tests
flutter test integration_test -d linux          # scripted run-through of the whole app
```

The integration test drives the app at human pace with a touch indicator, so it doubles as the demo recording. On a headless Linux machine run it under `Xvfb` and capture the display with `ffmpeg -f x11grab`.

## Layout

- `lib/data`: node model, fractional ordering compatible with the web's `fractional-indexing` keys, outline store, daily notes and search.
- `lib/ui`: screens and widgets.
- `lib/ai`: the "Break into steps" client, using the same prompt as the web server.
