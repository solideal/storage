import { createThing } from "@inrupt/solid-client";
import { KeyField, KeyBuilder } from "./keyField";

const url = "http://an.entity#one";

describe("the `KeyField` class", () => {
  it("can read a Thing url", () => {
    const field = new KeyField();
    expect(field.read(createThing({ url }))).toEqual(url);
  });

  it("does nothing when writing", () => {
    const field = new KeyField();
    const thing = createThing({ url });
    expect(field.write(thing, "shoud not care")).toEqual(thing);
  });

  it("can convert a value to an url with the field converter", () => {
    const field = new KeyBuilder().base64().build();

    expect(field.read(createThing({ url }))).toEqual(
      "aHR0cDovL2FuLmVudGl0eSNvbmU="
    );
    expect(field.toUrl("aHR0cDovL2FuLmVudGl0eSNvbmU=")).toEqual(url);
  });

  it("does not convert a value to an url when no converter exist on the field", () => {
    const field = new KeyField();
    expect(field.toUrl("avalue")).toEqual("avalue");
  });

  it("can convert an url to a value with the field converter", () => {
    const field = new KeyBuilder().base64().build();
    expect(field.fromUrl(url)).toEqual("aHR0cDovL2FuLmVudGl0eSNvbmU=");
  });

  it("does not convert an url to a different value when no converter exist on the field", () => {
    const field = new KeyField();
    expect(field.fromUrl(url)).toEqual(url);
  });
});

describe("the `KeyBuilder` class", () => {
  it("can construct a basic KeyField", () => {
    expect(new KeyBuilder().build()).toEqual(new KeyField());
  });

  it("can construct a KeyField with custom converter", () => {
    const deserialize = (sourceUrl: string) => sourceUrl;
    const serialize = (value: string) => value;
    expect(new KeyBuilder().converter(serialize, deserialize).build()).toEqual(
      new KeyField({ deserialize, serialize })
    );
  });
});
