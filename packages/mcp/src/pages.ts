function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

const pageStyles = `
	body { font-family: system-ui, sans-serif; max-width: 380px; margin: 4rem auto; padding: 0 1.5rem; }
	h1 { font-size: 1.25rem; }
	input { display: block; width: 100%; box-sizing: border-box; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; border: 1px solid #ccc; border-radius: 0.375rem; }
	button { padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: none; cursor: pointer; }
	.primary { background: #111; color: #fff; }
	.secondary { background: #eee; color: #111; }
	.error { color: #b91c1c; font-size: 0.875rem; }
	.actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
`;

export function renderLoginPage(params: { authorizeUrl: string }) {
	return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Log in to Cascade</title><style>${pageStyles}</style></head>
<body>
	<h1>Log in to Cascade</h1>
	<p id="error" class="error"></p>
	<form id="login-form">
		<input type="email" name="email" placeholder="Email" required />
		<input type="password" name="password" placeholder="Password" required />
		<button class="primary" type="submit">Log in</button>
	</form>
	<script>
		document.getElementById("login-form").addEventListener("submit", async (e) => {
			e.preventDefault();
			const form = new FormData(e.target);
			const res = await fetch("/api/auth/sign-in/email", {
				method: "POST",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					email: form.get("email"),
					password: form.get("password"),
				}),
			});
			if (res.ok) {
				window.location.href = ${JSON.stringify(params.authorizeUrl)};
			} else {
				const data = await res.json().catch(() => ({}));
				document.getElementById("error").textContent = data.message ?? "Login failed";
			}
		});
	</script>
</body>
</html>`;
}

export function renderConsentPage(params: {
	clientName: string;
	hiddenFields: Record<string, string>;
}) {
	const inputs = Object.entries(params.hiddenFields)
		.map(
			([name, value]) =>
				`<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`,
		)
		.join("\n");

	return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Authorize ${escapeHtml(params.clientName)}</title><style>${pageStyles}</style></head>
<body>
	<h1>Authorize ${escapeHtml(params.clientName)}</h1>
	<p>This will let <strong>${escapeHtml(params.clientName)}</strong> read and write your Cascade nodes.</p>
	<form method="POST">
		${inputs}
		<div class="actions">
			<button class="primary" type="submit" name="action" value="approve">Allow</button>
			<button class="secondary" type="submit" name="action" value="deny">Deny</button>
		</div>
	</form>
</body>
</html>`;
}
