/**
 * Holds response data from already-executed endpoints in the current run,
 * so a dependent endpoint (e.g. DELETE /users/{id} depending on a POST
 * that created the user) can reuse values from its dependency's response
 * instead of requiring a hardcoded ID.
 *
 * v1 convention: dependents can reference `{id}` in their path, and it
 * resolves to `body.id` from the dependency's response. This covers the
 * common create->use->delete pattern without needing a full templating
 * language. If you need to reference other fields, extend `resolve()`.
 */
export class ChainContext {
  private responses = new Map<string, { status: number; body: unknown }>();

  record(endpointId: string, status: number, body: unknown) {
    this.responses.set(endpointId, { status, body });
  }

  /** Resolves "{id}" style placeholders in a path using the dependency's
   * captured response body. Falls back to leaving the placeholder as-is
   * if nothing was captured (the request will then 404, which surfaces
   * as a clear test failure rather than a silent wrong request). */
  resolvePath(path: string, dependsOnId?: string | null): string {
    if (!dependsOnId) return path;
    const captured = this.responses.get(dependsOnId);
    if (!captured || typeof captured.body !== "object" || captured.body === null) {
      return path;
    }

    const body = captured.body as Record<string, unknown>;
    return path.replace(/\{(\w+)\}/g, (match, key) => {
      const value = body[key];
      return value !== undefined ? String(value) : match;
    });
  }
}
