// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_call_function: Tool = {
  name: "sap_call_function",
  description: "Call an OData function import",
  inputSchema: {
    type: "object",
    properties: {
      serviceName: { type: "string", description: "Name of the OData service" },
      functionName: {
        type: "string",
        description: "Name of the function to call",
      },
      parameters: {
        type: "object",
        description: "Function parameters",
        additionalProperties: true,
      },
    },
    required: ["serviceName", "functionName"],
  },
};
