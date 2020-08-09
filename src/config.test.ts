import { configure, setting } from "./config";

describe("the config module", () => {
  beforeEach(() =>
    configure({
      webid: undefined,
      fetch: undefined,
    })
  );

  it("should be empty by default", () => {
    expect(setting("fetch")).toBeUndefined();
    expect(setting("webid")).toBeUndefined();
  });

  it("should be configurable", () => {
    configure({ webid: "http://a.web.id" });
    expect(setting("fetch")).toBeUndefined();
    expect(setting("webid")).toEqual("http://a.web.id");

    const fetch = jest.fn();
    configure({ fetch });
    expect(setting("fetch")).toEqual(fetch);
    expect(setting("webid")).toEqual("http://a.web.id");
  });

  it("should be revertable", () => {
    configure({ webid: "http://a.web.id" });
    expect(setting("webid")).toEqual("http://a.web.id");
    configure({ webid: undefined });
    expect(setting("webid")).toBeUndefined();
  });
});
