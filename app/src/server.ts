// Lib imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z as zod } from "zod";

// App imports
import { HMcpRegistry, toolDefinitions } from "@/tools/mcp.registry";
import { SConnection } from "@/tools/connection/schema";
import { SServicesGet, SServiceMetadataGet } from "@/tools/service/schema";
import {
  SEntityCreate,
  SEntityDelete,
  SEntityGet,
  SEntityUpdate,
} from "@/tools/entity/schema";
import { SQueryCallFunction, SQueryEntitySet } from "@/tools/query/schema";

const toolSchemas: Record<string, zod.ZodObject<zod.ZodRawShape>> = {
  sap_connect: SConnection,
  sap_connection_status: zod.object({}),
  sap_disconnect: zod.object({}),
  sap_services_get: SServicesGet,
  sap_service_metadata_get: SServiceMetadataGet,
  sap_entity_get: SEntityGet,
  sap_entity_create: SEntityCreate,
  sap_entity_update: SEntityUpdate,
  sap_entity_delete: SEntityDelete,
  sap_query_entity_set: SQueryEntitySet,
  sap_call_function: SQueryCallFunction,
};

export class CMcpServer {
  private readonly handlers: HMcpRegistry;
  // For stdio mode we keep a single server instance; for HTTP we create one per session.
  private stdioServer: McpServer | null = null;
  private httpTransports: Map<string, StreamableHTTPServerTransport> =
    new Map();

  constructor() {
    this.handlers = new HMcpRegistry();
    this.__setupErrorHandling();
  }

  /**
   * Create a fresh McpServer instance and register all tools on it.
   * A new instance must be created per HTTP session because McpServer
   * only allows a single connect() call per instance.
   */
  private __createServer(): McpServer {
    const server = new McpServer(
      {
        name: "sap-odata-mcp-server",
        version: "0.2.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    for (const toolDef of toolDefinitions) {
      const schema = toolSchemas[toolDef.name];
      if (!schema) {
        throw new Error(`No Zod schema found for tool: ${toolDef.name}`);
      }

      server.registerTool(
        toolDef.name,
        {
          description: toolDef.description,
          inputSchema: schema,
        },
        async (args: Record<string, unknown>) => {
          const result = await this.handlers.route(toolDef.name)(args);
          return result as CallToolResult;
        },
      );
    }

    return server;
  }

  /**
   * Start the server based on MCP_TRANSPORT environment variable.
   * - "stdio" (default) → standard input/output
   * - "http" or "sse" → modern HTTP Streamable transport (SSE is gone)
   */
  async run(): Promise<void> {
    const transportMode = process.env.MCP_TRANSPORT ?? "http";

    if (transportMode.toLowerCase() == "stdio") {
      this.stdioServer = this.__createServer();
      const transport = new StdioServerTransport();
      await this.stdioServer.connect(transport);
      console.error("SAP OData MCP server running on stdio");
    } else {
      await this.__runHttpServer();
    }
  }

  /**
   * Modern HTTP server using only StreamableHTTPServerTransport (no SSE).
   * Handles multiple client sessions automatically.
   */
  private async __runHttpServer(): Promise<void> {
    const http = await import("http");
    const crypto = await import("crypto");

    const host = process.env.MCP_HOST;
    const port = parseInt(process.env.MCP_PORT ?? "3000", 10);
    const transportMode = process.env.MCP_TRANSPORT;

    const httpServer = http.createServer(async (req, res) => {
      // CORS headers (optional)
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, MCP-Session-Id",
      );

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Only handle POST, GET, DELETE on /mcp endpoint
      const url = new URL(
        req.url ?? "",
        `${transportMode}://${req.headers.host}`,
      );
      if (url.pathname !== "/mcp") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
        return;
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport = sessionId
        ? this.httpTransports.get(sessionId)
        : undefined;

      // 1) Handle DELETE → close session
      if (req.method === "DELETE") {
        if (transport) {
          await transport.close();
          this.httpTransports.delete(sessionId!);
          res.writeHead(200);
          res.end();
        } else {
          res.writeHead(404);
          res.end("Session not found");
        }
        return;
      }

      // 2) Handle GET → server-sent notifications (used by clients to receive messages)
      if (req.method === "GET") {
        if (!transport) {
          res.writeHead(400);
          res.end("Missing or invalid session ID");
          return;
        }
        await transport.handleRequest(req, res);
        return;
      }

      // 3) Handle POST → JSON-RPC requests
      if (req.method === "POST") {
        // If no session, create a new one (only if this is an "initialize" request)
        if (!transport) {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          await new Promise((resolve) => req.on("end", resolve));
          const requestBody = JSON.parse(body || "{}");

          // Only create a new session if it's an initialize request
          if (requestBody.method === "initialize") {
            // Create a fresh McpServer per session — connect() is one-shot per instance.
            const sessionServer = this.__createServer();
            const newTransport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => crypto.randomUUID(),
              onsessioninitialized: (id) => {
                this.httpTransports.set(id, newTransport);
                newTransport.onclose = () => {
                  this.httpTransports.delete(id);
                  sessionServer.close().catch(() => {});
                };
              },
            });
            await sessionServer.connect(newTransport);
            await newTransport.handleRequest(req, res, requestBody);
            return;
          } else {
            res.writeHead(400);
            res.end("No session ID provided and not an initialize request");
            return;
          }
        } else {
          // Existing session
          await transport.handleRequest(req, res);
        }
        return;
      }

      // Method not allowed
      res.writeHead(405);
      res.end();
    });

    httpServer.listen(port, host, () => {
      console.error(
        `SAP OData MCP server running on ${transportMode}://${host}:${port}/mcp`,
      );
      console.error(
        `- Modern HTTP Streamable endpoint: ${transportMode}://${host}:${port}/mcp`,
      );
    });
  }

  private __setupErrorHandling(): void {
    process.on("SIGINT", async () => {
      // Close all HTTP transports
      for (const transport of this.httpTransports.values()) {
        await transport.close();
      }
      if (this.stdioServer) {
        await this.stdioServer.close();
      }
      process.exit(0);
    });
  }
}
