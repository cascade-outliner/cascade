import { describe, expect, it } from "vitest";
import { compressResponse } from "./response-compression";

const bigJson = JSON.stringify({ text: "x".repeat(2000) });

function request(headers: Record<string, string> = {}): Request {
	return new Request("http://localhost/", { headers });
}

function jsonResponse(body: string, headers: Record<string, string> = {}) {
	return new Response(body, {
		headers: { "Content-Type": "application/json", ...headers },
	});
}

async function gunzip(stream: ReadableStream<Uint8Array>): Promise<string> {
	const decompressed = stream.pipeThrough(new DecompressionStream("gzip"));
	return new Response(decompressed).text();
}

describe("compressResponse", () => {
	it("gzips a compressible response when the client accepts gzip", async () => {
		const response = await compressResponse(
			request({ "Accept-Encoding": "gzip, deflate, br" }),
			jsonResponse(bigJson),
		);

		expect(response.headers.get("Content-Encoding")).toBe("gzip");
		expect(response.headers.get("Vary")).toBe("Accept-Encoding");
		expect(response.headers.has("Content-Length")).toBe(false);
		// biome-ignore lint/style/noNonNullAssertion: response.body is set above
		expect(await gunzip(response.body!)).toBe(bigJson);
	});

	it("passes through unchanged when the client sends no Accept-Encoding", async () => {
		const original = jsonResponse(bigJson);
		const response = await compressResponse(request(), original);

		expect(response).toBe(original);
	});

	it("passes through unchanged when Accept-Encoding doesn't include gzip", async () => {
		const original = jsonResponse(bigJson);
		const response = await compressResponse(
			request({ "Accept-Encoding": "br" }),
			original,
		);

		expect(response).toBe(original);
	});

	it("passes through a Range request unchanged", async () => {
		const original = jsonResponse(bigJson);
		const response = await compressResponse(
			request({ "Accept-Encoding": "gzip", Range: "bytes=0-99" }),
			original,
		);

		expect(response).toBe(original);
	});

	it("passes through a response that already has a Content-Encoding", async () => {
		const original = jsonResponse(bigJson, { "Content-Encoding": "br" });
		const response = await compressResponse(
			request({ "Accept-Encoding": "gzip" }),
			original,
		);

		expect(response).toBe(original);
	});

	it("passes through a small body unworth compressing", async () => {
		const original = jsonResponse('{"ok":true}', {
			"Content-Length": "11",
		});
		const response = await compressResponse(
			request({ "Accept-Encoding": "gzip" }),
			original,
		);

		expect(response).toBe(original);
	});

	it("passes through a non-compressible content type", async () => {
		const original = new Response(new Uint8Array(2000), {
			headers: { "Content-Type": "image/png" },
		});
		const response = await compressResponse(
			request({ "Accept-Encoding": "gzip" }),
			original,
		);

		expect(response).toBe(original);
	});
});
