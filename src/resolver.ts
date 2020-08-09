import {
  getSolidDataset,
  getThing,
  getUrl,
  getThingAll,
  createSolidDataset,
  saveSolidDatasetAt,
  createThing,
  setThing,
} from "@inrupt/solid-client";
import { Fetcher } from "./types";
import { setting } from "./config";
import { solid } from "./namespaces";
import { Schema, is } from "./schema";

export class NoWebIdDefined extends Error {
  constructor() {
    super(
      "looks like you don't give a webid and the global one has not been set either"
    );
  }
}

export class NoLocationFound extends Error {
  constructor(type: string) {
    super(
      `could not find any location to the store that kind of data: ${type}`
    );
  }
}

export class NoIndexLocationFound extends Error {
  constructor() {
    super("could not find the type index location");
  }
}

/**
 * Type registration schema making use of this library ;)
 */
const typeRegistrationSchema = new Schema<{
  url?: string;
  forClass: string;
  instance: string;
}>(solid.TypeRegistration, {
  url: is.key(),
  forClass: is.url(solid.forClass),
  instance: is.url(solid.instance),
});

/**
 * Resolve a type location by looking at the webid public and private type indexes.
 * It will returns the first location that contains the desired type and for which
 * we have access to (so it can't return a location in which you don't have at least
 * read access).
 */
export async function resolveTypeLocation(
  type: string,
  webid?: string,
  fetch?: unknown
): Promise<string> {
  const options = fetcher(fetch);
  const wid = webid ?? setting("webid");

  if (!wid) {
    throw new NoWebIdDefined();
  }

  const profile = getThing(await getSolidDataset(wid, options), wid);
  const locations = await findAvailableTypeLocationsInDatasets(
    type,
    [
      getUrl(profile, solid.publicTypeIndex),
      getUrl(profile, solid.privateTypeIndex),
    ],
    options
  );

  if (locations.length === 0) {
    throw new NoLocationFound(type);
  }

  return locations[0];
}

export interface CreateOptions {
  path: string;
  index: "public" | "private";
}

/**
 * Resolve a type location or create it if it could not be found. This function
 * will create the needed dataset and register the managed type in the public
 * or private type index.
 */
export async function resolveOrRegisterTypeLocation(
  type: string,
  options: CreateOptions,
  webid?: string,
  fetch?: unknown
): Promise<string> {
  try {
    return await resolveTypeLocation(type, webid, fetch);
  } catch (e) {
    if (!(e instanceof NoLocationFound)) {
      throw e;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const wid = (webid ?? setting("webid"))!; // This one is safe since it will be thrown by the first call
    const fetchOptions = fetcher(fetch);
    const profile = getThing(await getSolidDataset(wid, fetchOptions), wid);
    const indexUrl = getUrl(
      profile,
      options.index === "public"
        ? solid.publicTypeIndex
        : solid.privateTypeIndex
    );

    if (!indexUrl) {
      throw new NoIndexLocationFound();
    }

    // New empty dataset to hold our data
    const dataset = await saveSolidDatasetAt(
      options.path.startsWith("http")
        ? options.path
        : new URL(options.path, wid).toString(),
      createSolidDataset(),
      fetchOptions
    );
    await saveSolidDatasetAt(
      indexUrl,
      setThing(
        await getSolidDataset(indexUrl, fetchOptions),
        typeRegistrationSchema.write(createThing(), {
          forClass: type,
          instance: dataset.internal_resourceInfo.sourceIri,
        })
      ),
      fetchOptions
    );

    return dataset.internal_resourceInfo.sourceIri;
  }
}

/**
 * Try to find available type locations by looking at solid type indexes.
 */
async function findAvailableTypeLocationsInDatasets(
  type: string,
  urls: (string | null)[],
  fetcher?: Fetcher
): Promise<string[]> {
  const locations: string[] = [];

  for (const url of urls) {
    if (!url) {
      continue;
    }

    try {
      const registrations = getThingAll(await getSolidDataset(url, fetcher))
        .filter((t) => typeRegistrationSchema.ofType(t))
        .map((t) => typeRegistrationSchema.read(t))
        .filter((t) => t.forClass === type);

      for (const availableLocation of registrations) {
        try {
          await getSolidDataset(availableLocation.instance, fetcher);
          locations.push(availableLocation.instance);
        } catch {
          // Failure is expected here, that means we do not have access rights
          // to access the resource
        }
      }
    } catch {
      // Failure expected when the type index is not accessible
    }
  }
  return locations;
}

/**
 * Returns a fetcher options used for getSolidDataset and saveSolidDatasetAt by
 * using the global one if given fetch is undefined.
 */
export function fetcher(fetch?: unknown): Fetcher | undefined {
  const f = fetch ?? setting("fetch");
  return f && { fetch: f };
}
