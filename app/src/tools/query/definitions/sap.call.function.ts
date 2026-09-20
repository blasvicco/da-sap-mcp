// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_call_function: Tool = {
  name: "sap_call_function",
  description:
    "Call an OData function import. By default this calls serviceName/functionName (a plain service-level function). " +
    "For a function bound to a specific entity instance — e.g. SAP B1S SQLQueries('MyQueryCode')/List — pass the key " +
    "in entityKey and the call becomes serviceName('entityKey')/functionName instead.",
  inputSchema: {
    type: "object",
    properties: {
      serviceName: { type: "string", description: "Name of the OData service" },
      functionName: {
        type: "string",
        description: "Name of the function to call",
      },
      entityKey: {
        type: ["string", "number"],
        description:
          "Optional primary key binding the call to a specific entity instance, producing " +
          "serviceName('entityKey')/functionName instead of serviceName/functionName. This is a URL path segment, " +
          "distinct from 'parameters' (sent as query-string arguments). Omit for plain service-level functions.",
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
