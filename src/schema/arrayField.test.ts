import { addStringNoLocale, getStringNoLocaleAll } from "@inrupt/solid-client";
import { createThing, hasExactly } from "../ldutils.test";
import { Maybe } from "../types";
import { ArrayBuilder, ArrayField } from "./arrayField";

const url = "http://an.entity#one";
const predicate1 = "http://predicate.one";
const predicate2 = "http://predicate.two";

describe("the `ArrayField` class", () => {
  it("can write data to a thing", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
    });

    const thing = field.write(createThing(url), [
      "element one",
      "element two",
      "element three",
    ]);

    expect(
      hasExactly(
        thing,
        [url, predicate1, "element one"],
        [url, predicate1, "element two"],
        [url, predicate1, "element three"]
      )
    ).toEqual(true);
  });

  it("overrides data on a thing", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
    });

    const thing = field.write(
      createThing(
        url,
        [url, predicate1, "element four"],
        [url, predicate1, "element five"]
      ),
      ["element one", "element two", "element three"]
    );

    expect(
      hasExactly(
        thing,
        [url, predicate1, "element one"],
        [url, predicate1, "element two"],
        [url, predicate1, "element three"]
      )
    ).toEqual(true);
  });

  it("can write data with multiple predicates", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1, predicate2],
    });

    const thing = field.write(createThing(url), [
      "element one",
      "element two",
      "element three",
    ]);

    expect(
      hasExactly(
        thing,
        [url, predicate1, "element one"],
        [url, predicate1, "element two"],
        [url, predicate1, "element three"],
        [url, predicate2, "element one"],
        [url, predicate2, "element two"],
        [url, predicate2, "element three"]
      )
    ).toEqual(true);
  });

  it("correctly removes all values if setting an empty array, null or undefined", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
    });

    let thing = field.write(
      createThing(
        url,
        [url, predicate1, "element one"],
        [url, predicate1, "element two"],
        [url, predicate1, "element three"]
      ),
      []
    );

    expect(thing.size).toEqual(0);

    thing = field.write(
      createThing(
        url,
        [url, predicate1, "element one"],
        [url, predicate1, "element two"],
        [url, predicate1, "element three"]
      ),
      null
    );

    expect(thing.size).toEqual(0);

    thing = field.write(
      createThing(
        url,
        [url, predicate1, "element one"],
        [url, predicate1, "element two"],
        [url, predicate1, "element three"]
      ),
      undefined
    );

    expect(thing.size).toEqual(0);
  });

  it("write the default value if set and value to write is null or undefined", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
      default: ["one", "two"],
    });

    expect(
      hasExactly(
        field.write(createThing(url), []),
        [url, predicate1, "one"],
        [url, predicate1, "two"]
      )
    ).toEqual(true);

    expect(
      hasExactly(
        field.write(createThing(url), null),
        [url, predicate1, "one"],
        [url, predicate1, "two"]
      )
    ).toEqual(true);

    expect(
      hasExactly(
        field.write(createThing(url), undefined),
        [url, predicate1, "one"],
        [url, predicate1, "two"]
      )
    ).toEqual(true);
  });

  it("use the given serialize function when writing data", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
      serialize: (values) => values?.map((v) => "__" + v),
    });

    expect(
      hasExactly(
        field.write(createThing(url), ["one", "two"]),
        [url, predicate1, "__one"],
        [url, predicate1, "__two"]
      )
    ).toEqual(true);
  });

  it("can read data from a thing", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
    });

    const thing = createThing(
      url,
      [url, predicate1, "element one"],
      [url, predicate1, "element two"],
      [url, predicate1, "element three"]
    );

    expect(field.read(thing)).toEqual([
      "element one",
      "element two",
      "element three",
    ]);
  });

  it("can read data from multiple predicates", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1, predicate2],
    });

    const thing = createThing(
      url,
      [url, predicate2, "element one"],
      [url, predicate2, "element two"],
      [url, predicate2, "element three"]
    );

    expect(field.read(thing)).toEqual([
      "element one",
      "element two",
      "element three",
    ]);
  });

  it("read the default value if predicate does not exist", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
      default: ["one", "two"],
    });

    const thing = createThing(url);

    expect(field.read(thing)).toEqual(["one", "two"]);
  });

  it("use the given deserialize function when reading data", () => {
    const field = new ArrayField<string>({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
      deserialize: (values) => values?.map((v) => v + "__"),
    });

    const thing = createThing(
      url,
      [url, predicate1, "element one"],
      [url, predicate1, "element two"],
      [url, predicate1, "element three"]
    );

    expect(field.read(thing)).toEqual([
      "element one__",
      "element two__",
      "element three__",
    ]);
  });
});

describe("the `ArrayBuilder` class", () => {
  it("can build a simple ArrayField", () => {
    const field = new ArrayBuilder({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
    }).build();
    expect(field).toEqual(
      new ArrayField<string>({
        getter: getStringNoLocaleAll,
        setter: addStringNoLocale,
        predicates: [predicate1],
      })
    );
    expect(field).toBeInstanceOf(ArrayField);
  });

  it("can build an ArrayField with a default value", () => {
    const field = new ArrayBuilder({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
    })
      .default(["one", "two"])
      .build();
    expect(field).toEqual(
      new ArrayField<string>({
        getter: getStringNoLocaleAll,
        setter: addStringNoLocale,
        predicates: [predicate1],
        default: ["one", "two"],
      })
    );
    expect(field).toBeInstanceOf(ArrayField);
  });

  it("can build an ArrayField with a converter", () => {
    const serialize = (values: Maybe<string[]>) => values?.map((v) => v + "__");
    const deserialize = (values: Maybe<string[]>) =>
      values?.map((v) => v.substr(values.length - 2));
    const field = new ArrayBuilder({
      getter: getStringNoLocaleAll,
      setter: addStringNoLocale,
      predicates: [predicate1],
    })
      .converter(serialize, deserialize)
      .build();
    expect(field).toEqual(
      new ArrayField<string>({
        getter: getStringNoLocaleAll,
        setter: addStringNoLocale,
        predicates: [predicate1],
        serialize,
        deserialize,
      })
    );
    expect(field).toBeInstanceOf(ArrayField);
  });
});
