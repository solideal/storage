import * as solidClient from "@inrupt/solid-client";
import {
  resolveTypeLocation,
  NoLocationFound,
  NoWebIdDefined,
  resolveOrRegisterTypeLocation,
  NoIndexLocationFound,
  NoProfileFound,
} from "./resolver";
import { configure } from "./config";
import { createDataset, hasExactly } from "./ldutils.test";
import { solid, rdf } from "./namespaces";

// urls used in tests triples below
const urls = {
  webid: "https://yuukanoo.solid.community/profile/card#me",
  type: "https://www.w3.org/2002/01/bookmark#Bookmark",
  newBookmarks: "https://yuukanoo.solid.community/public/newbookmarks.ttl",
  newBookmarksRelative: "/public/newbookmarks.ttl",
  publicBookmarks: "https://yuukanoo.solid.community/public/bookmarks.ttl",
  privateBookmarks: "https://yuukanoo.solid.community/private/bookmarks.ttl",
} as const;

describe("the resolveTypeLocation function", () => {
  beforeEach(() => configure({ webid: undefined, fetch: undefined }));

  it("throw an error if no webid is defined", async () => {
    await expect(resolveTypeLocation(urls.type)).rejects.toThrowError(
      NoWebIdDefined
    );
  });

  it("use the global webid if defined", async () => {
    const spy = jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(createDataset(urls.webid))
      .mockClear();
    configure({ webid: urls.webid });

    await expect(resolveTypeLocation(urls.type)).rejects.toThrowError(
      new NoProfileFound().message
    );
    expect(spy.mock.calls[0][0]).toEqual(urls.webid);
  });

  it("use the provided fetch function", async () => {
    const spy = jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(createDataset(urls.webid))
      .mockClear();
    const fetch = jest.fn();
    await expect(
      resolveTypeLocation(urls.type, urls.webid, fetch)
    ).rejects.toThrowError(new NoProfileFound().message);

    expect(spy.mock.calls[0][1]).toEqual({ fetch });
  });

  it("use the global fetch function if no one is defined", async () => {
    const spy = jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(createDataset(urls.webid))
      .mockClear();

    const fetch = jest.fn();
    configure({ fetch });

    await expect(
      resolveTypeLocation(urls.type, urls.webid)
    ).rejects.toThrowError(new NoProfileFound().message);

    expect(spy.mock.calls[0][1]).toEqual({ fetch });
  });

  it("throws a NoLocationFound is no location could be found", async () => {
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(
        createDataset(urls.webid, [
          urls.webid,
          "http://some.predicate",
          "some value",
        ])
      )
      .mockClear();

    await expect(
      resolveTypeLocation(urls.type, urls.webid)
    ).rejects.toThrowError(new NoLocationFound(urls.type).message);
  });

  it("returns the first available location from the indexes", async () => {
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(
        createDataset(
          urls.webid,
          [urls.webid, solid.publicTypeIndex, urls.webid],
          [urls.webid, solid.privateTypeIndex, "http://private.type.index"],
          ["http://public.type.index#reg2", rdf.type, solid.TypeRegistration],
          ["http://public.type.index#reg2", solid.forClass, urls.type],
          [
            "http://public.type.index#reg2",
            solid.instance,
            urls.publicBookmarks,
          ],
          ["http://public.type.index#reg3", rdf.type, solid.TypeRegistration],
          ["http://public.type.index#reg3", solid.forClass, urls.type],
          ["http://public.type.index#reg3", solid.instance, "http://other.one"]
        )
      )
      .mockClear();

    expect(await resolveTypeLocation(urls.type, urls.webid)).toEqual(
      urls.publicBookmarks
    );
  });
});

