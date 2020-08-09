import * as solid from "@inrupt/solid-client";
import { Repository, NoTypeDefined } from "./repository";
import { Schema, is } from "./schema";
import { createDataset, hasExactly } from "./ldutils.test";
import { rdf } from "./namespaces";
import { configure } from "./config";
import * as resolvers from "./resolver";

/**
 * Let's setup some data first!
 */

const bookmark1 = {
  id: "aHR0cDovL2Jvb2ttYXJrLnR0bCMx", // == http://bookmark.ttl#1
  title: "the first bookmark",
  url: "http://localhost:3000",
};

const bookmark2 = {
  id: "aHR0cDovL2Jvb2ttYXJrLnR0bCMy", // == http://bookmark.ttl#2
  title: "the second bookmark",
  url: "http://localhost:4000",
};

type Bookmark = typeof bookmark1;

const bookmarkTypePredicate = "https://www.w3.org/2002/01/bookmark#Bookmark";
const titlePredicate = "http://purl.org/dc/elements/1.1/title";
const urlPredicate = "https://www.w3.org/2002/01/bookmark#recalls";
const webid = "https://yuukanoo.solid.community/profile/card#me";

// And here's our dataset containing 2 bookmarks and another kind of data
const sampleDataset = createDataset(
  "https://some.bookmarks/here.ttl",
  ["http://bookmark.ttl#1", rdf.type, bookmarkTypePredicate],
  ["http://bookmark.ttl#1", titlePredicate, bookmark1.title],
  ["http://bookmark.ttl#1", urlPredicate, bookmark1.url],
  ["http://bookmark.ttl#2", rdf.type, bookmarkTypePredicate],
  ["http://bookmark.ttl#2", titlePredicate, bookmark2.title],
  ["http://bookmark.ttl#2", urlPredicate, bookmark2.url],
  [
    "http://bookmark.ttl#anotherTypeOfResource",
    rdf.type,
    "http://another.kind.of.resource",
  ]
);

