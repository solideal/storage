/**
 * This file provides common utilities to create datasets and things to be
 * used when testing this package.
 * It is not meant to be use by external packages and that's why it is here.
 */

import { DataFactory, Quad_Object } from "n3";
import { Quad } from "rdf-js";
import {
  createThing as solidCreateThing,
  setUrl,
  setStringNoLocale,
  SolidDataset,
  WithResourceInfo,
  createSolidDataset,
  ThingPersisted,
} from "@inrupt/solid-client";

// Triple type which makes it more convenient
type Triple = [string, string, unknown];

// Since I do not seem to have access to the DatasetCore interface
interface QuadContainer {
  has(quad: Quad): boolean;
  size: number;
  delete(quad: Quad): this;
  add(quad: Quad): this;
}

/**
 * Dynamically create a Quad with appropriate Quad_Object based on the object
 * type.
 */
export function createQuad(
  subject: string,
  predicate: string,
  object: unknown
): Quad {
  const objectAsString = object as string;
  let quadObject: Quad_Object;

  switch (typeof object) {
    case "boolean":
      quadObject = DataFactory.literal(
        object ? "true" : "false",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean")
      );
      break;
    case "number":
      quadObject = DataFactory.literal(
        object.toString(),
        DataFactory.namedNode(
          `http://www.w3.org/2001/XMLSchema#${
            object % 1 === 0 ? "integer" : "decimal"
          }`
        )
      );
      break;
    case "object":
      if (object instanceof Date) {
        quadObject = DataFactory.literal(
          object.toISOString(),
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#dateTime")
        );
        break;
      }
      throw new Error("don't know what to do!");
    default:
      quadObject = objectAsString.startsWith("http")
        ? DataFactory.namedNode(objectAsString)
        : DataFactory.literal(objectAsString);
  }
  return DataFactory.quad(
    DataFactory.namedNode(subject),
    DataFactory.namedNode(predicate),
    quadObject
  );
}

/**
 * Create a thing with given triples inside it.
 */
export function createThing(url: string, ...triples: Triple[]): ThingPersisted {
  return triples.reduce(
    (thing, triple) => thing.add(createQuad(triple[0], triple[1], triple[2])),
    solidCreateThing({ url })
  );
}

/**
 * Create a solid dataset with given triples inside it.
 */
export function createDataset(
  url: string,
  ...triples: Triple[]
): SolidDataset &
  WithResourceInfo & {
    internal_resourceInfo: { linkedResources: Record<string, string[]> };
  } {
  return Object.assign(
    triples.reduce(
      (ds, triple) => ds.add(createQuad(triple[0], triple[1], triple[2])),
      createSolidDataset()
    ),
    {
      internal_resourceInfo: {
        isRawData: false,
        sourceIri: url,
        linkedResources: {},
      },
    }
  );
}

/**
 * Checks that the given quad container contains exactly given triples, no more, no less.
 * It will also resolve local iri if needed.
 */
export function hasExactly(
  container: QuadContainer,
  ...triples: Triple[]
): boolean {
  // Dirty hack to resolve local iri...
  const resolvedContainer = Array.from(container as SolidDataset)
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q: any) => q.subject.internal_name
    )
    .reduce(
      (ds, q) =>
        ds.delete(q).add({
          ...q,
          subject: DataFactory.namedNode(
            `${
              (container as SolidDataset & WithResourceInfo)
                .internal_resourceInfo.sourceIri
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }#${(q as any).subject.internal_name}`
          ),
        }),
      container as SolidDataset
    );

  return (
    resolvedContainer.size === triples.length &&
    triples.every((triple) =>
      resolvedContainer.has(createQuad(triple[0], triple[1], triple[2]))
    )
  );
}

const urls = {
  iri: "http://a.resource.url",
  subject: "http://subject.url",
  predicate: "http://predicate.url",
  predicate2: "http://predicate.two.url",
} as const;

type CreateQuadCase = [string, { value: unknown; expected: Quad_Object }];

