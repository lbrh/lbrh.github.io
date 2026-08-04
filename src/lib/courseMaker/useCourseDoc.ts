import { useCallback, useRef, useState } from 'react';
import { emptyDoc } from './doc';
import type { CourseDoc } from './types';

type Updater = (doc: CourseDoc) => CourseDoc;

/**
 * Document state with unlimited undo/redo.
 *
 * Two write paths, so a drag records one history step rather than one per frame:
 *   - `commit`  — snapshot the current doc, then apply (discrete edits)
 *   - `begin` + `live` — snapshot once up front, then apply freely (drags)
 */
export function useCourseDoc(initial?: CourseDoc) {
  const [doc, setDocState] = useState<CourseDoc>(initial ?? emptyDoc());
  const [past, setPast] = useState<CourseDoc[]>([]);
  const [future, setFuture] = useState<CourseDoc[]>([]);

  // Mirrors `doc` so callbacks never read a stale value mid-gesture.
  const docRef = useRef(doc);
  docRef.current = doc;

  const setDoc = useCallback((next: CourseDoc) => {
    docRef.current = next;
    setDocState(next);
  }, []);

  /** Records the current doc as an undo point without changing it. */
  const begin = useCallback(() => {
    const snapshot = docRef.current;
    setPast((p) => [...p, snapshot]);
    setFuture([]);
  }, []);

  /** Applies an edit without touching history — pair with `begin`. */
  const live = useCallback(
    (fn: Updater) => {
      setDoc(fn(docRef.current));
    },
    [setDoc],
  );

  /** Applies an edit as a single undoable step. */
  const commit = useCallback(
    (fn: Updater) => {
      const prev = docRef.current;
      const next = fn(prev);
      if (next === prev) return;
      setPast((p) => [...p, prev]);
      setFuture([]);
      setDoc(next);
    },
    [setDoc],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [docRef.current, ...f]);
      setDoc(prev);
      return p.slice(0, -1);
    });
  }, [setDoc]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p, docRef.current]);
      setDoc(next);
      return f.slice(1);
    });
  }, [setDoc]);

  /** Replaces the whole document (open / import) as one undoable step. */
  const replace = useCallback(
    (next: CourseDoc) => {
      setPast((p) => [...p, docRef.current]);
      setFuture([]);
      setDoc(next);
    },
    [setDoc],
  );

  return {
    doc,
    docRef,
    begin,
    live,
    commit,
    replace,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}

export type CourseStore = ReturnType<typeof useCourseDoc>;
