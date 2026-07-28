/**
 * The transition classes shared by every small Base UI popup (popover,
 * select, context menu, language switcher): a scale+opacity enter/exit
 * driven by Base UI's `data-starting-style`/`data-ending-style`, sized to
 * the "small enter/exit" duration tokens (see `theme.css`/`motion.ts`) with
 * `duration-medium-*` reserved for larger overlays like dialogs
 * (`dialog-motion.tsx`). Scale is neutralized under reduced motion, leaving
 * a brief opacity fade.
 */
export const overlayPopupMotion =
	"transition-[transform,opacity] duration-small-enter ease-standard data-ending-style:duration-small-exit " +
	"data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 " +
	"motion-reduce:transition-opacity motion-reduce:duration-immediate motion-reduce:data-ending-style:duration-immediate " +
	"motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100";
