
export type HistoryState<T> = {
  readonly past: ReadonlyArray<T>;
  readonly present: T;
  readonly future: ReadonlyArray<T>;
};

/**
 * Initializes a new history container with the given initial present state.
 */
export function createHistory<T>(initialPresent: T): HistoryState<T> {
  return {
    past: [],
    present: initialPresent,
    future: [],
  };
}

/**
 * Commits a new present state to history.
 */
export function commit<T>(
  history: HistoryState<T>,
  nextPresent: T,
  isEqual?: (a: T, b: T) => boolean
): HistoryState<T> {
  const isNoOp = isEqual
    ? isEqual(history.present, nextPresent)
    : history.present === nextPresent;

  if (isNoOp) {
    return history;
  }

  return {
    past: [...history.past, history.present],
    present: nextPresent,
    future: [],
  };
}

/**
 * Reverts to the previous state from past, moving present into future.
 * If past is empty, undo is a no-op.
 */
export function undo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.past.length === 0) {
    return history;
  }

  const previousPresent = history.past[history.past.length - 1];
  if (previousPresent === undefined) {
    return history;
  }

  const nextPast = history.past.slice(0, -1);

  return {
    past: nextPast,
    present: previousPresent,
    future: [history.present, ...history.future],
  };
}

/**
 * Restores the next state from future, moving present into past.
 * If future is empty, redo is a no-op.
 */
export function redo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.future.length === 0) {
    return history;
  }

  const nextPresent = history.future[0];
  if (nextPresent === undefined) {
    return history;
  }

  const nextFuture = history.future.slice(1);

  return {
    past: [...history.past, history.present],
    present: nextPresent,
    future: nextFuture,
  };
}

/**
 * Returns true if an undo operation is available.
 */
export function canUndo<T>(history: HistoryState<T>): boolean {
  return history.past.length > 0;
}

/**
 * Returns true if a redo operation is available.
 */
export function canRedo<T>(history: HistoryState<T>): boolean {
  return history.future.length > 0;
}
