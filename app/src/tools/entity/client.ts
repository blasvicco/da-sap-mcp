// App imports
import { ABaseClient } from "@/base.client";

export class CEntity extends ABaseClient {
  async createEntity(
    serviceName: string,
    entitySet: string,
    data: Record<string, unknown>,
  ): Promise<unknown> {
    this._ensureConnected();

    try {
      const basePath = [serviceName, entitySet].filter(Boolean).join("/");
      const response = await this.httpClient.post(basePath, data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create entity: ${this._errorMessage(error)}`);
    }
  }

  async deleteEntity(
    serviceName: string,
    entitySet: string,
    keyValues: Record<string, string | number>,
  ): Promise<void> {
    this._ensureConnected();

    try {
      const keyString = this.__buildKeyString(keyValues);
      const basePath = [serviceName, entitySet].filter(Boolean).join("/");
      await this.httpClient.delete(`${basePath}(${keyString})`);
    } catch (error) {
      throw new Error(`Failed to delete entity: ${this._errorMessage(error)}`);
    }
  }

  async getEntity(
    serviceName: string,
    entitySet: string,
    keyValues: Record<string, string | number>,
    expand?: string[],
  ): Promise<unknown> {
    this._ensureConnected();

    try {
      const keyString = this.__buildKeyString(keyValues);
      const basePath = [serviceName, entitySet].filter(Boolean).join("/");

      const params = new URLSearchParams();
      if (expand?.length) {
        params.append("$expand", expand.join(","));
      }
      const queryString = params.toString().replace(/\+/g, '%20');
      const url = `${basePath}(${keyString})${queryString ? "?" + queryString : ""}`;

      const response = await this.httpClient.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get entity: ${this._errorMessage(error)}`);
    }
  }

  async updateEntity(
    serviceName: string,
    entitySet: string,
    keyValues: Record<string, string | number>,
    data: Record<string, unknown>,
  ): Promise<unknown> {
    this._ensureConnected();

    try {
      const keyString = this.__buildKeyString(keyValues);
      const basePath = [serviceName, entitySet].filter(Boolean).join("/");
      const response = await this.httpClient.put(`${basePath}(${keyString})`, data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update entity: ${this._errorMessage(error)}`);
    }
  }

  private __buildKeyString(keyValues: Record<string, string | number>): string {
    return Object.entries(keyValues)
      .map(([key, value]) => {
        if (typeof value === "number") {
          return `${key}=${value}`;
        }
        return `${key}='${encodeURIComponent(value)}'`;
      })
      .join(",");
  }
}
