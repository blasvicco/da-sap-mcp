// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_entity_create: Tool = {
  name: "sap_entity_create",
  description: "Create a new entity in an entity set.",
  inputSchema: {
    type: "object",
    properties: {
      serviceName: { type: "string", description: "Name of the OData service" },
      entitySet: { type: "string", description: "Name of the entity set" },
      data: {
        type: "object",
        description: "Entity data to create",
        additionalProperties: true,
      },
    },
    required: ["serviceName", "entitySet", "data"],
  },
};
