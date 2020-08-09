import { Thing, removeAll } from "@inrupt/solid-client";
import { Field, Builder } from "./schema";
import { Maybe } from "../types";

/**
 * Represents options needed to instantiate a primitive field.
 */
export interface PrimitiveFieldOptions<TPrimitive> {
  /**
   * What function from the @inrupt/solid-client should be used to retrieve a value
   * from a Thing?
   */
  getter: (thing: Thing, predicate: string) => Maybe<TPrimitive>;

  /**
   * What function from the @inrupt/solid-client should be used to set a value
   * to a Thing?
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setter: (thing: Thing, predicate: string, value: any) => Thing;

  /**
   * Optional method to process a persisted value to another value of the same type
   * when reading data.
   */
  deserialize?: (persistedValue: Maybe<TPrimitive>) => Maybe<TPrimitive>;

  /**
   * Optional method to be called when persisting a value.
   */
  serialize?: (localValue?: Maybe<TPrimitive>) => Maybe<TPrimitive>;

  /**
   * Array of predicates used by the field. Many predicates can be given which means:
   * - Upon reading, it will try to read every predicate till if find a non null value
   * - Upon writing, it will write the value for every predicates defined.
   */
  predicates: string[];

  /**
   * Default value to use when a null or an undefined value is found (when reading AND writing)
   * for this field.
   */
  default?: TPrimitive;
}

/**
 * Concrete implementation of a field which can read and write to a Thing.
 */
export class PrimitiveField<TPrimitive> implements Field<TPrimitive> {
  constructor(private readonly options: PrimitiveFieldOptions<TPrimitive>) {}

  read(thing: Thing): Maybe<TPrimitive> {
    let val: Maybe<TPrimitive> = null;

    for (const predicate of this.options.predicates) {
      val = this.options.getter(thing, predicate);
      if (val != null) {
        break;
      }
    }

    val = val ?? this.options.default;

    return this.options.deserialize ? this.options.deserialize(val) : val;
  }

  write(thing: Thing, value: Maybe<TPrimitive>): Thing {
    let valueToWrite: Maybe<TPrimitive> = value ?? this.options.default;

    if (this.options.serialize) {
      valueToWrite = this.options.serialize(valueToWrite);
    }

    return this.options.predicates.reduce(
      (curThing, predicate) =>
        valueToWrite == null
          ? removeAll(curThing, predicate)
          : this.options.setter(curThing, predicate, valueToWrite),
      thing
    );
  }
}

/**
 * Build a Field for the given TPrimitive value. You can chain calls to easily
 * determines how this field will behave.
 */
export class PrimitiveBuilder<TPrimitive> implements Builder<TPrimitive> {
  constructor(private readonly options: PrimitiveFieldOptions<TPrimitive>) {}

  /**
   * Sets a default value used when reading and writing this field.
   */
  default(value: TPrimitive): PrimitiveBuilder<TPrimitive> {
    return new PrimitiveBuilder({ ...this.options, default: value });
  }

  /**
   * Register methods to be called when writing this field to a Thing and reading from
   * a Thing. It enables you to process a value as its being write / read.
   */
  converter(
    serialize: (localValue?: Maybe<TPrimitive>) => Maybe<TPrimitive>,
    deserialize: (persistedValue: Maybe<TPrimitive>) => Maybe<TPrimitive>
  ): PrimitiveBuilder<TPrimitive> {
    return new PrimitiveBuilder({ ...this.options, serialize, deserialize });
  }

  build(): Field<TPrimitive> {
    return new PrimitiveField<TPrimitive>(this.options);
  }
}
