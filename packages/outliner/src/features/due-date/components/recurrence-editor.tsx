import { Button } from "@cascade/ui/button";
import { Select } from "@cascade/ui/select";
import { useEffect, useState } from "react";
import type {
	RecurrenceInput,
	RecurrenceRule,
	RecurrenceUnit,
} from "../../../dates/recurrence";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";

type RepeatChoice = "never" | "daily" | "weekly" | "monthly" | "custom";

function choiceFor(recurrence: RecurrenceRule | null): RepeatChoice {
	if (!recurrence) return "never";
	if (recurrence.interval !== 1) return "custom";
	if (recurrence.unit === "day") return "daily";
	if (recurrence.unit === "week") return "weekly";
	return "monthly";
}

export function formatRecurrence(
	recurrence: RecurrenceRule,
	labels: ReturnType<typeof useOutlinerLabels>,
): string {
	if (recurrence.interval === 1) {
		if (recurrence.unit === "day") return labels.repeatDaily;
		if (recurrence.unit === "week") return labels.repeatWeekly;
		return labels.repeatMonthly;
	}
	const unit =
		recurrence.unit === "day"
			? labels.repeatDays
			: recurrence.unit === "week"
				? labels.repeatWeeks
				: labels.repeatMonths;
	return labels.repeatEveryInterval
		.replace("{interval}", String(recurrence.interval))
		.replace("{unit}", unit);
}

export function RecurrenceEditor({
	recurrence,
	enabled,
	onChange,
}: {
	recurrence: RecurrenceRule | null;
	enabled: boolean;
	onChange: (recurrence: RecurrenceInput | null) => void;
}) {
	const labels = useOutlinerLabels();
	const [choice, setChoice] = useState<RepeatChoice>(choiceFor(recurrence));
	const [interval, setInterval] = useState<number | "">(
		recurrence && recurrence.interval > 1 ? recurrence.interval : 2,
	);
	const [unit, setUnit] = useState<RecurrenceUnit>(recurrence?.unit ?? "week");

	useEffect(() => {
		setChoice(choiceFor(recurrence));
		if (recurrence && recurrence.interval > 1) {
			setInterval(recurrence.interval);
			setUnit(recurrence.unit);
		}
	}, [recurrence]);

	const choices = [
		{ value: "never", label: labels.repeatNever },
		{ value: "daily", label: labels.repeatDaily, disabled: !enabled },
		{ value: "weekly", label: labels.repeatWeekly, disabled: !enabled },
		{ value: "monthly", label: labels.repeatMonthly, disabled: !enabled },
		{ value: "custom", label: labels.repeatCustom, disabled: !enabled },
	] as const;
	const units = [
		{ value: "day", label: labels.repeatDays },
		{ value: "week", label: labels.repeatWeeks },
		{ value: "month", label: labels.repeatMonths },
	] as const;

	const selectChoice = (next: RepeatChoice) => {
		setChoice(next);
		if (next === "never") onChange(null);
		if (next === "daily") onChange({ unit: "day", interval: 1 });
		if (next === "weekly") onChange({ unit: "week", interval: 1 });
		if (next === "monthly") onChange({ unit: "month", interval: 1 });
	};

	return (
		<div className="border-ink/10 border-t px-3 pt-3 pb-3 mt-1 dark:border-surface/15">
			<div className="flex items-center justify-between gap-3">
				<span className="text-sm font-medium">{labels.repeatLabel}</span>
				<Select
					options={choices}
					value={choice}
					onValueChange={selectChoice}
					aria-label={labels.repeatLabel}
				/>
			</div>
			{!enabled && (
				<p className="mt-1 text-xs text-muted">
					{labels.repeatRequiresTaskDate}
				</p>
			)}
			{enabled && choice === "custom" && (
				<div className="mt-3 flex items-end gap-2">
					<label className="flex flex-1 flex-col gap-1 text-xs">
						{labels.repeatEvery}
						<input
							type="number"
							min={1}
							max={999}
							value={interval}
							onChange={(event) =>
								setInterval(
									event.currentTarget.value === ""
										? ""
										: event.currentTarget.valueAsNumber,
								)
							}
							className="w-20 rounded-md border border-ink/15 bg-white px-2 py-1.5 text-sm outline-none dark:border-surface/20 dark:bg-ink"
						/>
					</label>
					<Select
						options={units}
						value={unit}
						onValueChange={setUnit}
						aria-label={labels.repeatUnit}
					/>
					<Button
						size="sm"
						disabled={
							!Number.isInteger(interval) ||
							interval === "" ||
							interval < 1 ||
							interval > 999
						}
						onClick={() => {
							if (interval !== "") onChange({ unit, interval });
						}}
					>
						{labels.repeatApply}
					</Button>
				</div>
			)}
		</div>
	);
}
