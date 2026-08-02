# SAP OData MCP Server

A Model Context Protocol (MCP) server for integrating SAP systems with AI assistants (Claude, n8n, etc.) via SAP OData REST APIs. It exposes tools for service discovery, metadata inspection, entity CRUD, entity-set querying, and OData function imports — and supports both classic SAP NetWeaver Gateway OData and SAP Business One Service Layer (B1S).

## Features

- **SAP OData Connectivity**: Connect to SAP systems via OData REST APIs — no SAP RFC SDK required.
- **Multiple Auth Drivers**: `basic` (username/password), `token` (bearer/session token, e.g. from an n8n webhook), and `b1s` (SAP Business One Service Layer login).
- **Per-call Connection Override**: Every tool accepts an optional `connection` object so multi-tenant callers (e.g. n8n, which opens a new MCP session per call) can connect without a separate `sap_connect` step.
- **Service Discovery**: Finds available OData services via the Gateway catalog service, a common-service probe list, or the B1S service document.
- **Entity Set Queries**: Filtering, sorting, pagination, field selection, and `$expand`, with automatic validation of `select` fields against cached metadata.
- **CRUD Operations**: Create, read, update, delete on OData entities.
- **Function Imports**: Execute OData function imports.
- **CSRF Token Handling**: Automatic CSRF token fetch/management for mutating requests (basic/token drivers).
- **Dual Transport**: Stdio (for Claude Desktop) or Streamable HTTP (default — for n8n / remote clients), selected via `MCP_TRANSPORT`.

## Prerequisites

- **Node.js 18+**
- **SAP system with OData services enabled** (NetWeaver Gateway) **or** an SAP Business One Service Layer endpoint
- **Network access to the SAP OData/Service Layer endpoint**
- **SAP user credentials with appropriate authorizations**

## Project Structure

```
app/
├── src/
│   ├── index.ts              # Entry point — starts CMcpServer
│   ├── server.ts             # McpServer setup, transport handling, tool registration
│   ├── client.ts             # CClient — composes the base client + all tool-domain clients
│   ├── base.client.ts        # ABaseClient — Axios instance, connect/disconnect, error formatting
│   ├── base.handler.ts       # ABaseHandler — shared connection state across tool handlers
│   ├── odata.types.ts        # Shared TypeScript types
│   ├── auth/                 # Auth drivers (basic, token, b1s) + driver factory
│   └── tools/
│       ├── mcp.registry.ts   # Registers all tools and routes tool calls to handlers
│       ├── connection/       # sap_connect, sap_connection_status, sap_disconnect
│       ├── service/          # sap_services_get, sap_service_metadata_get
│       ├── entity/           # sap_entity_get/create/update/delete
│       └── query/            # sap_query_entity_set, sap_call_function
├── package.json
└── tsconfig.json
hub/node/                     # Dockerfiles
docker-compose.yml            # Local dev container (bind-mounts app/, idles for manual exec)
```

Each domain follows the same pattern: `schema.ts` (Zod schemas — the actual runtime validation), `handler.ts` (business logic), `client.ts` (SAP HTTP calls), and `definitions/*.ts` (one `Tool` object per MCP tool, used for its description and SDK listing metadata).

## Installation

```bash
cd app
npm install
cp .env.dev .env      # or export the variables another way
npm run build
```

## Configuration

### Environment Variables

```bash
# MCP server
MCP_HOST=localhost
MCP_PORT=3000
MCP_TRANSPORT=http          # "stdio" or "http" (default: http)

# SAP connection defaults (all can be overridden per tool call via `connection`)
SAP_AUTH_DRIVER=basic       # "basic" | "token" | "b1s" (default: basic)
SAP_BASE_URL=https://your-sap-host:8000/sap/opu/odata/sap/

# basic / b1s drivers
SAP_USERNAME=your-sap-username
SAP_PASSWORD=your-sap-password

# token driver
SAP_TOKEN=
SAP_TOKEN_TYPE=Bearer       # or "cookie" to send the token as a Cookie header

# b1s driver
SAP_B1S_COMPANY_DB=

# Optional
SAP_CLIENT=100
SAP_TIMEOUT=30000
SAP_VALIDATE_SSL=false      # for development with self-signed certificates
SAP_ENABLE_CSRF=true
```