describe("the ldutils module", () => {
  const createQuadCases: CreateQuadCase[] = [
    [
      "literal value",
      {
        value: "a literal value",
        expected: DataFactory.literal("a literal value"),
      },
    ],
    [
      "url value",
      {
        value: "http://an.url.to.a.resource",
        expected: DataFactory.namedNode("http://an.url.to.a.resource"),
      },
    ],
    [
      "boolean value false",
      {
        value: false,
        expected: DataFactory.literal(
          "false",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean")
        ),
      },
    ],
    [
      "boolean value true",
      {
        value: true,
        expected: DataFactory.literal(
          "true",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean")
        ),
      },
    ],
    [
      "integer value",
      {
        value: 42,
        expected: DataFactory.literal(
          "42",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
        ),
      },
    ],
    [
      "decimal value",
      {
        value: 42.2,
        expected: DataFactory.literal(
          "42.2",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#decimal")
        ),
      },
    ],
    [
      "datetime value",
      {
        value: new Date("2020-05-06T14:31:02.000Z"),
        expected: DataFactory.literal(
          "2020-05-06T14:31:02.000Z",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#dateTime")
        ),
      },
    ],
  ];

  it.each(createQuadCases)(
    "createQuad can create quad from %s",
    (_, { value, expected }) => {
      expect(createQuad(urls.subject, urls.predicate, value)).toEqual(
        DataFactory.quad(
          DataFactory.namedNode(urls.subject),
          DataFactory.namedNode(urls.predicate),
          expected
        )
      );
    }
  );

  it("can create a thing from triples", () => {
    const thing = createThing(
      urls.iri,
      [urls.subject, urls.predicate, urls.subject],
      [urls.subject, urls.predicate2, "a literal value"]
    );

    expect(thing.internal_url).toEqual(urls.iri);
    expect(
      hasExactly(thing, [urls.subject, urls.predicate, urls.subject])
    ).toEqual(false);
    expect(
      hasExactly(
        thing,
        [urls.subject, urls.predicate, urls.predicate2],
        [urls.subject, urls.predicate2, "a wrong literal value"]
      )
    ).toEqual(false);
    expect(
      hasExactly(
        thing,
        [urls.subject, urls.predicate, urls.subject],
        [urls.subject, urls.predicate2, "a literal value"]
      )
    ).toEqual(true);
  });

  it("can create a dataset from triples", () => {
    const dataset = createDataset(
      urls.iri,
      [urls.subject, urls.predicate, urls.subject],
      [urls.subject, urls.predicate2, "a literal value"]
    );

    expect(dataset.internal_resourceInfo.sourceIri).toEqual(urls.iri);
    expect(
      hasExactly(dataset, [urls.subject, urls.predicate, urls.subject])
    ).toEqual(false);
    expect(
      hasExactly(
        dataset,
        [urls.subject, urls.predicate, urls.predicate2],
        [urls.subject, urls.predicate2, "a wrong literal value"]
      )
    ).toEqual(false);
    expect(
      hasExactly(
        dataset,
        [urls.subject, urls.predicate, urls.subject],
        [urls.subject, urls.predicate2, "a literal value"]
      )
    ).toEqual(true);
  });

  it("can check for triples existence in a thing", () => {
    const thing = setStringNoLocale(
      setUrl(
        solidCreateThing({ url: urls.subject }),
        urls.predicate,
        urls.subject
      ),
      urls.predicate2,
      "a literal value"
    );

    expect(
      hasExactly(thing, [urls.subject, urls.predicate, urls.subject])
    ).toEqual(false);
    expect(
      hasExactly(
        thing,
        [urls.subject, urls.predicate, urls.predicate2],
        [urls.subject, urls.predicate2, "a wrong literal value"]
      )
    ).toEqual(false);
    expect(
      hasExactly(
        thing,
        [urls.subject, urls.predicate, urls.subject],
        [urls.subject, urls.predicate2, "a literal value"]
      )
    ).toEqual(true);
  });
});
