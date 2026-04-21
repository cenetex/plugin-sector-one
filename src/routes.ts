import type {
  IAgentRuntime,
  PluginAppBridgeLaunchContext,
  PluginAppBridgeRunContext,
  PluginAppLaunchDiagnostic,
  PluginAppSessionState,
} from "@elizaos/core";
import { SignalStationService } from "./services/station-service.js";
import { SignalApiError, type StationState } from "./types.js";
import { renderViewerHtml, VIEWER_FRAME_ANCESTORS_DIRECTIVE } from "./viewer.js";

const APP_NAME = "@cenetex/app-sector-one";
const APP_DISPLAY_NAME = "Signal: Sector One";
const APP_ROUTE_PREFIX = "/api/apps/sector-one";
const VIEWER_PATH = `${APP_ROUTE_PREFIX}/viewer`;

export interface RouteContext {
  method: string;
  pathname: string;
  url?: URL;
  runtime: unknown | null;
  res: unknown;
  error: (response: unknown, message: string, status?: number) => void;
  json: (response: unknown, data: unknown, status?: number) => void;
  readJsonBody: () => Promise<unknown>;
}

interface SessionTelemetry extends Record<string, unknown> {
  slot?: number;
  archetype?: string;
  hull?: number;
  hull_max?: number;
  credits?: number;
  owner_label?: string | null;
  prices?: StationState["prices"];
  inventory?: StationState["inventory"];
  docked_pilots?: StationState["docked_pilots"];
  apiUrl?: string;
  bound?: boolean;
}

function getRuntime(value: unknown): IAgentRuntime | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { agentId?: unknown; getService?: unknown };
  if (typeof candidate.getService !== "function") return null;
  return candidate as unknown as IAgentRuntime;
}

function tryGetService(runtime: IAgentRuntime | null): SignalStationService | null {
  if (!runtime) return null;
  try {
    return (
      runtime.getService<SignalStationService>(SignalStationService.serviceType) ?? null
    );
  } catch {
    return null;
  }
}

function getApiUrl(runtime: IAgentRuntime | null): string {
  const fromSetting =
    typeof runtime?.getSetting === "function"
      ? runtime.getSetting("SIGNAL_API_URL")
      : undefined;
  const v = typeof fromSetting === "string" && fromSetting.length > 0
    ? fromSetting
    : "https://signal.ratimics.com";
  return v.replace(/\/$/, "");
}

function getCharacterName(runtime: IAgentRuntime | null): string {
  const character = (runtime as { character?: { name?: string } } | null)?.character;
  return character?.name ?? "Eliza Agent";
}

function getSessionId(runtime: IAgentRuntime | null): string {
  const agentId = (runtime as { agentId?: string } | null)?.agentId;
  return agentId ? `sector-one:${agentId}` : "sector-one:anonymous";
}

const SUGGESTION_PROMPTS_BOUND = [
  "Walk me through the station's current ledger.",
  "Greet the next pilot to dock in your station's voice.",
  "Tune buy/sell prices around the current inventory.",
  "Spend credits on the highest-leverage upgrade.",
];

const SUGGESTION_PROMPTS_UNBOUND = [
  "Bind a station slot to claim Sector One.",
  "Set SIGNAL_API_URL to point at the station server.",
  "Mint a SIGNAL_AGENT_TOKEN via /agent/v1/bind.",
];

function buildSessionState(args: {
  runtime: IAgentRuntime | null;
  station: StationState | null;
  status: "running" | "connecting" | "unbound" | "degraded";
  summary: string;
}): PluginAppSessionState {
  const { runtime, station, status, summary } = args;
  const sessionId = getSessionId(runtime);
  const apiUrl = getApiUrl(runtime);
  const bound = Boolean(station);

  const telemetry: SessionTelemetry = {
    apiUrl,
    bound,
  };
  if (station) {
    telemetry.slot = station.slot;
    telemetry.archetype = station.archetype;
    telemetry.hull = station.hull;
    telemetry.hull_max = station.hull_max;
    telemetry.credits = station.credits;
    telemetry.owner_label = station.owner_label;
    telemetry.prices = station.prices;
    telemetry.inventory = station.inventory;
    telemetry.docked_pilots = station.docked_pilots;
  }

  const goalLabel = station
    ? `Sector One · slot ${station.slot} (${station.archetype})`
    : null;

  return {
    sessionId,
    appName: APP_NAME,
    mode: "spectate-and-steer",
    status,
    displayName: APP_DISPLAY_NAME,
    agentId: (runtime as { agentId?: string } | null)?.agentId,
    canSendCommands: bound,
    controls: ["pause", "resume"],
    summary,
    goalLabel,
    suggestedPrompts: bound ? SUGGESTION_PROMPTS_BOUND : SUGGESTION_PROMPTS_UNBOUND,
    telemetry: telemetry as PluginAppSessionState["telemetry"],
  };
}

