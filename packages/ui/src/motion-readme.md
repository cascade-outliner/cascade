# Motion foundation

The shared, semantic motion layer both apps use, built on top of
[Motion](https://motion.dev) (the `motion` package) plus a set of duration/
easing tokens in `@cascade/theme/motion`. It exists so timing values and
reduced-motion handling stop being reinvented per feature.

## Setup

Both apps wrap their document root once with `MotionProvider`
(`motion-provider.tsx`):

```tsx
import { MotionProvider } from "@cascade/ui/motion-provider";

<MotionProvider>{children}</MotionProvider>;
```

This does two things:

- `LazyMotion` (with `strict`) loads only the `domAnimation` feature bundle
  for `m.*` components, and throws if a descendant renders `motion.*`
  instead of `m.*` — that would pull in the full, eager bundle and defeat
  lazy loading. Always import `m` from `@cascade/ui/motion`, never `motion`
  from `motion/react` directly.
- `MotionConfig reducedMotion="user"` makes every `m.*` animation in the
  tree honor the OS reduced-motion preference automatically.

## When to use what

- **CSS/Tailwind/cva** (`transition-*`, `duration-*`, `ease-*`,
  `data-starting-style:`/`data-ending-style:`) — the default for hover,
  color, and Base UI popup/dialog state transitions. Nothing here needs JS
  orchestration; keep it CSS-only. See `dialog-motion.tsx` and the shared
  overlay popup transition used by `popover.tsx`/`select.tsx`/
  `context-menu.tsx`/`language-switcher.tsx`.
- **`m.*` (Motion)** — bounded DOM that needs presence (animating on
  mount/unmount via `AnimatePresence`), sequencing across multiple elements,
  or gestures. Import `m`/`AnimatePresence` from `@cascade/ui/motion` and
  semantic transitions/variants from `@cascade/ui/motion-variants`.
- **Single-element Web Animations API** (`motion-reposition.ts`) — the only
  sanctioned way to animate **virtualized tree rows** repositioning (drag
  reorder, indent/outdent, expand/collapse shifting siblings). See below.

## Semantic patterns and tokens

`@cascade/theme/motion` (mirrored as `duration-*`/`ease-*` Tailwind
utilities in `theme.css`) defines the shared scale:

| token          | ms  | use                                          |
| -------------- | --- | --------------------------------------------- |
| `immediate`    | 75  | instant/pressed feedback                       |
| `smallEnter`   | 150 | a small element appearing (popover, menu)      |
| `smallExit`    | 100 | a small element leaving                        |
| `mediumEnter`  | 225 | a larger element appearing (dialog, drawer)    |
| `mediumExit`   | 175 | a larger element leaving                       |
| `feedback`     | 400 | a non-blocking settle (save confirmation)      |

Plus one easing, `overshoot`, reserved for **restrained delight only** —
checkmarks and primary marketing buttons (`checkbox.tsx`, `button.tsx`,
`action.tsx`). Don't reach for it in general UI motion.

`motion-variants.ts` exposes the same four semantic patterns from the
motion foundation brief as ready-made Motion `Variants`/`Transition`
objects: `smallEnterVariants`/`smallExitVariants`,
`mediumEnterVariants`/`mediumExitVariants`, `repositionTransition`, and
`feedbackVariants`, plus `delightTransition` for the overshoot exception
above.

## Reduced motion

Two independent mechanisms cover the whole app, and both must be kept in
sync when adding new motion:

- **`m.*` components**: automatic, via `MotionConfig reducedMotion="user"` —
  transform/scale animations collapse to their end state; opacity/color
  transitions still run briefly.
- **CSS-only primitives**: manual, via Tailwind's `motion-reduce:` variant.
  Every component with a decorative transform/scale must neutralize it
  under `motion-reduce:` (see `dialog-motion.tsx` for the pattern:
  `motion-reduce:data-starting-style:scale-100`, shortened
  `motion-reduce:duration-immediate`, etc.). Structural transforms that
  encode real layout (e.g. `toast.tsx`'s stacking offset) keep the
  transform but collapse its duration to `duration-immediate` instead of
  removing it — removing it would break the stack, not just the animation.
- **Native View Transitions** (TanStack Router's `viewTransition` prop) are
  covered separately in `theme.css`, since neither of the above touches the
  browser's own `::view-transition-*` pseudo-elements.

## Virtualized tree rows: WAAPI only, never Motion `layout`/`Reorder`

Tree rows (`packages/outliner/src/tree/components/virtual-tree-row.tsx`) are
absolutely positioned via a plain `translateY(...)` style and virtualized by
`@tanstack/react-virtual` — only a small visible slice is ever mounted, out
of a tree that can hold thousands of nodes.

**Rows must never use Motion's `layout` prop or `Reorder` component.** Both
track and animate every affected element on each change; applied to a
virtualized list they'd force full-tree layout measurement on every row
move, which doesn't scale and defeats the point of virtualization.

If a row's reposition ever needs to animate (e.g. drag reorder, or sibling
rows shifting after an expand/collapse), use `animateRowReposition` from
`motion-reposition.ts`: it animates a single row's own `transform` via the
Web Animations API (`Element.animate`), independent of every other row, and
no-ops under reduced motion.

### Row lifecycle: create/duplicate, delete, undo/redo/restore

`motion-row-lifecycle.ts` covers the other three single-row motion cases
(issue #510), same WAAPI-only, single-element policy as reposition:

- `animateRowEnter` — a newly created/duplicated row's own rise-and-fade in.
- `animateRowExit` — a row about to be removed fading out, faster than the
  enter; returns the `Animation` so the delete mutation can await
  `.finished` before actually removing the row from the tree data (there'd
  otherwise be nothing left to animate against an instant unmount).
- `flashRowHighlight` — a one-shot, non-repeating background-color flash to
  locate a row an undo/redo/restore just affected.

Unlike `animateRowReposition`, these don't fully no-op under reduced
motion: a rise/fade still drops its translation but keeps a brief opacity
change, and the flash (color-only) is unaffected either way — matching the
motion foundation's general reduced-motion policy above, not the
reposition-specific one.

`packages/outliner/src/tree/motion/row-lifecycle.ts` holds the transient,
module-level wiring a mutation hook needs: `markRowEntering`/
`markRowRestored` flag a row id right before it's inserted, consumed once
by that row's own mount effect in `virtual-tree-row.tsx`; `playRowExit`
looks up the row's currently-mounted element (registered via
`registerRowElement`, the same ref callback that calls the virtualizer's
`measureElement`) and awaits its exit animation before the delete mutation
removes the row from the cache.

## Tests

`motion-reposition.test.ts` and `motion-row-lifecycle.test.ts` exercise
their respective helpers' normal and reduced-motion behavior with a mock
animatable (no real DOM/jsdom needed — the element dependency is a
one/two-method interface).
