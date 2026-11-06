/**
 * Read-only HL7 FHIR R4 REST API (server side).
 *
 *   GET /api/fhir/metadata                        CapabilityStatement (no auth)
 *   GET /api/fhir/Patient?identifier=[system|]v   search by MRN or national ID
 *   GET /api/fhir/Patient?_id=<id>                search by id
 *   GET /api/fhir/Patient/<id>                    read
 *   GET /api/fhir/Patient/<id>/$everything        the patient's full record (searchset)
 *
 * Callers authenticate with a staff member's access token (Authorization: Bearer).
 * Every query runs as that user, so the database's row-level security decides what
 * they may see, and each read is written to the append-only event ledger.
 */
import {
  buildPatientBundle,
  SYSTEMS,
  type DbClient,
  type FhirBundle,
  type FhirResource,
} from "@/lib/hip/fhir";
import { NATIONAL_ID_SYSTEM, normaliseNationalId } from "@/lib/hip/mpi";
import { ROUTE_PERMISSIONS } from "@/lib/hip/rbac";

export const FHIR_CONTENT_TYPE = "application/fhir+json; charset=utf-8";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEARCH_LIMIT = 50;

/** Roles allowed to use the API: the same people who can open the HIS page. */
export const FHIR_API_ROLES: readonly string[] = ROUTE_PERMISSIONS["/his"] ?? [];

export type FhirApiDeps = {
  /** A Supabase client that sends the caller's token, so RLS applies. */
  clientFor: (token: string) => DbClient;
  now?: () => Date;
};

type IssueCode = "security" | "not-found" | "not-supported" | "invalid" | "exception" | "forbidden";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, accept",
  "access-control-max-age": "600",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": FHIR_CONTENT_TYPE, "cache-control": "no-store", ...CORS, ...extra },
  });
}

export function operationOutcome(status: number, code: IssueCode, diagnostics: string): Response {
  return json(
    {
      resourceType: "OperationOutcome",
      issue: [{ severity: "error", code, diagnostics }],
    },
    status,
    status === 401 ? { "www-authenticate": 'Bearer realm="furii-fhir"' } : {},
  );
}

export function capabilityStatement(baseUrl: string, now: Date): Record<string, unknown> {
  return {
    resourceType: "CapabilityStatement",
    status: "active",
    date: now.toISOString(),
    publisher: "Furii Health Information System",
    kind: "instance",
    software: { name: "Furii HIS FHIR API" },
    implementation: { description: "Read-only HL7 FHIR R4 API", url: baseUrl },
    fhirVersion: "4.0.1",
    format: ["application/fhir+json", "json"],
    rest: [
      {
        mode: "server",
        security: {
          description:
            "Bearer access token of a staff account with HIS access. Row-level security applies to every read.",
        },
        resource: [
          {
            type: "Patient",
            interaction: [{ code: "read" }, { code: "search-type" }],
            searchParam: [
              { name: "_id", type: "token" },
              {
                name: "identifier",
                type: "token",
                documentation: `MRN (${SYSTEMS.mrn}) or national ID (${NATIONAL_ID_SYSTEM})`,
              },
            ],
            operation: [
              {
                name: "everything",
                definition: "http://hl7.org/fhir/OperationDefinition/Patient-everything",
              },
            ],
          },
        ],
      },
    ],
  };
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const token = match?.[1] ?? null;
  return token && token.split(".").length === 3 ? token : null;
}

function searchset(
  baseUrl: string,
  self: string,
  resources: FhirResource[],
  now: Date,
): FhirBundle {
  return {
    resourceType: "Bundle",
    id: crypto.randomUUID(),
    meta: { lastUpdated: now.toISOString(), source: "urn:furii:his" },
    identifier: { system: "urn:furii:fhir-api", value: crypto.randomUUID() },
    type: "searchset",
    timestamp: now.toISOString(),
    total: resources.length,
    link: [{ relation: "self", url: self }],
    entry: resources.map((resource) => ({
      fullUrl: `${baseUrl}/${resource.resourceType}/${resource.id}`,
      resource,
      search: { mode: "match" as const },
    })),
  };
}

async function logAccess(client: DbClient, patientId: string | null, interaction: string) {
  // Best effort: a ledger hiccup must not turn a permitted read into an error.
  try {
    await client.rpc("emit_event", {
      _event_type: "fhir.api_read",
      _payload: { interaction } as never,
      _department_code: "HIS",
      ...(patientId ? { _entity_type: "patient", _entity_id: patientId } : {}),
      _severity: "info",
    });
  } catch {
    /* ignored */
  }
}

/** Patient ids matching an identifier token: "system|value", "|value" or bare "value". */
async function patientIdsForIdentifier(client: DbClient, token: string): Promise<string[]> {
  const bar = token.indexOf("|");
  const system = bar >= 0 ? token.slice(0, bar) : "";
  const value = (bar >= 0 ? token.slice(bar + 1) : token).trim();
  if (!value) return [];
  const ids = new Set<string>();
  if (!system || system === SYSTEMS.mrn) {
    const { data, error } = await client.from("patients").select("id").eq("mrn", value).limit(5);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) ids.add(row.id);
  }
  if (!system || system === NATIONAL_ID_SYSTEM) {
    const nid = normaliseNationalId(value);
    if (nid) {
      const { data, error } = await client
        .from("events")
        .select("entity_id")
        .eq("event_type", "patient.consent_recorded")
        .eq("payload->>national_id", nid)
        .limit(5);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) if (row.entity_id) ids.add(row.entity_id);
    }
  }
  return [...ids];
}

