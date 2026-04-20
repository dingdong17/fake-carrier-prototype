export interface StoredObject {
  /** Provider-internal key (e.g. filesystem path or blob key). Stable across reads. */
  key: string;
  /** URL the server can read the object from. For local: file:// path. For blob: https URL. */
  url: string;
  /** Original file size in bytes at upload time. */
  size: number;
}

export interface Storage {
  /** Persist bytes under a logical path (e.g. "checks/<id>/<docId>.pdf"). */
  put(
    path: string,
    body: Buffer,
    contentType: string
  ): Promise<StoredObject>;

  /** Fetch the object back as a buffer, given its key. */
  get(key: string): Promise<Buffer>;

  /** Delete the object and, if the provider supports it, any empty parent prefixes. */
  delete(key: string): Promise<void>;

  /** Recursively delete everything under the given prefix. Used by /api/check/[id]/discard. */
  deletePrefix(prefix: string): Promise<void>;
}
