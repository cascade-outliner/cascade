# @cascade/mcp

A remote MCP (Model Context Protocol) server, mounted inside `apps/web-app`,
that lets MCP clients (Claude, etc.) connect to *your* hosted Cascade
instance and log in as themselves — no manually copied tokens. Each
connected client only ever sees the nodes belonging to the user who
authorized it.

It exposes tools for a user's outliner tree: `list_nodes`, `get_node`,
`create_node`, `update_node`, `delete_node`.

## How it works

This package implements the MCP Authorization spec (OAuth 2.1 + PKCE) as a
small authorization server bolted onto the existing `better-auth` session
system, plus the MCP Streamable HTTP transport for the tool calls
themselves:

- `GET /.well-known/oauth-authorization-server` and
  `GET /.well-known/oauth-protected-resource` — metadata clients use to
  discover how to authenticate (RFC 8414 / RFC 9728).
- `POST /api/mcp/oauth/register` — dynamic client registration (RFC 7591),
  so a new MCP client doesn't need to be manually configured ahead of time.
- `GET/POST /api/mcp/oauth/authorize` — shows a login form (if the browser
  has no `better-auth` session yet) and then a consent screen ("Allow
  `<client>` to access your Cascade nodes?"). Approving redirects back to
  the client with an authorization code.
- `POST /api/mcp/oauth/token` — exchanges the code (with PKCE) for an
  access + refresh token, or refreshes an existing pair.
- `POST/GET/DELETE /api/mcp` — the actual MCP endpoint. Requests must carry
  `Authorization: Bearer <access_token>`; the token is resolved to a user id
  and the tool calls run scoped to that user, exactly like the REST API.

All of this lives in `@cascade/db` (three new tables:
`mcp_oauth_client`, `mcp_oauth_code`, `mcp_oauth_token`) and
`@cascade/auth`/`@cascade/db` are used directly — the node tools reuse the
same `nodeQueries` helpers as the oRPC `nodes` router, so behavior can't
drift between the two.

## Connecting a client

Point an MCP client at `https://<your-deployment>/api/mcp`. A client that
follows the MCP Authorization spec (e.g. Claude.ai's remote connectors)
will:

1. Fetch `/.well-known/oauth-protected-resource` from a `401`'s
   `WWW-Authenticate` header.
2. Register itself via `/api/mcp/oauth/register`.
3. Open `/api/mcp/oauth/authorize` in a browser for the user to log in to
   Cascade and approve access.
4. Exchange the resulting code for tokens and start calling tools.

No environment variables or manual token pasting required — this replaces
an earlier local/stdio design that needed a token in an env var.
