export function useInlineEdit({
	onSave,
	onCancel,
}: {
	onSave: (value: string) => void
	onCancel: () => void
}) {
	const mountRef = (el: HTMLDivElement | null) => {
		if (!el) return
		el.focus()
		const range = document.createRange()
		range.selectNodeContents(el)
		const sel = window.getSelection()
		sel?.removeAllRanges()
		sel?.addRange(range)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Enter") {
			e.preventDefault()
			onSave(e.currentTarget.textContent ?? "")
		}
		if (e.key === "Escape") {
			e.stopPropagation()
			onCancel()
		}
	}

	const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
		onSave(e.currentTarget.textContent ?? "")
	}

	return { mountRef, handleKeyDown, handleBlur }
}
