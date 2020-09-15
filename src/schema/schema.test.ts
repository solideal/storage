import { createThing, setUrl } from "@inrupt/solid-client";
import { Schema, NoKeyDefined, is } from "./schema";
import { hasExactly } from "../ldutils.test";

const url = "http://an.entity#one";
const predicate1 = "http://predicate.one";
const predicate2 = "http://predicate.two";
const predicate3 = "http://predicate.three";
const predicate4 = "http://predicate.four";
const predicate5 = "http://predicate.five";
const predicate6 = "http://predicate.six";
const predicate7 = "http://predicate.seven";
const predicate8 = "http://predicate.eight";
const predicate9 = "http://predicate.nine";
const predicate10 = "http://predicate.ten";
const predicate11 = "http://predicate.eleven";
const predicate12 = "http://predicate.twelve";

describe("the `Schema` class", () => {
  it("needs a KeyField definition", () => {
    expect(() => new Schema(predicate1, {})).toThrowError(new NoKeyDefined());
  });

  it("provides a way to check if a Thing has the type of a schema", () => {
    const schema = new Schema(predicate1, {
      url: is.key(),
    });
    expect(schema.ofType(createThing({ url }))).toEqual(false);
    expect(
      schema.ofType(
        setUrl(
          createThing({ url }),
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
          predicate1
        )
      )
    ).toEqual(true);
  });

  it("provides a way to convert a key to an url by using the KeyField", () => {
    let schema = new Schema(predicate1, {
      url: is.key(),
    });
    expect(schema.getUrl("")).toEqual("");
    expect(schema.getUrl(url)).toEqual(url);
    expect(schema.getUrl({ url })).toEqual(url);

    schema = new Schema(predicate1, {
      url: is.key().base64(),
    });

    expect(schema.getUrl("aHR0cDovL2FuLmVudGl0eSNvbmU=")).toEqual(url);
    expect(schema.getUrl({ url: "aHR0cDovL2FuLmVudGl0eSNvbmU=" })).toEqual(url);
  });

  it("provides a way to set a key to a data by using the KeyField", () => {
    const bookmark = { url: "" };
    let schema = new Schema(predicate1, {
      url: is.key(),
    });

    schema.setUrl(bookmark, url);

    expect(bookmark.url).toEqual(url);

    schema = new Schema(predicate1, {
      url: is.key().base64(),
    });

    schema.setUrl(bookmark, url);

    expect(bookmark.url).toEqual("aHR0cDovL2FuLmVudGl0eSNvbmU=");
  });

  it("can convert a javascript object to a Thing given a definition", () => {
    const data = {
      id: "aHR0cDovL2FuLmVudGl0eSNvbmU=",
      aString: "A title",
      aBoolean: false,
      anUrl: "https://some.website.url",
      anInteger: 42,
      aDecimal: 133.7,
      aDate: new Date("2020-05-04T13:37:42.000Z"),
      someStrings: ["one", "two"],
      someBooleans: [true, false],
      someUrls: ["https://some.website1.url", "https://some.website2.url"],
      someIntegers: [1, 2],
      someDecimals: [1.2, 3.4],
      someDates: [
        new Date("2020-06-04T13:37:42.000Z"),
        new Date("2020-07-04T13:37:42.000Z"),
      ],
    };
    const schema = new Schema<typeof data>(predicate1, {
      id: is.key().base64(),
      aString: is.string(predicate1),
      aBoolean: is.boolean(predicate2),
      anUrl: is.url(predicate3),
      anInteger: is.integer(predicate4),
      aDecimal: is.decimal(predicate5),
      aDate: is.datetime(predicate6),
      someStrings: is.strings(predicate7),
      someBooleans: is.booleans(predicate8),
      someUrls: is.urls(predicate9),
      someIntegers: is.integers(predicate10),
      someDecimals: is.decimals(predicate11),
      someDates: is.datetimes(predicate12),
    });

    const thing = schema.write(createThing({ url }), data);

    expect(
      hasExactly(
        thing,
        [url, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", predicate1],
        [url, predicate1, data.aString],
        [url, predicate2, data.aBoolean],
        [url, predicate3, data.anUrl],
        [url, predicate4, data.anInteger],
        [url, predicate5, data.aDecimal],
        [url, predicate6, data.aDate],
        [url, predicate7, data.someStrings[0]],
        [url, predicate7, data.someStrings[1]],
        [url, predicate8, data.someBooleans[0]],
        [url, predicate8, data.someBooleans[1]],
        [url, predicate9, data.someUrls[0]],
        [url, predicate9, data.someUrls[1]],
        [url, predicate10, data.someIntegers[0]],
        [url, predicate10, data.someIntegers[1]],
        [url, predicate11, data.someDecimals[0]],
        [url, predicate11, data.someDecimals[1]],
        [url, predicate12, data.someDates[0]],
        [url, predicate12, data.someDates[1]]
      )
    ).toEqual(true);
  });

  it("can convert a Thing to a javascript object given a definition", () => {
    const data = {
      id: "aHR0cDovL2FuLmVudGl0eSNvbmU=",
      aString: "A title",
      aBoolean: false,
      anUrl: "https://some.website.url",
      anInteger: 42,
      aDecimal: 133.7,
      aDate: new Date("2020-05-04T13:37:42Z"),
      someStrings: ["one", "two"],
      someBooleans: [true, false],
      someUrls: ["https://some.website1.url", "https://some.website2.url"],
      someIntegers: [1, 2],
      someDecimals: [1.2, 3.4],
      someDates: [
        new Date("2020-06-04T13:37:42.000Z"),
        new Date("2020-07-04T13:37:42.000Z"),
      ],
    };
    const schema = new Schema<typeof data>(predicate1, {
      id: is.key().base64(),
      aString: is.string(predicate1),
      aBoolean: is.boolean(predicate2),
      anUrl: is.url(predicate3),
      anInteger: is.integer(predicate4),
      aDecimal: is.decimal(predicate5),
      aDate: is.datetime(predicate6),
      someStrings: is.strings(predicate7),
      someBooleans: is.booleans(predicate8),
      someUrls: is.urls(predicate9),
      someIntegers: is.integers(predicate10),
      someDecimals: is.decimals(predicate11),
      someDates: is.datetimes(predicate12),
    });
    const thing = schema.write(createThing({ url }), data);

    expect(schema.read(thing)).toEqual(data);
  });
});
