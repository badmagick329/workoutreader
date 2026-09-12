import type { Snapshot } from "../services/exerciseApi";

type EditStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const editKeyPrefix = "workoutreview:";

/** Cached edits outlive their editor view, so the app must also warn when those views are closed. */
export function warnBeforeClosingEdits(event: BeforeUnloadEvent, storage: Pick<Storage, "length" | "key"> = sessionStorage): void {
  for (let index = 0; index < storage.length; index++) {
    if (storage.key(index)?.startsWith(editKeyPrefix)) {
      event.preventDefault();
      event.returnValue = "";
      return;
    }
  }
}

/** Tab-scoped recovery keeps another tab's save from advancing these edits' base revision. */
export class SavedEdits<T> {
  private key: string;
  constructor(path: string, private suppliedStorage?: EditStorage) {
    this.key = `${editKeyPrefix}${path}`;
  }
  private get storage(): EditStorage { return this.suppliedStorage ?? sessionStorage; }
  read(): Snapshot<T> | null {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.revision !== "string" || !("value" in parsed)) throw new Error("Stored edits could not be read");
    return parsed;
  }
  write(snapshot: Snapshot<T>): void {
    this.storage.setItem(this.key, JSON.stringify(snapshot));
  }
  clear(): void {
    this.storage.removeItem(this.key);
  }
  acknowledge(submitted: Snapshot<T>, revision: string): void {
    const cached = this.read();
    if (cached?.revision !== submitted.revision) return;
    if (JSON.stringify(cached.value) === JSON.stringify(submitted.value)) this.clear();
    else this.write({ ...cached, revision });
  }
}
