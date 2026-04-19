import type { IAgentRuntime } from "@elizaos/core";
import { SignalStationService } from "../services/station-service.js";
import { SignalApiError } from "../types.js";

export function getService(runtime: IAgentRuntime): SignalStationService {
  const svc = runtime.getService<SignalStationService>(
    SignalStationService.serviceType,
  );
  if (!svc) {
    throw new Error(
      `SignalStationService not registered — include sectorOnePlugin in the character's plugins`,
    );
  }
  return svc;
}

export function errorText(err: unknown): string {
  if (err instanceof SignalApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
