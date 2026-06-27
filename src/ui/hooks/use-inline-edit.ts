export function useInlineEdit({
	onSave,
	onCancel,
	clickAt,
}: {
	onSave: (value: string) => void;
	onCancel: () => void;
	clickAt?: { x: number; y: number };
}) {
	const mountRef = (el: HTMLDivElement | null) => {
		if (!el) return;
		el.focus();
		if (clickAt) {
			const range = document.caretRangeFromPoint?.(clickAt.x, clickAt.y);
			if (range) {
				const sel = window.getSelection();
				sel?.removeAllRanges();
				sel?.addRange(range);
			}
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			onSave(e.currentTarget.textContent ?? "");
		}
		if (e.key === "Escape") {
			e.stopPropagation();
			onCancel();
		}
	};

	const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
		onSave(e.currentTarget.textContent ?? "");
	};

	return { mountRef, handleKeyDown, handleBlur };
}
