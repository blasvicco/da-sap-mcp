// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_connection_status: Tool = {
  name: "sap_connection_status",
  description:
    "Check SAP OData connection status and get connection info (including active auth driver)",
  inputSchema: {
    type: "object",
    properties: {},
  },
};