async function fetchStation(
  service: SignalStationService | null,
): Promise<{ station: StationState | null; status: "running" | "unbound" | "degraded"; summary: string }> {
  if (!service) {
    return {
      station: null,
      status: "degraded",
      summary: "SignalStationService is not registered on the runtime.",
    };
  }
  try {
    const station = await service.getStation();
    return {
      station,
      status: "running",
      summary: `Slot ${station.slot} · ${station.archetype} · hull ${station.hull}/${station.hull_max} · ${station.credits.toLocaleString()} credits`,
    };
  } catch (err) {
    if (err instanceof SignalApiError && err.status === 401) {
      return {
        station: null,
        status: "unbound",
        summary: "No station bound. Run BIND_STATION (or set SIGNAL_AGENT_TOKEN) to claim a slot.",
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { station: null, status: "degraded", summary: message };
  }
}

function sendHtmlResponse(res: unknown, html: string): void {
  const response = res as {
    end: (body?: string) => void;
    setHeader: (name: string, value: string) => void;
    statusCode: number;
    removeHeader?: (name: string) => void;
    getHeader?: (name: string) => number | string | string[] | undefined;
  };
  response.statusCode = 200;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.removeHeader?.("X-Frame-Options");
  const existingCsp = response.getHeader?.("Content-Security-Policy");
  const normalized =
    typeof existingCsp === "string"
      ? existingCsp.trim()
      : Array.isArray(existingCsp)
        ? existingCsp.join("; ").trim()
        : "";
  const nextCsp = /\bframe-ancestors\b/i.test(normalized)
    ? normalized
    : normalized.length > 0
      ? `${normalized}; ${VIEWER_FRAME_ANCESTORS_DIRECTIVE}`
      : VIEWER_FRAME_ANCESTORS_DIRECTIVE;
  response.setHeader("Content-Security-Policy", nextCsp);
  response.end(html);
}

function parseSessionId(pathname: string): string | null {
  const m = pathname.match(/^\/api\/apps\/sector-one\/session\/([^/]+)(?:\/.*)?$/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function parseSessionSubroute(pathname: string): "command" | "control" | null {
  if (pathname.endsWith("/command")) return "command";
  if (pathname.endsWith("/control")) return "control";
  return null;
}

export async function resolveLaunchSession(
  ctx: PluginAppBridgeLaunchContext,
): Promise<PluginAppSessionState | null> {
  const runtime = getRuntime(ctx.runtime);
  const service = tryGetService(runtime);
  const { station, status, summary } = await fetchStation(service);
  return buildSessionState({ runtime, station, status, summary });
}

export async function refreshRunSession(
  ctx: PluginAppBridgeRunContext,
): Promise<PluginAppSessionState | null> {
  return resolveLaunchSession(ctx);
}

export async function collectLaunchDiagnostics(
  ctx: PluginAppBridgeRunContext,
): Promise<PluginAppLaunchDiagnostic[]> {
  const runtime = getRuntime(ctx.runtime);
  const service = tryGetService(runtime);
  const diagnostics: PluginAppLaunchDiagnostic[] = [];
  if (!service) {
    diagnostics.push({
      code: "sector-one-service-missing",
      severity: "error",
      message:
        "SignalStationService is not registered. Include @cenetex/app-sector-one in the character's plugins.",
    });
    return diagnostics;
  }
  if (ctx.session?.status === "unbound") {
    diagnostics.push({
      code: "sector-one-unbound",
      severity: "warning",
      message:
        ctx.session.summary ??
        "No station bound. Run BIND_STATION or set SIGNAL_AGENT_TOKEN to claim a slot.",
    });
  } else if (ctx.session?.status === "degraded") {
    diagnostics.push({
      code: "sector-one-api-degraded",
      severity: "warning",
      message:
        ctx.session.summary ??
        "Couldn't reach the Signal station API. Check SIGNAL_API_URL.",
    });
  }
  return diagnostics;
}

export async function handleAppRoutes(ctx: RouteContext): Promise<boolean> {
  const runtime = getRuntime(ctx.runtime);

  if (ctx.method === "GET" && ctx.pathname === VIEWER_PATH) {
    const role = ctx.url?.searchParams.get("role") === "agent" ? "agent" : "human";
    sendHtmlResponse(
      ctx.res,
      renderViewerHtml({
        agentName: getCharacterName(runtime),
        sessionId: getSessionId(runtime),
        apiBase: APP_ROUTE_PREFIX,
        role,
      }),
    );
    return true;
  }

  const sessionId = parseSessionId(ctx.pathname);
  if (!sessionId) return false;

  const subroute = parseSessionSubroute(ctx.pathname);
  const service = tryGetService(runtime);

  if (ctx.method === "GET" && !subroute) {
    const { station, status, summary } = await fetchStation(service);
    ctx.json(ctx.res, buildSessionState({ runtime, station, status, summary }));
    return true;
  }

  if (ctx.method === "POST" && subroute === "control") {
    ctx.json(ctx.res, {
      success: true,
      message: "Sector One has no server-side pause/resume; simulation runs on the station server.",
      session: null,
    });
    return true;
  }

  if (ctx.method === "POST" && subroute === "command") {
    const body = (await ctx.readJsonBody().catch(() => ({}))) as
      | { type?: string; prompt?: string; role?: string }
      | null;
    const { station, status, summary } = await fetchStation(service);
    const session = buildSessionState({ runtime, station, status, summary });
    ctx.json(ctx.res, {
      success: true,
      message: `Suggestion noted: ${body?.prompt ?? body?.type ?? "unknown"}`,
      session,
    });
    return true;
  }

  return false;
}
