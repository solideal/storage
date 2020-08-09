import { Thing, ThingPersisted, asUrl } from "@inrupt/solid-client";
import { Field, Builder } from "./schema";
import { Maybe } from "../types";

/**
 * Available options to customize a KeyField behavior.
 */
export interface KeyFieldOptions {
  /**
   * Convert a string representation to an url.
   */
  serialize?: (value: string) => string;

  /**
   * Convert an url to another string representation.
   */
  deserialize?: (url: string) => string;
}

/**
 * Mandatory field in every schema definition. It will hold the resource URL which
 * is the unique primary key used in Linked Data. You can provide custom methods
 * to transform the URL to something easier to work with when dealing with your
 * javascript objects.
 *
 * It also provides methods used to convert a value using the custom transformer
 * for this key if defined (to make it easy to convert to and from an url).
 */
export class KeyField implements Field<string> {
  constructor(private readonly options: KeyFieldOptions = {}) {}

  toUrl(value: string): string {
    return this.options.serialize?.(value) ?? value;
  }

  fromUrl(url: string): string {
    return this.options.deserialize?.(url) ?? url;
  }

  read(thing: Thing): Maybe<string> {
    const url = asUrl(<ThingPersisted>thing); // Should only read persisted data I guess...
    return this.options.deserialize?.(url) ?? url;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  write(thing: Thing, _value: Maybe<string>): Thing {
    // Not supported for the key since this is the Thing subject and does not
    // make sense here.
    return thing;
  }
}

/**
 * Provide facility methods to construct a KeyField.
 */
export class KeyBuilder implements Builder<string> {
  constructor(private readonly options: KeyFieldOptions = {}) {}

  /**
   * Use btoa and atob to convert from and to a url. It means your javascript property
   * will always be a base64 string which when decoded represents the resource url.
   */
  base64(): KeyBuilder {
    return new KeyBuilder({
      ...this.options,
      deserialize: (url) =>
        typeof btoa === "undefined"
          ? Buffer.from(url, "binary").toString("base64")
          : btoa(url),
      serialize: (value) =>
        typeof atob === "undefined"
          ? Buffer.from(value, "base64").toString("binary")
          : atob(value),
    });
  }

  /**
   * Use provided functions to convert from and to an url for your data. This is mostly
   * provided because in a traditionnal webapp, we use the entity primary key to
   * route the user and if the provided key is an url, which is the case with Linked
   * Data, it will generate ugly routes.
   *
   * With this simple feature, you can have mostly pretty url and don't care of it
   * in your code. A basic `base64` encoder is also defined on this same builder.
   */
  converter(
    serialize: (value: string) => string,
    deserialize: (url: string) => string
  ): KeyBuilder {
    return new KeyBuilder({
      ...this.options,
      deserialize,
      serialize,
    });
  }

  build(): KeyField {
    return new KeyField(this.options);
  }
}
