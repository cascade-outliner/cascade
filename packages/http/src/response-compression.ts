const COMPRESSIBLE_CONTENT_TYPE =
	/^(text\/|application\/json|application\/javascript|application\/xml|image\/svg\+xml)/i;

/** Below this, gzip's own overhead isn't worth paying. */
const MIN_COMPRESSIBLE_BYTES = 1024;

/**
 * Gzips a response body when the request says it can accept gzip, the body
 * is a compressible type/size, and nothing about the response makes
 * compressing it unsafe (an existing `Content-Encoding`, or a `Range`
 * request, which byte-offsets a specific uncompressed representation).
 * Uses the native `CompressionStream` (Web Streams API, no dependency)
 * rather than Node's callback-based `zlib`, since the framework here works
 * in `Request`/`Response` terms throughout.
 */
export async function compressResponse(
	request: Request,
	response: Response,
): Promise<Response> {
	if (!acceptsGzip(request)) return response;
	if (response.headers.has("Content-Encoding")) return response;
	if (request.headers.has("Range")) return response;
	if (!response.body) return response;

	const contentType = response.headers.get("Content-Type") ?? "";
	if (!COMPRESSIBLE_CONTENT_TYPE.test(contentType)) return response;

	const contentLength = response.headers.get("Content-Length");
	if (
		contentLength !== null &&
		Number(contentLength) < MIN_COMPRESSIBLE_BYTES
	) {
		return response;
	}

	const compressedBody = response.body.pipeThrough(
		new CompressionStream("gzip"),
	);
	const headers = new Headers(response.headers);
	headers.delete("Content-Length");
	headers.set("Content-Encoding", "gzip");
	headers.append("Vary", "Accept-Encoding");

	return new Response(compressedBody, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

function acceptsGzip(request: Request): boolean {
	const acceptEncoding = request.headers.get("Accept-Encoding") ?? "";
	return acceptEncoding
		.split(",")
		.some((encoding) => encoding.trim().split(";")[0] === "gzip");
}
