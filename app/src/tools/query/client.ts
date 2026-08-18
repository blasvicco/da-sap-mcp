// App imports
import { CDriverB1S } from "@/auth";
import { ABaseClient } from "@/base.client";
import { ODataQueryOptions } from "@/odata.types";

export class CQuery extends ABaseClient {
  async callFunction(
    serviceName: string,
    functionName: string,
    parameters: Record<string, unknown> = {},
  ): Promise<unknown> {
    this._ensureConnected();

    try {
      const params = new URLSearchParams();
      Object.entries(parameters).forEach(([key, value]) =>
        params.append(key, String(value)),
      );

      const queryString = params.toString().replace(/\+/g, '%20');
      const basePath = serviceName ? `${serviceName}/${functionName}` : functionName;
      const url = `${basePath}${queryString ? "?" + queryString : ""}`;
      const response = await this.httpClient.get(url);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to call function ${functionName}: ${this._errorMessage(error)}`,
      );
    }
  }

  async callAction(
    actionName: string,
    parameters: Record<string, unknown> = {},
  ): Promise<unknown> {
    this._ensureConnected();
    try {
      const response = await this.httpClient.post(actionName, parameters);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to call action ${actionName}: ${this._errorMessage(error)}`,
      );
    }
  }

  async queryEntitySet(
    serviceName: string,
    entitySet: string,
    options: ODataQueryOptions = {},
  ): Promise<unknown> {
    this._ensureConnected();

    try {
      const params = new URLSearchParams();
      if (options.select?.length) {
        params.append("$select", options.select.join(","));
      }
      if (options.filter) {
        params.append("$filter", options.filter);
      }
      if (options.orderby) {
        params.append("$orderby", options.orderby);
      }
      if (options.top != null) {
        params.append("$top", String(options.top));
      }
      if (options.skip != null) {
        params.append("$skip", String(options.skip));
      }
      if (options.expand?.length) {
        params.append("$expand", options.expand.join(","));
      }

      const queryString = params.toString().replace(/\+/g, '%20');
      // Trim whitespace and deduplicate: B1S agents sometimes send a space or
      // echo serviceName into entitySet, both producing a broken URL (HTTP 400).
      const trimmedEntitySet = entitySet.trim();
      const resolvedEntitySet = !trimmedEntitySet || trimmedEntitySet === serviceName ? "" : trimmedEntitySet;
      const basePath = [serviceName, resolvedEntitySet].filter(Boolean).join("/");
      const url = `${basePath}${queryString ? "?" + queryString : ""}`;

      // Always request case-insensitive comparisons on B1S: it rejects tolower()/toupper() outright (HTTP 400),
      // so this per-request header is the only way to get case-insensitive filtering. Harmless on SQL-Server-backed
      // company DBs (already case-insensitive by collation); needed on HANA-backed DBs (case-sensitive by default).
      const headers = this.authDriver instanceof CDriverB1S
        ? { "B1S-CaseInsensitive": "true" }
        : undefined;

      const response = await this.httpClient.get(url, { headers });
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to query entity set ${entitySet}: ${this._errorMessage(error)}`,
      );
    }
  }
}
