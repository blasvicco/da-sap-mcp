// Libs imports
import {
  CallToolResult,
  Tool,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

// App imports
import { ClientRef } from "@/base.handler";

// Tool clients/handlers
import { HConnection } from "@/tools/connection/handler";
import { HEntity } from "@/tools/entity/handler";
import { HQuery } from "@/tools/query/handler";
import { HService } from "@/tools/service/handler";

// Tool definitions — connection
import { sap_connect } from "@/tools/connection/definitions/sap.connect";
import { sap_disconnect } from "@/tools/connection/definitions/sap.disconnect";
import { sap_connection_status } from "@/tools/connection/definitions/sap.status";

// Tool definitions — service
import { sap_services_get } from "@/tools/service/definitions/sap.get";
import { sap_service_metadata_get } from "@/tools/service/definitions/sap.metadata";

// Tool definitions — entity
import { sap_entity_create } from "@/tools/entity/definitions/sap.create";
import { sap_entity_delete } from "@/tools/entity/definitions/sap.delete";
import { sap_entity_get } from "@/tools/entity/definitions/sap.get";
import { sap_entity_update } from "@/tools/entity/definitions/sap.update";

// Tool definitions — query
import { sap_call_function } from "@/tools/query/definitions/sap.call.function";
import { sap_query_entity_set } from "@/tools/query/definitions/sap.entity.set";

// Tool definitions list
export const toolDefinitions: Tool[] = [
  sap_connect,
  sap_connection_status,
  sap_disconnect,
  sap_services_get,
  sap_service_metadata_get,
  sap_entity_get,
  sap_entity_create,
  sap_entity_update,
  sap_entity_delete,
  sap_query_entity_set,
  sap_call_function,
];

type ToolHandler = (args: unknown) => Promise<CallToolResult>;

export class HMcpRegistry {
  private readonly clientRef: ClientRef = { client: null, metadataCache: new Map() };
  private readonly registry: ReadonlyMap<string, ToolHandler>;
  readonly connection: HConnection;
  readonly entity: HEntity;
  readonly query: HQuery;
  readonly service: HService;

  constructor() {
    this.connection = new HConnection(this.clientRef);
    this.entity = new HEntity(this.clientRef);
    this.query = new HQuery(this.clientRef);
    this.service = new HService(this.clientRef);

    this.registry = new Map<string, ToolHandler>([
      [
        "sap_connect",
        this.connection.connect.bind(this.connection) as ToolHandler,
      ],
      [
        "sap_connection_status",
        this.connection.getStatus.bind(this.connection) as ToolHandler,
      ],
      [
        "sap_disconnect",
        this.connection.disconnect.bind(this.connection) as ToolHandler,
      ],
      [
        "sap_entity_get",
        this.entity.getEntity.bind(this.entity) as ToolHandler,
      ],
      [
        "sap_entity_create",
        this.entity.createEntity.bind(this.entity) as ToolHandler,
      ],
      [
        "sap_entity_update",
        this.entity.updateEntity.bind(this.entity) as ToolHandler,
      ],
      [
        "sap_entity_delete",
        this.entity.deleteEntity.bind(this.entity) as ToolHandler,
      ],
      [
        "sap_query_entity_set",
        this.query.queryEntitySet.bind(this.query) as ToolHandler,
      ],
      [
        "sap_call_function",
        this.query.callFunction.bind(this.query) as ToolHandler,
      ],
      [
        "sap_services_get",
        ((args: unknown) =>
          this.service.getServices(
            args as Parameters<typeof this.service.getServices>[0],
          )) as ToolHandler,
      ],
      [
        "sap_service_metadata_get",
        this.service.getServiceMetadata.bind(this.service) as ToolHandler,
      ],
    ]);
  }

  route(toolName: string): ToolHandler {
    const handler = this.registry.get(toolName);
    if (!handler) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }
    return handler;
  }
}
