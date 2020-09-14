import {
  Thing,
  setUrl,
  getStringNoLocale,
  setStringNoLocale,
  getBoolean,
  setBoolean,
  getUrl,
  getDatetime,
  setDatetime,
  getDecimal,
  setDecimal,
  getInteger,
  setInteger,
  getStringNoLocaleAll,
  addStringNoLocale,
  addBoolean,
  getBooleanAll,
  getUrlAll,
  addUrl,
  getDatetimeAll,
  addDatetime,
  getDecimalAll,
  addDecimal,
  getIntegerAll,
  addInteger,
} from "@inrupt/solid-client";
import { KeyField, KeyBuilder } from "./keyField";
import { PrimitiveBuilder } from "./primitiveField";
import { ArrayBuilder } from "./arrayField";
import { Maybe } from "../types";
import { rdf } from "../namespaces";

/**
 * Represents a single field in a schema definition which is readable and writable.
 * You usually construct it using an associated Builder.
 */
export interface Field<TPrimitive> {
  /**
   * Read a TPrimitive value from a Thing.
   */
  read(thing: Thing): Maybe<TPrimitive>;

  /**
   * Write a TPrimitive value to a Thing and returns the updated Thing.
   */
  write(thing: Thing, value: Maybe<TPrimitive>): Thing;
}

/**
 * Builder interface which represent something capable of constructing a Field for
 * a TPrimitive type.
 */
export interface Builder<TPrimitive> {
  /**
   * Build a Field to read and write a TPrimitive.
   */
  build(): Field<TPrimitive>;
}

/**
 * Hold together field definitions for a particular data type.
 */
export type Definition<TData> = {
  [key in keyof Partial<TData>]: Builder<TData[key]>;
};

/**
 * Same as Definition<TData> except that the definition is now built. Use by the
 * schema to effectively read/write stuff.
 */
export type Fields<TData> = {
  [key in keyof Partial<TData>]: Field<TData[key]>;
};

/**
 * Error raised when no KeyField has been found in a definition.
 */
export class NoKeyDefined extends Error {
  constructor() {
    super(
      "you must at least give a is.key field to hold resource URL when building a schema"
    );
  }
}

/**
 * The `is` object enables you to define a schema using predicates for a javascript
 * object type. It makes really convenient to build a schema definition with an easy
 * to read fluent API.
 */
export const is = {
  key: (): KeyBuilder => new KeyBuilder(),
  string: (...predicates: string[]): PrimitiveBuilder<string> =>
    new PrimitiveBuilder({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates,
    }),
  strings: (...predicates: string[]): ArrayBuilder<string> =>
    new ArrayBuilder({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates,
    }),
  boolean: (...predicates: string[]): PrimitiveBuilder<boolean> =>
    new PrimitiveBuilder({
      getter: getBoolean,
      setter: setBoolean,
      predicates,
    }),
  booleans: (...predicates: string[]): ArrayBuilder<boolean> =>
    new ArrayBuilder({
      getter: getBooleanAll,
      setter: addBoolean,
      predicates,
    }),
  url: (...predicates: string[]): PrimitiveBuilder<string> =>
    new PrimitiveBuilder({
      getter: getUrl,
      setter: setUrl,
      predicates,
    }),
  urls: (...predicates: string[]): ArrayBuilder<string> =>
    new ArrayBuilder({
      getter: getUrlAll,
      setter: addUrl,
      predicates,
    }),
  datetime: (...predicates: string[]): PrimitiveBuilder<Date> =>
    new PrimitiveBuilder({
      getter: getDatetime,
      setter: setDatetime,
      predicates,
    }),
  datetimes: (...predicates: string[]): ArrayBuilder<Date> =>
    new ArrayBuilder({
      getter: getDatetimeAll,
      setter: addDatetime,
      predicates,
    }),
  decimal: (...predicates: string[]): PrimitiveBuilder<number> =>
    new PrimitiveBuilder({
      getter: getDecimal,
      setter: setDecimal,
      predicates,
    }),
  decimals: (...predicates: string[]): ArrayBuilder<number> =>
    new ArrayBuilder({
      getter: getDecimalAll,
      setter: addDecimal,
      predicates,
    }),
  integer: (...predicates: string[]): PrimitiveBuilder<number> =>
    new PrimitiveBuilder({
      getter: getInteger,
      setter: setInteger,
      predicates,
    }),
  integers: (...predicates: string[]): ArrayBuilder<number> =>
    new ArrayBuilder({
      getter: getIntegerAll,
      setter: addInteger,
      predicates,
    }),
} as const;

/**
 * Schema of a TData used to map between triples and Javascript objects.
 * Given an object type (which should be an URL representing the kind of data
 * you want to persist) and a definition, it will provides methods to `write`
 * and `read` to/from a Thing.
 */
export class Schema<TData> {
  /**
   * Contains the field use to write the rdf:type predicate.
   */
  private static readonly typeField = is.url(rdf.type).build();

  private readonly fields: Fields<TData>;
  private readonly key: { name: keyof TData; field: KeyField };

  /**
   * Instantiates a new schema for a specific type (the kind of data you want to
   * map) and an associated definition which maps object properties to rdf triples.
   *
   * This definition should at a bare minimum contains a KeyField definition to
   * hold a Thing url. It will throw a NoKeyDefined error if none was found.
   */
  constructor(public readonly type: string, definition: Definition<TData>) {
    const builtFields = {} as Fields<TData>;
    let key: keyof TData | undefined;
    for (const name in definition) {
      const field = definition[name].build();
      builtFields[name] = field;

      if (field instanceof KeyField) {
        key = name;
      }
    }

    if (!key) {
      throw new NoKeyDefined();
    }

    this.key = { name: key, field: <KeyField>builtFields[key] };
    this.fields = builtFields;
  }

  /**
   * Checks if the given Thing has a rdf:type corresponding to this schema.
   */
  ofType(thing: Thing): boolean {
    return Schema.typeField.read(thing) === this.type;
  }

  /**
   * Retrieve an URL given a value which represents a data primary key. This is needed
   * because the user may have define a conversion between Linked Data url and its
   * javascript property.
   */
  getUrl(keyValue: Readonly<TData> | string): string {
    if (typeof keyValue !== "string") {
      keyValue = (<unknown>keyValue[this.key.name]) as string;
    }
    return this.key.field.toUrl(keyValue);
  }

  /**
   * Sets the url (ie. primary key) in the given TData. It will convert the url
   * if a converter is defined on the KeyField object.
   */
  setUrl(data: TData, url: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data[this.key.name] = this.key.field.fromUrl(url) as any;
  }

  /**
   * Write data to the given Thing by using the definition of this schema.
   * The returned Thing contains quads edited by this operation.
   */
  write(thing: Thing, data: Readonly<TData>): Thing {
    thing = Schema.typeField.write(thing, this.type);
    for (const field in this.fields) {
      thing = this.fields[field].write(thing, data[field]);
    }
    return thing;
  }

  /**
   * Convert a Thing to a TData javascript object by using the definition of this
   * schema.
   */
  read(thing: Thing): TData {
    const data = {} as TData;
    for (const field in this.fields) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      data[field] = this.fields[field].read(thing)!;
    }
    return data;
  }
}