`SAP_AUTH_DRIVER` is auto-inferred as `b1s` if `SAP_B1S_COMPANY_DB` (or a per-call `companyDB`) is supplied and the driver isn't explicitly set to something else.

### Claude Desktop Integration (stdio)

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sap-odata": {
      "command": "node",
      "args": ["/full/path/to/da-sap-mcp/app/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "SAP_BASE_URL": "https://your-sap-host:8000/sap/opu/odata/sap/",
        "SAP_USERNAME": "your-username",
        "SAP_PASSWORD": "your-password",
        "SAP_CLIENT": "100",
        "SAP_VALIDATE_SSL": "false"
      }
    }
  }
}
```

### HTTP Transport (default — n8n / remote clients)

With `MCP_TRANSPORT=http` (or unset), the server listens on `http://${MCP_HOST}:${MCP_PORT}/mcp` using the Streamable HTTP transport (POST/GET/DELETE, session tracked via the `MCP-Session-Id` header). Since each n8n tool call may open a fresh session, pass SAP credentials in the `connection` argument of each tool call instead of relying on a prior `sap_connect`.

### Docker (local dev)

```bash
docker compose up -d --build
docker compose exec sap-mcp sh    # container idles; run npm commands manually inside
```

The compose file bind-mounts `./app` into the container, loads env vars from `app/.env.dev`, and joins the external Docker network `da-orb_da_sapot_net`. It does not run `npm install`/`npm start` automatically — exec into the container and run those yourself.

## Available Tools

### Connection

#### `sap_connect`
Connect to SAP OData service.

- `baseUrl` (required) — SAP OData service base URL
- `username`, `password` — required for `basic`/`b1s` drivers
- `token`, `tokenType` — required for `token` driver (`tokenType` defaults to `Bearer`; use `cookie` to send it as a Cookie header instead)
- `client` — SAP client number
- `companyDB` — required for `b1s` driver (SAP Business One company database)
- `timeout` (default `30000`), `validateSSL` (default `true`), `enableCSRF` (default `true`)
- `authDriver` — `basic` | `token` | `b1s` (default `basic`)

#### `sap_connection_status`
Check current connection status and info (base URL, active auth driver, CSRF state, etc.). No parameters.

#### `sap_disconnect`
Disconnect from SAP OData service. No parameters.

### Service

#### `sap_services_get`
List available OData services. Tries the Gateway catalog service, then a set of common demo/service names, then (for `b1s`) the Service Layer service document.

