import { createError } from "h3";

// Rules for the dates and filters of /records, kept apart from the handlers so
// every endpoint answers the same way.

const MAX_LIMIT = 200;
const MIN_TIMESTAMP = Date.parse("2000-01-01T00:00:00Z");
const FUTURE_SKEW_MS = 5 * 60 * 1000; // a phone clock a little ahead is fine

const badRequest = (message: string) =>
  createError({ statusCode: 400, statusMessage: message });

// The moment a record happened. Returns an ISO string, or null when the caller
// did not send one (the database then uses now()).
export function parseCreatedAt(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
  if (Number.isNaN(timestamp)) {
    throw badRequest("created_at must be an ISO 8601 date");
  }
  if (timestamp < MIN_TIMESTAMP || timestamp > Date.now() + FUTURE_SKEW_MS) {
    throw badRequest("created_at must be between 2000-01-01 and now");
  }
  return new Date(timestamp).toISOString();
}

export type RecordsFilter = {
  personId?: number;
  painTypeId?: number;
  from?: string; // inclusive
  to?: string; // exclusive
  limit?: number;
  offset: number;
};

const parseInteger = (name: string, raw: unknown, min: number, max?: number) => {
  const text = Array.isArray(raw) ? raw[0] : raw;
  const value = typeof text === "string" && /^\d+$/.test(text) ? Number(text) : NaN;
  if (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max)) {
    throw badRequest(
      max !== undefined
        ? `${name} must be an integer between ${min} and ${max}`
        : `${name} must be an integer of at least ${min}`,
    );
  }
  return value;
};

const parseInstant = (name: string, raw: unknown) => {
  const text = Array.isArray(raw) ? raw[0] : raw;
  const timestamp = typeof text === "string" ? Date.parse(text) : NaN;
  if (Number.isNaN(timestamp)) {
    throw badRequest(`${name} must be an ISO 8601 date`);
  }
  return new Date(timestamp).toISOString();
};

// Query string of GET /records. Without `limit` everything is returned, as it
// always was; `from` is inclusive and `to` exclusive.
export function parseRecordsQuery(q: Record<string, unknown>): RecordsFilter {
  const filter: RecordsFilter = { offset: 0 };

  if (q.limit !== undefined) filter.limit = parseInteger("limit", q.limit, 1, MAX_LIMIT);
  if (q.offset !== undefined) {
    if (filter.limit === undefined) throw badRequest("offset requires limit");
    filter.offset = parseInteger("offset", q.offset, 0);
  }
  if (q.person_id !== undefined) filter.personId = parseInteger("person_id", q.person_id, 1);
  if (q.pain_type_id !== undefined) {
    filter.painTypeId = parseInteger("pain_type_id", q.pain_type_id, 1);
  }
  if (q.from !== undefined) filter.from = parseInstant("from", q.from);
  if (q.to !== undefined) filter.to = parseInstant("to", q.to);
  if (filter.from && filter.to && filter.from >= filter.to) {
    throw badRequest("from must be earlier than to");
  }
  return filter;
}

// WHERE clause (on records aliased `r`) and its parameters for one user.
export function buildRecordsWhere(userId: number | string, filter: RecordsFilter) {
  const params: unknown[] = [userId];
  const conditions = ["r.user_id = $1"];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace("?", `$${params.length}`));
  };

  if (filter.personId !== undefined) add("r.person_id = ?", filter.personId);
  if (filter.painTypeId !== undefined) add("r.pain_type_id = ?", filter.painTypeId);
  if (filter.from) add("r.created_at >= ?", filter.from);
  if (filter.to) add("r.created_at < ?", filter.to);

  return { where: conditions.join(" and "), params };
}
