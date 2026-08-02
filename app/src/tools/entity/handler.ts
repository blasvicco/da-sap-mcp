// Libs imports
import { z as zod } from "zod";

// App imports
import { ABaseHandler, ClientRef } from "@/base.handler";
import {
  SEntityCreate,
  SEntityDelete,
  SEntityGet,
  SEntityUpdate,
} from "./schema";

export class HEntity extends ABaseHandler {
  constructor(clientRef: ClientRef) {
    super(clientRef);
  }

  async createEntity(args: zod.input<typeof SEntityCreate>) {
    await this._ensureConnected(args.connection);

    try {
      const result = await this._client.createEntity(
        args.serviceName,
        args.entitySet,
        args.data,
      );

      let responseText = `SAP OData Entity Created in ${args.serviceName}/${args.entitySet}:\n\n`;
      responseText += `Input data:\n${JSON.stringify(args.data, null, 2)}\n\n`;
      responseText += `Created entity:\n${JSON.stringify((result as { d?: unknown }).d ?? result, null, 2)}`;

      return {
        content: [{ type: "text", text: responseText }],
        _rawData: result,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create entity: ${msg}`);
    }
  }

  async deleteEntity(args: zod.input<typeof SEntityDelete>) {
    await this._ensureConnected(args.connection);

    try {
      await this._client.deleteEntity(
        args.serviceName,
        args.entitySet,
        args.keyValues as Record<string, string | number>,
      );

      let responseText = `SAP OData Entity Deleted from ${args.serviceName}/${args.entitySet}:\n\n`;
      responseText += `Key values: ${JSON.stringify(args.keyValues, null, 2)}\n\n`;
      responseText += `Entity successfully deleted`;

      return { content: [{ type: "text", text: responseText }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete entity: ${msg}`);
    }
  }

  async getEntity(args: zod.input<typeof SEntityGet>) {
    await this._ensureConnected(args.connection);

    try {
      const result = await this._client.getEntity(
        args.serviceName,
        args.entitySet,
        args.keyValues as Record<string, string | number>,
      );

      let responseText = `SAP OData Entity from ${args.serviceName}/${args.entitySet}:\n\n`;
      responseText += `Key values: ${JSON.stringify(args.keyValues, null, 2)}\n\n`;
      responseText += `Entity data:\n${JSON.stringify((result as { d?: unknown }).d ?? result, null, 2)}`;

      return {
        content: [{ type: "text", text: responseText }],
        _rawData: result,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get entity: ${msg}`);
    }
  }

  async updateEntity(args: zod.input<typeof SEntityUpdate>) {
    await this._ensureConnected(args.connection);

    try {
      const result = await this._client.updateEntity(
        args.serviceName,
        args.entitySet,
        args.keyValues as Record<string, string | number>,
        args.data,
      );

      let responseText = `SAP OData Entity Updated in ${args.serviceName}/${args.entitySet}:\n\n`;
      responseText += `Key values: ${JSON.stringify(args.keyValues, null, 2)}\n\n`;
      responseText += `Update data: ${JSON.stringify(args.data, null, 2)}\n\n`;
      responseText += `Update successful`;

      if (result && Object.keys(result).length > 0) {
        responseText += `\n\nResponse: ${JSON.stringify(result, null, 2)}`;
      }

      return {
        content: [{ type: "text", text: responseText }],
        _rawData: result,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update entity: ${msg}`);
    }
  }
}
