// Lib imports
import { promisify } from "util";
import { parseString } from "xml2js";

// App imports
import { ABaseClient } from "@/base.client";
import {
  ODataEntity,
  ODataFunction,
  ODataMetadata,
  ODataService,
  ODataServiceList,
} from "@/odata.types";
import { CDriverB1S } from "@/auth/driver.b1s";

const parseXML = promisify(parseString);

// --- Type helpers for xml2js parsing ---
interface XmlElement {
  $: Record<string, string>;
  $$?: string;
  [childName: string]:
    | XmlElement[]
    | string
    | Record<string, string>
    | undefined;
}

interface CatalogServiceResult {
  ID: string;
  Title?: string;
  Version?: string;
}

export class CService extends ABaseClient {
  async getServiceMetadata(serviceName: string): Promise<ODataMetadata> {
    this._ensureConnected();

    try {
      const response = await this.httpClient.get(`${serviceName}/$metadata`, {
        headers: { Accept: "application/xml" },
      });
      const parsed = (await parseXML(response.data)) as XmlElement;
      return this.__extractMetadata(parsed);
    } catch (error) {
      throw new Error(
        `Failed to get service metadata: ${this._errorMessage(error)}`,
      );
    }
  }

  async getServices(): Promise<ODataServiceList> {
    this._ensureConnected();

    if (this.authDriver instanceof CDriverB1S) {
      try {
        console.log("Fetching B1S service document...");
        const response = await this.httpClient.get("", {
          headers: { Accept: "application/json" },
        });

        let services: ODataService[] = [];
        const rawData =
          response.data?.value ??
          response.data?.d?.results ??
          response.data?.d?.EntitySets;

        if (Array.isArray(rawData)) {
          services = rawData
            .map((item: string | { name?: string; url?: string }) => {
              const name =
                typeof item === "string" ? item : item.name || item.url || "";
              return {
                name,
                title: name,
                url: `${this.getConnectionInfo().baseUrl}${name}/`,
              };
            })
            .filter((s) => s.name);
        }

        if (services.length > 0) {
          return { services, source: "b1s_service_document" };
        }
      } catch (error) {
        console.warn(
          `Failed to fetch B1S service document: ${(error as Error).message}`,
        );
      }
    }

    const catalogPaths = [
      "../iwfnd/catalogservice;v=2/ServiceCollection",
      "../IWFND/CATALOGSERVICE;v=2/ServiceCollection",
      "../iwfnd/catalogservice/ServiceCollection",
      "../IWFND/CATALOGSERVICE/ServiceCollection",
    ];

    for (const catalogPath of catalogPaths) {
      try {
        console.log(`Trying catalog service at: ${catalogPath}`);
        const response = await this.httpClient.get(catalogPath, {
          headers: { Accept: "application/json" },
        });

        if (response.data?.d?.results) {
          const services: ODataService[] = response.data.d.results.map(
            (svc: CatalogServiceResult) => ({
              name: svc.ID,
              title: svc.Title || svc.ID,
              version: svc.Version,
              url: `${this.getConnectionInfo().baseUrl}${svc.ID}/`,
            }),
          );
          return {
            services,
            source: "gateway_catalog",
            catalogUrl: catalogPath,
          };
        }
      } catch (error) {
        console.log(
          `Catalog path ${catalogPath} failed: ${(error as { response?: { status?: number }; message: string }).response?.status ?? (error as Error).message}`,
        );
      }
    }

    console.log(
      "Catalog service not available — probing common service names.",
    );
    const commonServices = [
      "GWSAMPLE_BASIC",
      "GWDEMO",
      "RMTSAMPLEFLIGHT",
      "API_MATERIAL_SRV",
      "API_BUSINESS_PARTNER",
      "API_SALES_ORDER_SRV",
      "ZMM_MATERIAL_SRV",
      "ZSD_SALES_SRV",
      "ZFI_GL_SRV",
    ];

    const foundServices: ODataService[] = [];
    for (const name of commonServices) {
      try {
        await this.httpClient.get(`${name}/`, {
          headers: { Accept: "application/xml" },
          timeout: 5000,
        });
        foundServices.push({
          name,
          title: name,
          url: `${this.getConnectionInfo().baseUrl}${name}/`,
        });
      } catch {
        // not found / not accessible — skip
      }
    }

    if (foundServices.length > 0) {
      return { services: foundServices, source: "common_services_test" };
    }

    return {
      services: [],
      source: "none_found",
      message:
        "No services found. The base URL is reachable but specific services need " +
        "to be discovered through SAP GUI (transaction /IWFND/MAINT_SERVICE) or by " +
        "testing known service names.",
    };
  }

  async getSelectableProperties(serviceName: string, entitySetName: string): Promise<string[]> {
    try {
      const metadata = await this.getServiceMetadata(serviceName);
      if (!metadata.entities || metadata.entities.length === 0) return [];

      // Build candidate entity type names from most to least specific
      const candidates = [
        entitySetName,
        entitySetName.replace(/Set$/i, ""),
        entitySetName.replace(/s$/i, ""),
        serviceName,
        serviceName.replace(/s$/i, ""),
      ].filter(Boolean).map((c) => c.toLowerCase());

      const entity =
        metadata.entities.find((e) => candidates.includes(e.name.toLowerCase())) ??
        (metadata.entities.length === 1 ? metadata.entities[0] : null);

      if (!entity) return [];
      return entity.properties.map((p) => p.name);
    } catch {
      return [];
    }
  }

  private __extractMetadata(parsed: XmlElement): ODataMetadata {
    try {
      const edmx = parsed?.["edmx:Edmx"] as XmlElement | undefined;
      const dataServices = (
        edmx?.["edmx:DataServices"] as XmlElement[] | undefined
      )?.[0];
      const schema = (dataServices?.Schema as XmlElement[] | undefined)?.[0];
      if (!schema) return { entities: [], functions: [] };

      const rawEntities = (schema.EntityType || []) as XmlElement[];
      const entities: ODataEntity[] = rawEntities.map((entity: XmlElement) => ({
        name: entity.$.Name,
        properties: ((entity.Property || []) as XmlElement[]).map(
          (prop: XmlElement) => ({
            name: prop.$.Name,
            type: prop.$.Type,
            nullable: prop.$.Nullable !== "false",
          }),
        ),
      }));

      const entityContainer = (
        schema.EntityContainer as XmlElement[] | undefined
      )?.[0];
      const rawFunctions = (entityContainer?.FunctionImport ||
        []) as XmlElement[];
      const functions: ODataFunction[] = rawFunctions.map(
        (func: XmlElement) => ({
          name: func.$.Name,
          returnType: func.$.ReturnType,
        }),
      );

      return { entities, functions };
    } catch (parseErr) {
      const parseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      return { entities: [], functions: [], raw: parsed, parseError: parseMsg };
    }
  }
}
