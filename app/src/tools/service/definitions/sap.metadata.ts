// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_service_metadata_get: Tool = {
  name: "sap_service_metadata_get",
  description: "Get metadata for a specific OData service",
  inputSchema: {
    type: "object",
    properties: {
      serviceName: {
        type: "string",
        description: "Name of the OData service",
      },
    },
    required: ["serviceName"],
  },
};
