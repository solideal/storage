import {
  getStringNoLocale,
  setStringNoLocale,
  createThing,
} from "@inrupt/solid-client";
import { hasExactly } from "../ldutils.test";
import { PrimitiveField, PrimitiveBuilder } from "./primitiveField";
import { Maybe } from "../types";

const url = "http://an.entity#one";
const predicate1 = "http://predicate.one";
const predicate2 = "http://predicate.two";

describe("the `PrimitiveField` class", () => {
  it("can write data to a Thing", () => {
    const field = new PrimitiveField({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates: [predicate1],
      default: "a default value",
    });

    expect(
      hasExactly(field.write(createThing({ url }), "a literal value"), [
        url,
        predicate1,
        "a literal value",
      ])
    ).toEqual(true);
  });

  it("can write data with multiple predicates", () => {
    const field = new PrimitiveField({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates: [predicate1, predicate2],
    });

    expect(
      hasExactly(
        field.write(createThing({ url }), "a literal value"),
        [url, predicate1, "a literal value"],
        [url, predicate2, "a literal value"]
      )
    ).toEqual(true);
  });

  it("remove quads for a predicate if value to write is null or undefined", () => {
    const field = new PrimitiveField({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates: [predicate1],
    });

    const thing = field.write(createThing({ url }), "a literal value");

    expect(hasExactly(field.write(thing, null))).toEqual(true);
    expect(hasExactly(field.write(thing, undefined))).toEqual(true);
  });

  it("write the default value if set and value to write is null or undefined", () => {
    const field = new PrimitiveField({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates: [predicate1],
      default: "a default value",
    });

    expect(
      hasExactly(field.write(createThing({ url }), null), [
        url,
        predicate1,
        "a default value",
      ])
    ).toEqual(true);
    expect(
      hasExactly(field.write(createThing({ url }), undefined), [
        url,
        predicate1,
        "a default value",
      ])
    ).toEqual(true);
  });

  it("can read data", () => {
    const field = new PrimitiveField({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates: [predicate1],
      default: "a default value",
    });

    const thing = setStringNoLocale(
      createThing({ url: url }),
      predicate1,
      "a literal value"
    );

    expect(field.read(thing)).toEqual("a literal value");
  });

  it("can read data with multiple predicates", () => {
    const field = new PrimitiveField({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates: [predicate1, predicate2],
    });

    const thing = setStringNoLocale(
      createThing({ url: url }),
      predicate2,
      "a literal value"
    );

    expect(field.read(thing)).toEqual("a literal value");
  });

  it("read the default value if predicate does not exist", () => {
    const field = new PrimitiveField({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates: [predicate1, predicate2],
      default: "a default value",
    });

    expect(field.read(createThing())).toEqual("a default value");
  });

  it("use the given serialize function when writing data", () => {
    const field = new PrimitiveField({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates: [predicate1],
      serialize: (value: Maybe<string>) => value + "!",
    });

    expect(
      hasExactly(field.write(createThing({ url }), "a value"), [
        url,
        predicate1,
        "a value!",
      ])
    ).toEqual(true);
  });

  it("use the given deserialize function when reading data", () => {
    const field = new PrimitiveField({
      getter: getStringNoLocale,
      setter: setStringNoLocale,
      predicates: [predicate1, predicate2],
      serialize: (value: Maybe<string>) => value + "!",
      deserialize: (value: Maybe<string>) =>
        value ? value.slice(0, -1) : null,
    });

    const thing = field.write(createThing({ url }), "a value");

    expect(field.read(thing)).toEqual("a value");
  });
});

describe("the `PrimitiveBuilder` class", () => {
  it("can build a simple PrimitiveField", () => {
    expect(
      new PrimitiveBuilder({
        getter: getStringNoLocale,
        setter: setStringNoLocale,
        predicates: [predicate1],
      }).build()
    ).toEqual(
      new PrimitiveField<string>({
        getter: getStringNoLocale,
        setter: setStringNoLocale,
        predicates: [predicate1],
      })
    );
  });

  it("can build a PrimitiveField with a default value", () => {
    expect(
      new PrimitiveBuilder({
        getter: getStringNoLocale,
        setter: setStringNoLocale,
        predicates: [predicate1],
      })
        .default("a default value")
        .build()
    ).toEqual(
      new PrimitiveField<string>({
        getter: getStringNoLocale,
        setter: setStringNoLocale,
        predicates: [predicate1],
        default: "a default value",
      })
    );
  });

  it("can build a PrimitiveField with a converter", () => {
    const serialize = (value: Maybe<string>) => value + "!";
    const deserialize = (value: Maybe<string>) =>
      value ? value.slice(0, -1) : "";
    expect(
      new PrimitiveBuilder({
        getter: getStringNoLocale,
        setter: setStringNoLocale,
        predicates: [predicate1],
      })
        .converter(serialize, deserialize)
        .build()
    ).toEqual(
      new PrimitiveField<string>({
        getter: getStringNoLocale,
        setter: setStringNoLocale,
        predicates: [predicate1],
        serialize,
        deserialize,
      })
    );
  });
});
