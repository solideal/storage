import { removeAll, Thing } from "@inrupt/solid-client";
import { Maybe } from "../types";
import { PrimitiveFieldOptions } from "./primitiveField";
import { Builder, Field } from "./schema";

/**
 * Options available to customize a field containing an array of values.
 */
export type ArrayFieldOptions<TPrimitive> = PrimitiveFieldOptions<TPrimitive[]>;

/**
 * Array field used to read and write array of values to and from a Thing.
 */
export class ArrayField<TPrimitive> implements Field<TPrimitive[]> {
  constructor(private readonly options: ArrayFieldOptions<TPrimitive>) {}

  read(thing: Thing): Maybe<TPrimitive[]> {
    let val: Maybe<TPrimitive[]> = null;

    for (const predicate of this.options.predicates) {
      val = this.options.getter(thing, predicate);
      if (val && val?.length > 0) {
        break;
      }
    }

    val = this.useDefaultValueIfEmpty(val);

    return this.options.deserialize ? this.options.deserialize(val) : val;
  }

  write(thing: Thing, value: Maybe<TPrimitive[]>): Thing {
    let valueToWrite: Maybe<TPrimitive[]> = this.useDefaultValueIfEmpty(value);

    if (this.options.serialize) {
      valueToWrite = this.options.serialize(valueToWrite);
    }

    return this.options.predicates.reduce(
      (curThing, predicate) =>
        (valueToWrite ?? []).reduce(
          (t, v) => this.options.setter(t, predicate, v),
          removeAll(curThing, predicate)
        ),
      thing
    );
  }

  private useDefaultValueIfEmpty(
    value: Maybe<TPrimitive[]>
  ): Maybe<TPrimitive[]> {
    return (value == null || value.length === 0) && this.options.default
      ? this.options.default
      : value;
  }
}

/**
 * Array field builder.
 */
export class ArrayBuilder<TPrimitive> implements Builder<TPrimitive[]> {
  constructor(private readonly options: ArrayFieldOptions<TPrimitive>) {}

  /**
   * Sets a default value used when reading and writing this field.
   */
  default(value: TPrimitive[]): ArrayBuilder<TPrimitive> {
    return new ArrayBuilder({ ...this.options, default: value });
  }

  /**
   * Register methods to be called when writing this field to a Thing and reading from
   * a Thing. It enables you to process a value as its being write / read.
   */
  converter(
    serialize: (localValue?: Maybe<TPrimitive[]>) => Maybe<TPrimitive[]>,
    deserialize: (persistedValue: Maybe<TPrimitive[]>) => Maybe<TPrimitive[]>
  ): ArrayBuilder<TPrimitive> {
    return new ArrayBuilder({ ...this.options, serialize, deserialize });
  }

  build(): Field<TPrimitive[]> {
    return new ArrayField<TPrimitive>(this.options);
  }
}
