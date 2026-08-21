import { OAuthError, registerClient } from "./oauth.ts";

export async function handleRegisterRequest(
	request: Request,
): Promise<Response> {
	try {
		const body = await request.json();
		const client = await registerClient(body);
		return Response.json(client, { status: 201 });
	} catch (error) {
		if (error instanceof OAuthError) {
			return Response.json(
				{ error: error.code, error_description: error.message },
				{ status: error.status },
			);
		}
		throw error;
	}
}
