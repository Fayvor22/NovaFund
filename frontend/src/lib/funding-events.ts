export interface FundingUpdate {
  projectId: string;
  raised?: number;
  amount?: number;
  backers?: number;
  timestamp?: string;
}

export interface FundingStreamEvent extends FundingUpdate {
  id?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeProjectId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function parseNonNegativeNumber(value: unknown): number | undefined {
  const parsed = parseFiniteNumber(value);
  if (parsed === undefined || parsed < 0) return undefined;
  return parsed;
}

function parseBackers(value: unknown): number | undefined {
  const parsed = parseNonNegativeNumber(value);
  if (parsed === undefined) return undefined;
  return Math.trunc(parsed);
}

function parseTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export function normalizeFundingUpdate(value: unknown): FundingUpdate | null {
  if (!isRecord(value)) return null;

  const projectId = normalizeProjectId(value.projectId);
  if (!projectId) return null;

  const raised = parseNonNegativeNumber(value.raised);
  const amount = parseFiniteNumber(value.amount);
  const backers = parseBackers(value.backers);
  const timestamp = parseTimestamp(value.timestamp);

  if (raised === undefined && amount === undefined && backers === undefined) {
    return null;
  }

  return {
    projectId,
    ...(raised !== undefined ? { raised } : {}),
    ...(amount !== undefined ? { amount } : {}),
    ...(backers !== undefined ? { backers } : {}),
    ...(timestamp ? { timestamp } : {}),
  };
}

export function normalizeFundingStreamEvent(value: unknown): FundingStreamEvent | null {
  const update = normalizeFundingUpdate(value);
  if (!update || !isRecord(value)) return null;

  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : undefined;

  return {
    ...update,
    ...(id ? { id } : {}),
  };
}
