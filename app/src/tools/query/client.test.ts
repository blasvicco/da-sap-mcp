// Libs imports
import { AxiosInstance } from "axios";

// App imports
import { CQuery } from "@/tools/query/client";
import { SConnection } from "@/tools/connection/schema";

function buildClient(): { client: CQuery; get: jest.SpyInstance } {
  const config = SConnection.parse({
    authDriver: "basic",
    baseUrl: "https://example.com/b1s/v1/",
    enableCSRF: false,
    password: "pass",
    username: "user",
  });
  const client = new CQuery(config);

  jest
    .spyOn(client as unknown as { _ensureConnected: () => void }, "_ensureConnected")
    .mockImplementation(() => undefined);

  const httpClient = (client as unknown as { httpClient: AxiosInstance }).httpClient;
  const get = jest.spyOn(httpClient, "get").mockResolvedValue({ data: {} });

  return { client, get };
}

describe("CQuery.callFunction", () => {
  it("keeps today's serviceName/functionName shape when entityKey is omitted", async () => {
    const { client, get } = buildClient();
    await client.callFunction("SQLQueries", "List");
    expect(get).toHaveBeenCalledWith("SQLQueries/List");
  });

  it("falls back to a bare functionName when serviceName is empty and entityKey is omitted", async () => {
    const { client, get } = buildClient();
    await client.callFunction("", "SomeFunction");
    expect(get).toHaveBeenCalledWith("SomeFunction");
  });

  it("binds a numeric entityKey without quoting", async () => {
    const { client, get } = buildClient();
    await client.callFunction("Invoices", "Cancel", 21);
    expect(get).toHaveBeenCalledWith("Invoices(21)/Cancel");
  });

  it("binds a string entityKey wrapped in quotes", async () => {
    const { client, get } = buildClient();
    await client.callFunction("SQLQueries", "List", "GetInvoiceQR");
    expect(get).toHaveBeenCalledWith("SQLQueries('GetInvoiceQR')/List");
  });

  it("URL-encodes a string entityKey before quoting", async () => {
    const { client, get } = buildClient();
    await client.callFunction("SQLQueries", "List", "My Query");
    expect(get).toHaveBeenCalledWith("SQLQueries('My%20Query')/List");
  });

  it("combines a keyed entity path with query-string parameters", async () => {
    const { client, get } = buildClient();
    await client.callFunction("SQLQueries", "List", "GetInvoiceQR", {
      DocEntry: 45501,
    });
    expect(get).toHaveBeenCalledWith("SQLQueries('GetInvoiceQR')/List?DocEntry=45501");
  });
});
