/**
 * A thesis picked on the public page, before there is an account to own it.
 *
 * Nothing reaches the server until the student has signed up: the file waits
 * in this browser, and the thesis screen uploads it on the first visit after.
 * That keeps the landing page's "upload your thesis" one gesture long without
 * bringing back anonymous identities — no stranger's thesis is stored, and no
 * model is paid for by someone who never made an account.
 *
 * IndexedDB because a File survives there across the sign-up page and the
 * Google round trip; a module variable as well, for browsers that refuse it
 * (private windows), where it still survives an in-app navigation.
 */
const DB = "mockio";
const STORE = "pending";
const KEY = "thesis";
/** A small flag beside it, so the sign-up screen can read it synchronously. */
const FLAG = "mockio.pendingThesis";

let inMemory: File | null = null;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function savePendingThesis(file: File): Promise<void> {
  inMemory = file;
  try {
    localStorage.setItem(FLAG, file.name);
  } catch {
    // Private mode: the sign-up screen just does not mention it.
  }
  try {
    await run("readwrite", (store) => store.put(file, KEY));
  } catch {
    // The in-memory copy still carries it to the thesis screen.
  }
}

/** The file's name, if one is waiting. */
export function pendingThesisName(): string | null {
  try {
    return localStorage.getItem(FLAG);
  } catch {
    return inMemory?.name ?? null;
  }
}

export async function takePendingThesis(): Promise<File | null> {
  let file = inMemory;
  if (!file) {
    try {
      const stored = await run<unknown>("readonly", (store) => store.get(KEY));
      file = stored instanceof File ? stored : stored instanceof Blob ? new File([stored], pendingThesisName() ?? "tesis.pdf") : null;
    } catch {
      file = null;
    }
  }
  await clearPendingThesis();
  return file;
}

export async function clearPendingThesis(): Promise<void> {
  inMemory = null;
  try {
    localStorage.removeItem(FLAG);
  } catch {
    // Nothing to clear.
  }
  try {
    await run("readwrite", (store) => store.delete(KEY));
  } catch {
    // Nothing to clear.
  }
}
