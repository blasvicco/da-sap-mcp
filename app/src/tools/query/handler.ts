// Libs imports
import { z as zod } from "zod";

// App imports
import { ABaseHandler, ClientRef } from "@/base.handler";
import { SQueryCallFunction, SQueryEntitySet } from "@/tools/query/schema";

export class HQuery extends ABaseHandler {
  constructor(clientRef: ClientRef) {
    super(clientRef);
  }

  async callFunction(args: zod.input<typeof SQueryCallFunction>) {
    await this._ensureConnected(args.connection);

    try {
      const result = await this._client.callFunction(
        args.serviceName,
        args.functionName,
        args.parameters ?? {},
      );

      let responseText = `SAP OData Function Result for ${args.serviceName}/${args.functionName}:\n\n`;

      if (args.parameters && Object.keys(args.parameters).length > 0) {
        responseText += `Parameters: ${JSON.stringify(args.parameters, null, 2)}\n\n`;
      }

      responseText += `Result:\n${JSON.stringify(result, null, 2)}`;

      return {
        content: [{ type: "text", text: responseText }],
        _rawData: result,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to call function ${args.functionName}: ${msg}`);
    }
  }

  async queryEntitySet(args: zod.input<typeof SQueryEntitySet>) {
    await this._ensureConnected(args.connection);

    let selectWarning = "";
    let selectFields = args.select ?? undefined;

    if (selectFields && selectFields.length > 0) {
      const cacheKey = `${args.serviceName}:${args.entitySet}`;
      if (!this.clientRef.metadataCache.has(cacheKey)) {
        const validProps = await this._client.getSelectableProperties(args.serviceName, args.entitySet);
        this.clientRef.metadataCache.set(cacheKey, validProps);
      }
      const validProps = this.clientRef.metadataCache.get(cacheKey) ?? [];
      if (validProps.length > 0) {
        const removed = selectFields.filter((f) => !validProps.includes(f));
        selectFields = selectFields.filter((f) => validProps.includes(f));
        if (removed.length > 0) {
          selectWarning =
            `WARNING: Removed invalid $select fields (not on this entity): [${removed.join(", ")}]. ` +
            `Used: [${selectFields.join(", ")}].\n\n`;
        }
      }
    }

    try {
      const result = await this._client.queryEntitySet(
        args.serviceName,
        args.entitySet,
        {
          select: selectFields,
          filter: args.filter ?? undefined,
          orderby: args.orderby ?? undefined,
          top: args.top ?? undefined,
          skip: args.skip ?? undefined,
          expand: args.expand ?? undefined,
        },
      );

      let responseText = selectWarning;
      responseText += `SAP OData Query Results for ${args.serviceName}/${args.entitySet}:\n\n`;

      const records =
        (result as { d?: { results?: unknown[] }; value?: unknown[] })?.d
          ?.results ?? (result as { value?: unknown[] })?.value;
      if (records) {
        responseText += `Records found: ${records.length}\n\n`;
        if (records.length > 0) {
          const limit = args.top != null ? records.length : 3;
          const shown = records.slice(0, limit).map(HQuery.__stripNestedArrays);
          responseText += `Data:\n`;
          responseText += JSON.stringify(shown, null, 2);
          if (records.length > limit) {
            responseText += `\n\n... and ${records.length - limit} more records (set 'top' to retrieve more)`;
          }
        }
      } else {
        responseText += "No data found matching the criteria.";
      }

      const queryParams: string[] = [];
      if (selectFields && selectFields.length > 0) {
        queryParams.push(`$select: ${selectFields.join(", ")}`);
      }
      if (args.filter) {
        queryParams.push(`$filter: ${args.filter}`);
      }
      if (args.orderby) {
        queryParams.push(`$orderby: ${args.orderby}`);
      }
      if (args.top) {
        queryParams.push(`$top: ${args.top}`);
      }
      if (args.skip) {
        queryParams.push(`$skip: ${args.skip}`);
      }
      if (args.expand) {
        queryParams.push(`$expand: ${args.expand.join(", ")}`);
      }

      if (queryParams.length > 0) {
        responseText += `\n\nQuery parameters used:\n${queryParams.join("\n")}`;
      }

      return {
        content: [{ type: "text", text: responseText }],
        _rawData: result,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("Unrecognized resource path") ||
        msg.includes("Resource not found")
      ) {
        try {
          const serviceList = await this._client.getServices();
          const names = (serviceList as { services?: { name: string }[] })
            ?.services?.map((s) => s.name) ?? [];
          const hint =
            names.length > 0
              ? `Available entity sets:\n${names.join("\n")}`
              : "No entity sets could be discovered automatically. Use sap_services_get to list them.";
          throw new Error(
            `Entity "${args.serviceName}" does not exist in SAP B1S. ${hint}`,
          );
        } catch (innerError) {
          const innerMsg =
            innerError instanceof Error ? innerError.message : String(innerError);
          if (innerMsg.includes("does not exist in SAP B1S")) throw innerError;
        }
      }
      throw new Error(`Failed to query entity set: ${msg}`);
    }
  }

  private static __stripNestedArrays(record: unknown): unknown {
    if (typeof record !== "object" || record === null) return record;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      record as Record<string, unknown>,
    )) {
      if (!Array.isArray(value)) {
        result[key] = value;
      }
    }
    return result;
  }
}
