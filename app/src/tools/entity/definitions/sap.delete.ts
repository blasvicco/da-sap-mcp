// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_entity_delete: Tool = {
  name: "sap_entity_delete",
  description: "Delete an entity",
  inputSchema: {
    type: "object",
    properties: {
      serviceName: { type: "string", description: "Name of the OData service" },
      entitySet: { type: "string", description: "Name of the entity set" },
      keyValues: {
        type: "object",
        description: "Key-value pairs for entity keys",
        additionalProperties: true,
      },
    },
    required: ["serviceName", "entitySet", "keyValues"],
  },
};
