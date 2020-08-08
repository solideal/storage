import {
  Thing,
  getStringNoLocale,
  setStringNoLocale,
  getBoolean,
  setBoolean,
  getUrl,
  setUrl,
  getDatetime,
  setDatetime,
  getDecimal,
  setDecimal,
  getInteger,
  setInteger,
} from "@inrupt/solid-client";

export interface Reader<TPrimitive> {
  read(thing: Thing): TPrimitive | null;
}

export interface Writer<TPrimitive> {
  write(thing: Thing, value: TPrimitive): Thing;
}

/**
 * Represents a single field in a schema which is readable and writable.
 */
export type Field<TPrimitive> = Reader<TPrimitive> & Writer<TPrimitive>;

/**
 * Schema of a TData used to map between triples and Javascript objects.
 */
export type Schema<TData> = { [key in keyof Partial<TData>]: Field<any> };

/**
 * The is builder enables you to define a schema using predicates for a javascript
 * objects. The repository will then be able to map between rdf triples and your
 * expected objects as needed.
 */
export const is = {
  string: (...predicates: string[]) =>
    one(getStringNoLocale, setStringNoLocale, predicates),
  boolean: (...predicates: string[]) => one(getBoolean, setBoolean, predicates),
  url: (...predicates: string[]) => one(getUrl, setUrl, predicates),
  datetime: (...predicates: string[]) =>
    one(getDatetime, setDatetime, predicates),
  decimal: (...predicates: string[]) => one(getDecimal, setDecimal, predicates),
  integer: (...predicates: string[]) => one(getInteger, setInteger, predicates),
};

/**
 * Function used to build abstractions over solid-client-js functions to retrieve
 * a single value from a triple predicate.
 *
 * TODO: manage optional properties by calling remove* functions
 */
function one<TPrimitive>(
  get: (thing: Thing, predicate: string) => TPrimitive,
  set: (thing: Thing, predicate: string, value: any) => Thing,
  predicates: string[]
): Field<TPrimitive> {
  return {
    read(thing) {
      let val: TPrimitive | null = null;

      for (const predicate of predicates) {
        val = get(thing, predicate);
        if (val) {
          break;
        }
      }

      return val;
    },
    write: (thing, value) =>
      predicates.reduce(
        (curThing, predicate) => set(curThing, predicate, value),
        thing
      ),
  };
}
