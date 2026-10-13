/**
 * Rehearsal recordings, kept in this browser and nowhere else.
 *
 * A defence filmed and watched back is the most persuasive feedback there
 * is, and also the most private thing this product could hold — a student's
 * face, voice and stumbles. So it never leaves the device: IndexedDB, keyed
 * by the session, the last few only, deleted with one tap. The server never
 * sees a frame.
 */

export interface RecordingMark {
  /** Milliseconds from the start of the recording. */
  at: number;
  /** The juror's question, or null for the opening exposition. */
  question: string | null;
}

export interface StoredRecording {
  sessionId: string;
  blob: Blob;
  mimeType: string;
  marks: RecordingMark[];
  createdAt: string;
}

const DB = "mockio-recordings";
const STORE = "recordings";
/** Video is heavy: older rehearsals give way to new ones. */
export const KEEP_RECORDINGS = 3;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "sessionId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

export async function saveRecording(recording: StoredRecording): Promise<void> {
  await run("readwrite", (store) => store.put(recording));
  const all = await run<StoredRecording[]>("readonly", (store) => store.getAll());
  const stale = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(KEEP_RECORDINGS);
  for (const entry of stale) await deleteRecording(entry.sessionId);
}

export function loadRecording(sessionId: string): Promise<StoredRecording | null> {
  return run<StoredRecording | undefined>("readonly", (store) => store.get(sessionId))
    .then((found) => found ?? null)
    .catch(() => null);
}

export async function deleteRecording(sessionId: string): Promise<void> {
  await run("readwrite", (store) => store.delete(sessionId)).catch(() => undefined);
}

/** The container this browser records into: WebM where it can, MP4 on Safari. */
export function recordingMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function canRecord(): boolean {
  return recordingMimeType() !== null && typeof indexedDB !== "undefined";
}
