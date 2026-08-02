// Libs imports
import { AxiosInstance } from "axios";

export abstract class ABaseDriver {
  abstract applyToAxios(client: AxiosInstance): void;
  abstract connect(client: AxiosInstance): Promise<void>;
  abstract describe(): string;
  abstract disconnect(): void;
  abstract hasCSRFToken(): boolean;
  abstract onUnauthorized(): void;
}