async function patientResource(client: DbClient, id: string): Promise<FhirResource | null> {
  try {
    const { bundle } = await buildPatientBundle(id, client);
    return bundle.entry.find((e) => e.resource.resourceType === "Patient")?.resource ?? null;
  } catch (err) {
    if (err instanceof Error && /not found/i.test(err.message)) return null;
    throw err;
  }
}

/**
 * Handles one API request. `path` is everything after /api/fhir/, e.g.
 * "Patient/123/$everything".
 */
export async function handleFhirRequest(
  request: Request,
  path: string,
  deps: FhirApiDeps,
): Promise<Response> {
  const now = deps.now?.() ?? new Date();
  const url = new URL(request.url);
  const baseUrl = `${url.origin}/api/fhir`;
  const segments = path.split("/").filter(Boolean).map(decodeURIComponent);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return operationOutcome(405, "not-supported", "This FHIR API is read-only (GET).");
  }
  if (segments.length === 1 && segments[0] === "metadata") {
    return json(capabilityStatement(baseUrl, now));
  }

  const token = bearer(request);
  if (!token)
    return operationOutcome(
      401,
      "security",
      "Send a staff access token: Authorization: Bearer <token>.",
    );
  const client = deps.clientFor(token);

  const { data: auth, error: authError } = await client.auth.getUser(token);
  if (authError || !auth?.user)
    return operationOutcome(401, "security", "The access token is invalid or has expired.");

  const { data: roleRows, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);
  if (roleError) return operationOutcome(500, "exception", "Could not check the caller's role.");
  const roles = (roleRows ?? []).map((r) => r.role as string);
  if (!roles.some((r) => FHIR_API_ROLES.includes(r))) {
    return operationOutcome(
      403,
      "forbidden",
      "This account's role does not include HIS / FHIR access.",
    );
  }

  try {
    if (segments[0] !== "Patient") {
      return operationOutcome(
        404,
        "not-supported",
        `Resource type "${segments[0] ?? ""}" is not served. Try Patient.`,
      );
    }

    // Search: GET /Patient?identifier=… | ?_id=…
    if (segments.length === 1) {
      const identifier = url.searchParams.get("identifier");
      const idParam = url.searchParams.get("_id");
      const unknown = [...url.searchParams.keys()].filter(
        (k) => !["identifier", "_id", "_format", "_count"].includes(k),
      );
      if (unknown.length) {
        return operationOutcome(
          400,
          "not-supported",
          `Unsupported search parameter: ${unknown.join(", ")}`,
        );
      }
      if (!identifier && !idParam) {
        return operationOutcome(
          400,
          "invalid",
          "Search by identifier or _id. Listing every patient is not allowed.",
        );
      }
      let ids = identifier ? await patientIdsForIdentifier(client, identifier) : [];
      if (idParam)
        ids = identifier ? ids.filter((i) => i === idParam) : UUID.test(idParam) ? [idParam] : [];
      const resources: FhirResource[] = [];
      for (const id of ids.slice(0, SEARCH_LIMIT)) {
        const resource = await patientResource(client, id);
        if (resource) resources.push(resource);
      }
      await logAccess(client, resources.length === 1 ? resources[0]!.id : null, "search");
      return json(searchset(baseUrl, url.toString(), resources, now));
    }

    const id = segments[1]!;
    if (!UUID.test(id)) return operationOutcome(404, "not-found", `Patient/${id} does not exist.`);

    // Read: GET /Patient/<id>
    if (segments.length === 2) {
      const resource = await patientResource(client, id);
      if (!resource) return operationOutcome(404, "not-found", `Patient/${id} does not exist.`);
      await logAccess(client, id, "read");
      return json(resource);
    }

    // $everything: GET /Patient/<id>/$everything
    if (segments.length === 3 && segments[2] === "$everything") {
      let result;
      try {
        result = await buildPatientBundle(id, client);
      } catch (err) {
        if (err instanceof Error && /not found/i.test(err.message)) {
          return operationOutcome(404, "not-found", `Patient/${id} does not exist.`);
        }
        throw err;
      }
      await logAccess(client, id, "$everything");
      const bundle = searchset(baseUrl, url.toString(), [], now);
      // Keep the urn:uuid fullUrls: references inside the record point at them.
      bundle.entry = result.bundle.entry.map((e) => ({
        ...e,
        search: { mode: e.resource.resourceType === "Patient" ? "match" : "include" },
      }));
      bundle.total = 1; // $everything matches one patient; the rest are includes
      return json(bundle);
    }

    return operationOutcome(404, "not-supported", `Unsupported path: ${path}`);
  } catch (err) {
    // Never echo database internals to an external caller.
    console.error("[fhir-api]", err);
    return operationOutcome(500, "exception", "The FHIR request could not be completed.");
  }
}
