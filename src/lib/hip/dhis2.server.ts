/**
 * Sends a monthly dataValueSet to a DHIS2 server (POST /api/dataValueSets).
 *
 * Configured by environment variables on the server, never in the browser:
 *   DHIS2_BASE_URL   e.g. https://dhis.moh.gov.et  (no trailing /api)
 *   DHIS2_TOKEN      a DHIS2 personal access token (preferred), or
 *   DHIS2_USERNAME + DHIS2_PASSWORD for basic auth.
 */

export type Dhis2Config = {
  baseUrl: string;
  auth: { kind: "token"; token: string } | { kind: "basic"; username: string; password: string };
};

export type Dhis2Payload = {
  dataSet?: string;
  period: string;
  orgUnit: string;
  completeDate?: string;
  dataValues: {
    dataElement: string;
    period: string;
    orgUnit: string;
    categoryOptionCombo: string;
    value: string;
    comment?: string;
  }[];
};

export type Dhis2PushResult = {
  ok: boolean;
  dryRun: boolean;
  status: string;
  imported: number;
  updated: number;
  ignored: number;
  conflicts: string[];
  message: string;
};

const CODE = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_VALUES = 5000;

export function dhis2ConfigFromEnv(env: Record<string, string | undefined>): Dhis2Config | null {
  const base = env["DHIS2_BASE_URL"]
    ?.trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  if (!base) return null;
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    return null;
  }
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) return null;
  const token = env["DHIS2_TOKEN"]?.trim();
  if (token) return { baseUrl: base, auth: { kind: "token", token } };
  const username = env["DHIS2_USERNAME"]?.trim();
  const password = env["DHIS2_PASSWORD"];
  if (username && password) return { baseUrl: base, auth: { kind: "basic", username, password } };
  return null;
}

/** Rejects anything that is not a well-formed monthly aggregate payload. */
export function validatePayload(input: unknown): Dhis2Payload {
  if (!input || typeof input !== "object") throw new Error("Payload must be an object");
  const p = input as Partial<Dhis2Payload>;
  if (typeof p.period !== "string" || !/^\d{4}(0[1-9]|1[0-2])$/.test(p.period)) {
    throw new Error("period must be a monthly period such as 202610");
  }
  if (typeof p.orgUnit !== "string" || !CODE.test(p.orgUnit)) {
    throw new Error("orgUnit must be a DHIS2 code (letters, digits, _ . -)");
  }
  if (!Array.isArray(p.dataValues) || p.dataValues.length === 0) {
    throw new Error("dataValues must be a non-empty list");
  }
  if (p.dataValues.length > MAX_VALUES)
    throw new Error(`At most ${MAX_VALUES} data values per push`);
  const dataValues = p.dataValues.map((v, i) => {
    if (!v || typeof v !== "object") throw new Error(`dataValues[${i}] is not an object`);
    const { dataElement, categoryOptionCombo, value, comment } = v;
    if (typeof dataElement !== "string" || !CODE.test(dataElement)) {
      throw new Error(`dataValues[${i}].dataElement is not a valid code`);
    }
    if (typeof categoryOptionCombo !== "string" || !CODE.test(categoryOptionCombo)) {
      throw new Error(`dataValues[${i}].categoryOptionCombo is not a valid code`);
    }
    if (typeof value !== "string" || !/^\d{1,9}$/.test(value)) {
      throw new Error(`dataValues[${i}].value must be a whole number`);
    }
    if (v.period !== p.period || v.orgUnit !== p.orgUnit) {
      throw new Error(`dataValues[${i}] period/orgUnit must match the data set`);
    }
    return {
      dataElement,
      period: p.period!,
      orgUnit: p.orgUnit!,
      categoryOptionCombo,
      value,
      ...(typeof comment === "string" && comment ? { comment: comment.slice(0, 255) } : {}),
    };
  });
  return {
    ...(typeof p.dataSet === "string" && CODE.test(p.dataSet) ? { dataSet: p.dataSet } : {}),
    period: p.period,
    orgUnit: p.orgUnit,
    ...(typeof p.completeDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.completeDate)
      ? { completeDate: p.completeDate }
      : {}),
    dataValues,
  };
}

function authHeader(auth: Dhis2Config["auth"]): string {
  if (auth.kind === "token") return `ApiToken ${auth.token}`;
  const raw = `${auth.username}:${auth.password}`;
  const b64 =
    typeof Buffer !== "undefined" ? Buffer.from(raw, "utf8").toString("base64") : btoa(raw);
  return `Basic ${b64}`;
}

type ImportSummary = {
  status?: string;
  description?: string;
  importCount?: { imported?: number; updated?: number; ignored?: number };
  conflicts?: { object?: string; value?: string }[];
};

/** DHIS2 2.36+ wraps the summary in { httpStatus, response }; older versions return it bare. */
function readSummary(body: unknown): ImportSummary {
  if (!body || typeof body !== "object") return {};
  const b = body as { response?: ImportSummary } & ImportSummary;
  return b.response && typeof b.response === "object" ? b.response : b;
}

export async function pushDataValueSet(
  config: Dhis2Config,
  payload: Dhis2Payload,
  opts: { dryRun: boolean; fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<Dhis2PushResult> {
  const params = new URLSearchParams({
    dataElementIdScheme: "CODE",
    orgUnitIdScheme: "CODE",
    categoryOptionComboIdScheme: "CODE",
    importStrategy: "CREATE_AND_UPDATE",
    dryRun: String(opts.dryRun),
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  const doFetch = opts.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await doFetch(`${config.baseUrl}/api/dataValueSets?${params}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: authHeader(config.auth),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return failure(
      opts.dryRun,
      aborted ? "DHIS2 did not answer in time" : "Could not reach the DHIS2 server",
    );
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (response.status === 401 || response.status === 403) {
    return failure(opts.dryRun, "DHIS2 rejected the credentials (check the token / user rights)");
  }
  const summary = readSummary(body);
  const conflicts = (summary.conflicts ?? [])
    .slice(0, 20)
    .map((c) => [c.object, c.value].filter(Boolean).join(": "));
  const status = summary.status ?? (response.ok ? "OK" : `HTTP ${response.status}`);
  const ok = response.ok && status !== "ERROR";
  return {
    ok,
    dryRun: opts.dryRun,
    status,
    imported: summary.importCount?.imported ?? 0,
    updated: summary.importCount?.updated ?? 0,
    ignored: summary.importCount?.ignored ?? 0,
    conflicts,
    message:
      summary.description ??
      (ok
        ? opts.dryRun
          ? "Dry run accepted by DHIS2"
          : "Report imported into DHIS2"
        : `DHIS2 returned ${status}`),
  };
}

function failure(dryRun: boolean, message: string): Dhis2PushResult {
  return {
    ok: false,
    dryRun,
    status: "ERROR",
    imported: 0,
    updated: 0,
    ignored: 0,
    conflicts: [],
    message,
  };
}