describe("the `Repository` class", () => {
  // Reset global repository options before each tests
  beforeEach(() => configure({ webid: undefined, fetch: undefined }));

  it("can be constructed with a schema", () => {
    expect(
      new Repository<Bookmark>({
        source: sampleDataset.internal_resourceInfo.sourceIri,
        schema: new Schema<Bookmark>(bookmarkTypePredicate, {
          id: is.key().base64(),
          title: is.string(titlePredicate),
        }),
      })
    ).toBeDefined();
  });

  it("can be constructed with a definition but needs a type url in this case", () => {
    expect(
      () =>
        new Repository<Bookmark>({
          source: sampleDataset.internal_resourceInfo.sourceIri,
          schema: {
            id: is.key().base64(),
            title: is.string(titlePredicate),
          },
        })
    ).toThrow(new NoTypeDefined());
    expect(
      new Repository<Bookmark>({
        source: sampleDataset.internal_resourceInfo.sourceIri,
        type: bookmarkTypePredicate,
        schema: {
          id: is.key().base64(),
          title: is.string(titlePredicate),
        },
      })
    ).toBeDefined();
  });

  it("can returns all data of the Repository type in a dataset", async () => {
    const spy = jest
      .spyOn(solid, "getSolidDataset")
      .mockResolvedValue(sampleDataset)
      .mockClear();

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    expect(await repo.find()).toEqual([bookmark1, bookmark2]);
    expect(spy.mock.calls).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toEqual(
      sampleDataset.internal_resourceInfo.sourceIri
    );
    expect(spy.mock.calls[0][1]).toBeUndefined();
  });

  it("can returns all data matching a filter function", async () => {
    jest.spyOn(solid, "getSolidDataset").mockResolvedValue(sampleDataset);

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    expect(
      await repo.find((data) => data.title.indexOf("second") !== -1)
    ).toEqual([bookmark2]);
  });

  it("can return a data by its key", async () => {
    jest.spyOn(solid, "getSolidDataset").mockResolvedValue(sampleDataset);

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    expect(await repo.only(bookmark2.id)).toEqual(bookmark2);
    expect(await repo.only(bookmark1.id)).toEqual(bookmark1);
    // This string represents http://bookmark.ttl#4 which does not exist in our dataset
    expect(await repo.only("aHR0cDovL2Jvb2ttYXJrLnR0bCM0")).toBeNull();
  });

  it("can return a data by a filter function", async () => {
    jest.spyOn(solid, "getSolidDataset").mockResolvedValue(sampleDataset);

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    expect(
      await repo.only((data) => data.title.indexOf("second") !== -1)
    ).toEqual(bookmark2);
    expect(await repo.only((data) => data.title === "second")).toBeNull();
  });

  it("correctly pass the given fetch option", async () => {
    const fetch = jest.fn();
    const spy = jest
      .spyOn(solid, "getSolidDataset")
      .mockResolvedValue(sampleDataset)
      .mockClear();

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      fetch,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    await repo.find();

    expect(spy.mock.calls).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toEqual(
      sampleDataset.internal_resourceInfo.sourceIri
    );
    expect(spy.mock.calls[0][1]).toEqual({ fetch });
  });

  it("takes global options by default", async () => {
    const fetch = jest.fn();
    const spy = jest
      .spyOn(solid, "getSolidDataset")
      .mockResolvedValue(sampleDataset)
      .mockClear();

    configure({ fetch });

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    await repo.find();

    expect(spy.mock.calls).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toEqual(
      sampleDataset.internal_resourceInfo.sourceIri
    );
    expect(spy.mock.calls[0][1]).toEqual({ fetch });
  });

  it("repository instance options takes precedence over global one", async () => {
    const fetch = jest.fn();
    const spy = jest
      .spyOn(solid, "getSolidDataset")
      .mockResolvedValue(sampleDataset)
      .mockClear();

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    configure({ fetch: () => {} });

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      fetch,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    await repo.find();

    expect(spy.mock.calls).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toEqual(
      sampleDataset.internal_resourceInfo.sourceIri
    );
    expect(spy.mock.calls[0][1]).toEqual({ fetch });
  });

  it("can add data to a repository", async () => {
    jest.spyOn(solid, "getSolidDataset").mockResolvedValue(sampleDataset);
    const spy = jest
      .spyOn(solid, "saveSolidDatasetAt")
      .mockResolvedValue(
        Object.assign(sampleDataset, {
          internal_changeLog: {
            additions: [],
            deletions: [],
          },
        })
      )
      .mockClear();

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      schema: {
        id: is.key(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    const newBookmark: Bookmark = {
      id: "",
      title: "a new bookmark to save",
      url: "http://a.new.url",
    };

    await repo.save(newBookmark);

    expect(newBookmark.id).not.toBeFalsy();
    expect(spy.mock.calls[0][0]).toEqual(
      sampleDataset.internal_resourceInfo.sourceIri
    );
    expect(
      hasExactly(
        spy.mock.calls[0][1],
        ["http://bookmark.ttl#1", rdf.type, bookmarkTypePredicate],
        ["http://bookmark.ttl#1", titlePredicate, bookmark1.title],
        ["http://bookmark.ttl#1", urlPredicate, bookmark1.url],
        ["http://bookmark.ttl#2", rdf.type, bookmarkTypePredicate],
        ["http://bookmark.ttl#2", titlePredicate, bookmark2.title],
        ["http://bookmark.ttl#2", urlPredicate, bookmark2.url],
        [
          "http://bookmark.ttl#anotherTypeOfResource",
          rdf.type,
          "http://another.kind.of.resource",
        ],
        [newBookmark.id, rdf.type, bookmarkTypePredicate],
        [newBookmark.id, titlePredicate, newBookmark.title],
        [newBookmark.id, urlPredicate, newBookmark.url]
      )
    ).toEqual(true);
  });

  it("can update existing data on a repository", async () => {
    jest.spyOn(solid, "getSolidDataset").mockResolvedValue(sampleDataset);
    const spy = jest
      .spyOn(solid, "saveSolidDatasetAt")
      .mockResolvedValue(
        Object.assign(sampleDataset, {
          internal_changeLog: {
            additions: [],
            deletions: [],
          },
        })
      )
      .mockClear();

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    const updatedOne = {
      ...bookmark1,
      title: "updated title!",
    };

    await repo.save(updatedOne);

    expect(updatedOne.id).toEqual(bookmark1.id);
    expect(spy.mock.calls[0][0]).toEqual(
      sampleDataset.internal_resourceInfo.sourceIri
    );
    expect(
      hasExactly(
        spy.mock.calls[0][1],
        ["http://bookmark.ttl#1", rdf.type, bookmarkTypePredicate],
        ["http://bookmark.ttl#1", titlePredicate, "updated title!"],
        ["http://bookmark.ttl#1", urlPredicate, bookmark1.url],
        ["http://bookmark.ttl#2", rdf.type, bookmarkTypePredicate],
        ["http://bookmark.ttl#2", titlePredicate, bookmark2.title],
        ["http://bookmark.ttl#2", urlPredicate, bookmark2.url],
        [
          "http://bookmark.ttl#anotherTypeOfResource",
          rdf.type,
          "http://another.kind.of.resource",
        ]
      )
    ).toEqual(true);
  });

  it("can remove data from a repository by its key or an object", async () => {
    jest.spyOn(solid, "getSolidDataset").mockResolvedValue(sampleDataset);
    const spy = jest
      .spyOn(solid, "saveSolidDatasetAt")
      .mockResolvedValue(
        Object.assign(sampleDataset, {
          internal_changeLog: {
            additions: [],
            deletions: [],
          },
        })
      )
      .mockClear();

    const repo = new Repository<Bookmark>({
      source: sampleDataset.internal_resourceInfo.sourceIri,
      type: bookmarkTypePredicate,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    await repo.remove(bookmark1.id, bookmark2);

    expect(spy.mock.calls[0][0]).toEqual(
      sampleDataset.internal_resourceInfo.sourceIri
    );
    expect(
      hasExactly(spy.mock.calls[0][1], [
        "http://bookmark.ttl#anotherTypeOfResource",
        rdf.type,
        "http://another.kind.of.resource",
      ])
    ).toEqual(true);
  });

  it("provides a shortcut to resolve a source and instantiate a repository", async () => {
    const spy = jest
      .spyOn(resolvers, "resolveTypeLocation")
      .mockResolvedValue(
        "https://yuukanoo.solid.community/public/bookmarks.ttl"
      )
      .mockClear();

    configure({ webid });

    const repo = await Repository.resolve({
      type: bookmarkTypePredicate,
      schema: {
        id: is.key().base64(),
        title: is.string(titlePredicate),
        url: is.url(urlPredicate),
      },
    });

    expect(repo["options"]["source"]).toEqual(
      "https://yuukanoo.solid.community/public/bookmarks.ttl"
    );
    expect(spy.mock.calls[0][0]).toEqual(bookmarkTypePredicate);
  });

  it("provides a shortcut to resolve or create a source and instantiate a repository", async () => {
    jest
      .spyOn(resolvers, "resolveTypeLocation")
      .mockImplementation(() => {
        throw new resolvers.NoLocationFound(bookmarkTypePredicate);
      })
      .mockClear();
    const spy = jest
      .spyOn(resolvers, "resolveOrRegisterTypeLocation")
      .mockResolvedValue(
        "https://yuukanoo.solid.community/public/newbookmarks.ttl"
      )
      .mockClear();

    configure({ webid });

    const repo = await Repository.resolve(
      {
        type: bookmarkTypePredicate,
        schema: {
          id: is.key().base64(),
          title: is.string(titlePredicate),
          url: is.url(urlPredicate),
        },
      },
      {
        path: "/public/newbookmarks.ttl",
      }
    );

    expect(repo["options"]["source"]).toEqual(
      "https://yuukanoo.solid.community/public/newbookmarks.ttl"
    );
    expect(spy.mock.calls[0][0]).toEqual(bookmarkTypePredicate);
  });
});