- `connection` (optional) — see [Connection object](#connection-object), for per-call auth

#### `sap_service_metadata_get`
Get and parse `$metadata` (entity types, properties, function imports) for a service.

- `serviceName` (required)
- `connection` (optional)

### Entity

All entity tools share this convention for SAP B1S: put the entity name in `serviceName` (e.g. `PurchaseRequests`, `Items`) and leave `entitySet` as `''`. For standard OData, `serviceName` is the service path segment and `entitySet` is the entity set name (e.g. `EmployeeSet`).

#### `sap_entity_get`
Get a single entity by its primary key.

- `serviceName`, `entitySet` (required)
- `keyValues` (required) — key-value pairs, e.g. `{ "DocEntry": 30526 }`
- `connection` (optional)

> Note: the tool description mentions an `expand` parameter for including line items, but the current schema/implementation does not accept one — `$expand` is only supported by `sap_query_entity_set`.

#### `sap_entity_create`
Create a new entity. `serviceName`, `entitySet`, `data` (required); `connection` (optional).

#### `sap_entity_update`
Update an existing entity. `serviceName`, `entitySet`, `keyValues`, `data` (required); `connection` (optional).

#### `sap_entity_delete`
Delete an entity. `serviceName`, `entitySet`, `keyValues` (required); `connection` (optional).

### Query

#### `sap_query_entity_set`
Query an entity set with filtering, sorting, pagination, and expand.

- `serviceName`, `entitySet` (required — same B1S convention as above)
- `select` (string[]) — fields to return; strongly recommended to avoid token bloat (invalid fields are stripped with a warning)
- `filter` — OData `$filter` expression, e.g. `substringof('term',Field)` (not `Field contains value`, which is invalid OData)
- `orderby`, `top`, `skip`, `expand` (string[]) — navigation properties to expand
- `connection` (optional)

Responses are truncated to 3 records unless `top` is explicitly set.

#### `sap_call_function`
Call an OData function import (`GET {serviceName}/{functionName}` with URL-encoded parameters).

- `serviceName`, `functionName` (required)
- `parameters` (optional)
- `connection` (optional)

### Connection object

Every tool above accepts an optional `connection` object with the same shape as the `sap_connect` parameters (`baseUrl`, `username`, `password`, `token`, `tokenType`, `client`, `companyDB`, `timeout`, `validateSSL`, `enableCSRF`, `authDriver`). If a live connection already exists it's reused; otherwise a fresh client is created for that call from `connection`, falling back to the `SAP_*` environment variables for any field not supplied.

## Auth Drivers

| Driver | Selector | Required fields | Behavior |
|---|---|---|---|
| `basic` (default) | `authDriver: "basic"` | `username`, `password` | HTTP Basic auth; optional `sap-client` header; fetches a CSRF token if `enableCSRF` |
| `token` | `authDriver: "token"` | `token` | `Authorization: <tokenType> <token>` header, or sent as a `Cookie` header if `tokenType` is `"cookie"` |
| `b1s` | `authDriver: "b1s"`, or auto-inferred when `companyDB` is set | `username`, `password`, `companyDB` | Logs in to the SAP Business One Service Layer `Login` endpoint, tracks the session cookie; no CSRF token is used |

An unrecognized `authDriver` value falls back to `basic` with a console warning.

## OData Query Examples

```
$filter=MaterialType eq 'FERT' and CreationDate ge datetime'2024-01-01T00:00:00'
$select=Material,MaterialDescription,MaterialType,BaseUnit
$orderby=CreationDate desc,Material asc
$top=50&$skip=100
$expand=MaterialPlantData,MaterialSalesData
```

Substring matching: `substringof('term',Field)` — combine with `or`/`and` as needed (see `sap_query_entity_set` description above).

## Development

```bash
cd app
npm run dev      # tsx src/index.ts — run from source with auto-reload behavior
npm run build    # tsc && tsc-alias → dist/
npm start        # node dist/index.js
npm test         # jest
npm run lint      # eslint . --ext .ts
npm run format    # prettier --write **.ts
```

### Adding a New Tool

1. Add the field(s) to the domain's `schema.ts` (Zod — this is what's actually validated).
2. Add a `Tool` definition in `definitions/` (name + description + JSON-Schema, used for the SDK listing).
3. Register the tool's name/schema pair in `toolSchemas` in `src/server.ts`.
4. Implement the handler method in the domain's `handler.ts` and the SAP call in its `client.ts`.
5. Wire the tool name to the handler method in `src/tools/mcp.registry.ts`.

See [STANDARDS.md](STANDARDS.md) for naming and style conventions (class-name role prefixes, `@/*` import aliases, method ordering, etc.).

## Troubleshooting

#### **401 Unauthorized**
Check credentials/token, driver selection (`SAP_AUTH_DRIVER`), and that the account isn't locked.

#### **403 Forbidden**
Check SAP authorizations (`S_SERVICE`, `S_ICF`) for the OData path.

#### **404 on the base URL**
Expected for many SAP OData root URLs — the client treats this as a valid "connected" response. If a specific service/entity set 404s, verify the name via `sap_services_get` / `sap_service_metadata_get`.

#### **HTTP 400 "Unrecognized resource path" (B1S)**
Usually means `entitySet` was set to a non-empty value — for B1S it must be `''`, with the entity name in `serviceName`.

#### **SSL Certificate Errors**
Set `SAP_VALIDATE_SSL=false` for development; use valid certificates in production.

## Known Gaps

- `package.json` declares `"license": "MIT"` and lists a `LICENSE` file, but no `LICENSE` file currently exists in the repo.
- `sap_entity_get`'s description references an `expand` parameter that isn't implemented — see the note under [`sap_entity_get`](#sap_entity_get).
- `CQuery` implements a `callAction` (POST) method in `src/tools/query/client.ts` that isn't exposed as an MCP tool.
- `hub/node/Dockerfile` references a `yarn.lock` that doesn't exist in the repo (the project uses `package-lock.json`, which is gitignored) and isn't wired into `docker-compose.yml`; the compose file uses `hub/node/Dockerfile.local` instead, which is a bare dev shell with no dependency install or `CMD`.

## License

MIT (per `package.json`) — no `LICENSE` file is currently present in the repository; add one before treating this as a formally MIT-licensed release.
