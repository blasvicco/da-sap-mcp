// Libs imports
import { z as zod } from "zod";

// App imports
import { ABaseHandler, ClientRef } from "@/base.handler";
import {
  ODataEntity,
  ODataFunction,
  ODataProperty,
  ODataService,
  ODataServiceList,
} from "@/odata.types";
import { SServicesGet, SServiceMetadataGet } from "@/tools/service/schema";

export class HService extends ABaseHandler {
  constructor(clientRef: ClientRef) {
    super(clientRef);
  }

  async getServiceMetadata(args: zod.input<typeof SServiceMetadataGet>) {
    await this._ensureConnected(args.connection);

    try {
      const result = await this._client.getServiceMetadata(args.serviceName);
      let responseText = `SAP OData Service Metadata for ${args.serviceName}:\n\n`;

      if (result.entities && result.entities.length > 0) {
        responseText += `Entity Types (${result.entities.length}):\n`;
        result.entities.forEach((entity: ODataEntity) => {
          responseText += `\n- ${entity.name}:\n`;
          (entity.properties ?? []).forEach((prop: ODataProperty) => {
            responseText += `  • ${prop.name}: ${prop.type}${prop.nullable ? "" : " (required)"}\n`;
          });
        });
      }

      if (result.functions && result.functions.length > 0) {
        responseText += `\n\nFunction Imports (${result.functions.length}):\n`;
        result.functions.forEach((func: ODataFunction) => {
          responseText += `\n- ${func.name}`;
          if (func.returnType) responseText += ` → ${func.returnType}`;
          responseText += `\n`;
        });
      }

      return {
        content: [{ type: "text", text: responseText }],
        _rawData: result,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get service metadata: ${msg}`);
    }
  }

  async getServices(args?: zod.input<typeof SServicesGet>) {
    await this._ensureConnected(args?.connection);

    try {
      const result = await this._client.getServices();

      const serviceResult = result as ODataServiceList;
      let responseText = `SAP OData Service Discovery Results:\n\n`;

      if (serviceResult.services && serviceResult.services.length > 0) {
        responseText += `✅ Found ${serviceResult.services.length} services`;
        if (serviceResult.source)
          responseText += ` (via ${serviceResult.source})`;
        responseText += `:\n\n`;

        serviceResult.services.forEach(
          (service: ODataService, index: number) => {
            responseText += `${index + 1}. ${service.name}\n`;
            if (service.title && service.title !== service.name) {
              responseText += `   Title: ${service.title}\n`;
            }
            if (service.url) {
              responseText += `   URL: ${service.url}\n`;
            }
            if (service.version) {
              responseText += `   Version: ${service.version}\n`;
            }
            responseText += `\n`;
          },
        );

        responseText += `💡 To use these services:\n`;
        responseText += `1. Get metadata: "Get metadata for service ${serviceResult.services[0].name}"\n`;
        responseText += `2. Query data: "Query [EntitySet] from ${serviceResult.services[0].name}"\n`;
      } else {
        responseText += `❌ No OData services found.\n\n`;
        responseText += `This could mean:\n`;
        responseText += `1. No services are activated on this SAP system\n`;
        responseText += `2. The catalog service is not accessible\n`;
        responseText += `3. Different authorization is needed\n\n`;
        responseText += `💡 Try these steps:\n`;
        responseText += `1. Contact SAP administrator to verify OData service activation\n`;
        responseText += `2. Check SAP GUI: Transaction /IWFND/MAINT_SERVICE\n`;
        responseText += `3. Run local discovery: npm run discover:services\n`;
        if (serviceResult.message) {
          responseText += `\nNote: ${serviceResult.message}`;
        }
      }

      return {
        content: [{ type: "text", text: responseText }],
        _rawData: result,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get OData services: ${msg}`);
    }
  }
}
