// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_entity_update: Tool = {
  name: "sap_entity_update",
  description: "Update an existing entity",
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
      data: {
        type: "object",
        description: "Entity data to update",
        additionalProperties: true,
      },
    },
    required: ["serviceName", "entitySet", "keyValues", "data"],
  },
};
