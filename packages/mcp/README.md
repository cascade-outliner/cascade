# @cascade/mcp

An MCP (Model Context Protocol) server that exposes a Cascade user's node
tree to MCP-compatible clients (Claude Code, Claude Desktop, etc.) as tools:
`list_nodes`, `get_node`, `create_node`, `update_node`, `delete_node`.

It talks to the existing REST API (`apps/web-app`'s `/api/nodes` routes) over
HTTP — it does not touch the database directly — so it works against any
running Cascade instance, local or deployed.

## Auth

The web app's `auth` package enables better-auth's `bearer` plugin, so any
active session token can be used as an API token: sign in via the web app,
then read the token from the `set-auth-token` response header (or your
browser's session cookie value) and pass it to the server.

## Configuration

Set these environment variables before starting the server:

- `CASCADE_API_URL` — base URL of the Cascade API (defaults to
  `http://localhost:3000/api`)
- `CASCADE_API_TOKEN` — a bearer token for the user whose nodes should be
  exposed

## Running

```sh
pnpm mcp:start
```

## Using with an MCP client

Point your MCP client at this as a stdio server, e.g. in Claude Code /
Claude Desktop config:

```json
{
	"mcpServers": {
		"cascade": {
			"command": "pnpm",
			"args": ["--filter", "@cascade/mcp", "start"],
			"cwd": "/path/to/cascade",
			"env": {
				"CASCADE_API_URL": "http://localhost:3000/api",
				"CASCADE_API_TOKEN": "<token>"
			}
		}
	}
}
```
