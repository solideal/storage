/**
 * Represents a value which may be a T or undefined or null.
 */
export type Maybe<T> = T | undefined | null;

/**
 * Interface to represent an object with a fetch function used to make requests
 * to a user pod. It represents the interface expected by *SolidDataset* functions.
 */
export interface Fetcher {
  fetch: unknown;
}
