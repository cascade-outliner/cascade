import { useOutlinerDemo } from "./use-outliner-demo";

const kbdClassName =
	"rounded-[5px] border border-dark-grey/15 border-b-2 bg-[#fffcf9] px-[7px] py-px font-mono text-[11px] text-graphite";

export function OutlinerDemo() {
	const { rows, toggle, changeText, handleKeyDown, registerInput } =
		useOutlinerDemo();

	return (
		<section className="mx-auto max-w-[760px] px-8 pt-6 pb-24">
			<div className="mb-3.5 text-center text-[13px] text-[#8f9199]">
				This demo is real &mdash; click a line and type.
			</div>
			<div className="rounded-2xl border border-dark-grey/10 bg-[#fffcf9] px-7 pt-7 pb-6 shadow-[0_2px_6px_rgba(43,45,51,0.04),0_24px_48px_-24px_rgba(43,45,51,0.12)]">
				{rows.map((row) => (
					<div
						key={row.id}
						className="flex min-h-8 items-center"
						style={{ paddingLeft: row.depth * 26 }}
					>
						<button
							type="button"
							aria-label={row.collapsed ? "Expand" : "Collapse"}
							onClick={() => toggle(row.id)}
							className="flex size-[18px] shrink-0 cursor-pointer items-center justify-center text-[10px] text-[#b9bbc1] transition-transform duration-150"
							style={{
								opacity: row.hasChildren ? 1 : 0,
								transform:
									row.collapsed || !row.hasChildren
										? "rotate(0deg)"
										: "rotate(90deg)",
							}}
						>
							&#9656;
						</button>
						<button
							type="button"
							aria-label={row.collapsed ? "Expand" : "Collapse"}
							onClick={() => toggle(row.id)}
							className="flex size-[18px] shrink-0 cursor-pointer items-center justify-center"
						>
							<span
								className="size-1.5 rounded-full bg-dark-grey"
								style={{
									boxShadow: `0 0 0 4px ${row.collapsed ? "var(--color-ginger)" : "transparent"}`,
								}}
							/>
						</button>
						<input
							value={row.text}
							onChange={(e) => changeText(row.id, e.target.value)}
							onKeyDown={(e) => handleKeyDown(e, row.id)}
							ref={registerInput(row.id)}
							spellCheck={false}
							className="ml-1 flex-1 border-none bg-transparent px-1 py-[5px] text-[15px] text-dark-grey outline-none"
						/>
					</div>
				))}
			</div>
			<div className="mt-4.5 flex flex-wrap justify-center gap-x-[22px] gap-y-2.5 text-[12.5px] text-[#8f9199]">
				<span className="flex items-center gap-[7px]">
					<span className={kbdClassName}>Enter</span> new line
				</span>
				<span className="flex items-center gap-[7px]">
					<span className={kbdClassName}>Tab</span> indent
				</span>
				<span className="flex items-center gap-[7px]">
					<span className={kbdClassName}>Shift+Tab</span> outdent
				</span>
				<span className="flex items-center gap-[7px]">
					<span className="inline-block size-1.5 rounded-full bg-graphite" />
					click a bullet to collapse
				</span>
			</div>
		</section>
	);
}
