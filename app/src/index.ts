/**
 * SAP OData MCP Server Entry Point
 */

import { CMcpServer } from "@/server";

const server = new CMcpServer();

server.run().catch((error) => {
  console.error("Failed to start SAP OData MCP server:", error);
  process.exit(1);
});