describe("the resolveOrRegisterTypeLocation function", () => {
  beforeEach(() => configure({ webid: undefined, fetch: undefined }));

  it("returns the location if already defined for a type", async () => {
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(
        createDataset(
          urls.webid,
          [urls.webid, solid.publicTypeIndex, urls.webid],
          ["http://public.type.index#reg2", rdf.type, solid.TypeRegistration],
          ["http://public.type.index#reg2", solid.forClass, urls.type],
          [
            "http://public.type.index#reg2",
            solid.instance,
            urls.publicBookmarks,
          ]
        )
      )
      .mockClear();

    expect(
      await resolveOrRegisterTypeLocation(
        urls.type,
        { path: urls.newBookmarks, index: "public" },
        urls.webid
      )
    ).toEqual(urls.publicBookmarks);
  });

  it("throw an error if no webid is defined", async () => {
    await expect(
      resolveOrRegisterTypeLocation(urls.type, {
        path: urls.newBookmarks,
        index: "public",
      })
    ).rejects.toThrow(new NoWebIdDefined().message);
  });

  it("use the global webid if available and not given locally", async () => {
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(createDataset(urls.webid))
      .mockClear();

    configure({ webid: urls.webid });

    await expect(
      resolveOrRegisterTypeLocation(urls.type, {
        path: urls.newBookmarks,
        index: "public",
      })
    ).rejects.toThrow(new NoProfileFound().message);
  });

  it("throw an error if no public index exists", async () => {
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(
        createDataset(urls.webid, [
          urls.webid,
          "http://some.predicate",
          "some value",
        ])
      )
      .mockClear();

    await expect(
      resolveOrRegisterTypeLocation(
        urls.type,
        { path: urls.newBookmarks, index: "public" },
        urls.webid
      )
    ).rejects.toThrow(new NoIndexLocationFound().message);
  });

  it("throw an error if no private index exists", async () => {
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(
        createDataset(urls.webid, [
          urls.webid,
          "http://some.predicate",
          "some value",
        ])
      )
      .mockClear();

    await expect(
      resolveOrRegisterTypeLocation(
        urls.type,
        { path: urls.newBookmarks, index: "private" },
        urls.webid
      )
    ).rejects.toThrow(new NoIndexLocationFound().message);
  });

  it("can create a type registration and dataset if asked to", async () => {
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(
        createDataset(urls.webid, [
          urls.webid,
          solid.publicTypeIndex,
          urls.webid,
        ])
      )
      .mockClear();
    jest
      .spyOn(solidClient, "createThing")
      .mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        solidClient.createThing({ url: "http://a.registration#thing" }) as any
      )
      .mockClear();
    const spy = jest
      .spyOn(solidClient, "saveSolidDatasetAt")
      .mockImplementation(async (url) =>
        Object.assign(createDataset(url.toString()), {
          internal_changeLog: {
            additions: [],
            deletions: [],
          },
        })
      )
      .mockClear();

    expect(
      await resolveOrRegisterTypeLocation(
        urls.type,
        { path: urls.newBookmarks, index: "public" },
        urls.webid
      )
    ).toEqual(urls.newBookmarks);

    // It must have created a new empty dataset for our data to be persisted
    // at the given location
    expect(spy.mock.calls).toHaveLength(2);
    expect(spy.mock.calls[0][0]).toEqual(urls.newBookmarks);
    expect(hasExactly(spy.mock.calls[0][1])).toEqual(true); // must be empty

    // And it should have updated the public type index with the new registration
    // refering to the dataset above
    expect(spy.mock.calls[1][0]).toEqual(urls.webid);
    expect(
      hasExactly(
        spy.mock.calls[1][1],
        [urls.webid, solid.publicTypeIndex, urls.webid],
        ["http://a.registration#thing", rdf.type, solid.TypeRegistration],
        ["http://a.registration#thing", solid.forClass, urls.type],
        ["http://a.registration#thing", solid.instance, urls.newBookmarks]
      )
    ).toEqual(true);
  });

  it("can create a type registration and dataset if asked to with a relative url", async () => {
    jest
      .spyOn(solidClient, "getSolidDataset")
      .mockResolvedValue(
        createDataset(urls.webid, [
          urls.webid,
          solid.publicTypeIndex,
          urls.webid,
        ])
      )
      .mockClear();
    jest
      .spyOn(solidClient, "createThing")
      .mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        solidClient.createThing({ url: "http://a.registration#thing" }) as any
      )
      .mockClear();
    const spy = jest
      .spyOn(solidClient, "saveSolidDatasetAt")
      .mockImplementation(async (url) =>
        Object.assign(createDataset(url.toString()), {
          internal_changeLog: {
            additions: [],
            deletions: [],
          },
        })
      )
      .mockClear();

    expect(
      await resolveOrRegisterTypeLocation(
        urls.type,
        { path: urls.newBookmarksRelative, index: "public" },
        urls.webid
      )
    ).toEqual(urls.newBookmarks);

    // It must have created a new empty dataset for our data to be persisted
    // at the given location
    expect(spy.mock.calls).toHaveLength(2);
    expect(spy.mock.calls[0][0]).toEqual(urls.newBookmarks);
    expect(hasExactly(spy.mock.calls[0][1])).toEqual(true); // must be empty

    // And it should have updated the public type index with the new registration
    // refering to the dataset above
    expect(spy.mock.calls[1][0]).toEqual(urls.webid);
    expect(
      hasExactly(
        spy.mock.calls[1][1],
        [urls.webid, solid.publicTypeIndex, urls.webid],
        ["http://a.registration#thing", rdf.type, solid.TypeRegistration],
        ["http://a.registration#thing", solid.forClass, urls.type],
        ["http://a.registration#thing", solid.instance, urls.newBookmarks]
      )
    ).toEqual(true);
  });
});
