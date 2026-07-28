import { describe, expect, it, vi } from "vitest";
import { runNodeConversion } from "./node-actions";

describe("runNodeConversion", () => {
	it("acknowledges a task conversion exactly once after it succeeds", async () => {
		const onConvert = vi.fn().mockResolvedValue(true);
		const onTurnInto = vi.fn();
		const onSuccess = vi.fn();

		await runNodeConversion("task", onConvert, onTurnInto, onSuccess);

		expect(onConvert).toHaveBeenCalledWith("task");
		expect(onTurnInto).not.toHaveBeenCalled();
		expect(onSuccess).toHaveBeenCalledOnce();
	});

	it("acknowledges a block conversion once after both writes succeed", async () => {
		const calls: string[] = [];
		const onConvert = vi.fn(async () => {
			calls.push("type");
			return true;
		});
		const onTurnInto = vi.fn(async () => {
			calls.push("block");
			return true;
		});
		const onSuccess = vi.fn(() => calls.push("success"));

		await runNodeConversion("h2", onConvert, onTurnInto, onSuccess);

		expect(calls).toEqual(["type", "block", "success"]);
		expect(onConvert).toHaveBeenCalledWith("text");
		expect(onTurnInto).toHaveBeenCalledWith("h2");
		expect(onSuccess).toHaveBeenCalledOnce();
	});

	it("stops and gives no acknowledgement when either write fails", async () => {
		const onTurnInto = vi.fn().mockResolvedValue(true);
		const onSuccess = vi.fn();

		await runNodeConversion(
			"paragraph",
			vi.fn().mockResolvedValue(false),
			onTurnInto,
			onSuccess,
		);
		expect(onTurnInto).not.toHaveBeenCalled();
		expect(onSuccess).not.toHaveBeenCalled();

		await runNodeConversion(
			"h1",
			vi.fn().mockResolvedValue(true),
			vi.fn().mockResolvedValue(false),
			onSuccess,
		);
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
