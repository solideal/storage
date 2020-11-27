/**
 * Represents a value which may be a T or undefined or null.
 */
export type Maybe<T> = T | undefined | null;

/**
 * Fetch API signature as expected by solid-client.
 */
export type FetchFunc = ((
  input: RequestInfo,
  init?: RequestInit | undefined
) => Promise<Response>) &
  typeof globalThis.fetch;

/**
 * Interface to represent an object with a fetch function used to make requests
 * to a user pod. It represents the interface expected by *SolidDataset* functions.
 */
export interface FetchOptions {
  fetch?: FetchFunc;
}
