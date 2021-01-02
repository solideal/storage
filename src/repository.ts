import {
  getThingAll,
  SolidDataset,
  getSolidDataset,
  WithResourceInfo,
  getThing,
  removeThing,
  saveSolidDatasetAt,
  createThing,
  setThing,
  asUrl,
  ThingLocal,
} from "@inrupt/solid-client";
import { Schema, Definition } from "./schema";
import { FetchFunc, Maybe } from "./types";
import {
  fetcher,
  CreateOptions,
  resolveTypeLocation,
  resolveOrRegisterTypeLocation,
} from "./resolver";

/**
 * Configuration options for a Repository.
 */
export interface Options<TData> {
  /**
   * URL of the document where you want your data to be stored and retrieved.
   */
  source: string;

  /**
   * Optional fetch function to use to make authenticated request to user resources.
   * If you use the same in every repository, you may provide with the `configure({ fetch: ... })`
   * instead. This one will take precedence over the global one if defined.
   */
  fetch?: FetchFunc;

  /**
   * Type of data managed by a repository. You must provide an URI representing the
   * resource type (which is the rdf:type value).
   *
   * This property is optional if you already provide a `Schema` instance.
   */
  type?: string;

  /**
   * Schema used to map between linked data and Javascript so you don't have to
   * manually updated subjects, predicates and objects. You can provide an already
   * instantiated Schema or only the definition and the repository will take care of
   * the schema creation.
   */
  schema: Definition<TData> | Schema<TData>;
}

/**
 * Specific error when no type has been defined but is mandatory to instantiate a
 * proper `Schema` object.
 */
export class NoTypeDefined extends Error {
  constructor() {
    super(
      "when giving a schema definition, you must also provide the type of data you wish to persist"
    );
  }
}

/**
 * Provides access to a Solid POD and defines a schema (in term of Linked Data)
 * use to map back and forth so you don't have to do it manually.
 *
 * This is the primary (if not the only) component you may need when building an
 * app on top of a Solid pod. It makes it convenient and easy to read and write
 * data.
 *
 * With this tiny class, you can easily build your app without much knowledge of
 * how Linked Data and Solid works..
 */
export class Repository<TData> {
  private options!: Options<TData>;
  private schema!: Schema<TData>;

  constructor(options: Options<TData>) {
    this.use(options);
  }

  /**
   * Updates the repository inner options. It lets you override any options you have
   * defined previously. You'll probably just needs to update the source stuff through...
   */
  use(options: Partial<Options<TData>>): void {
    this.options = {
      ...this.options,
      ...options,
    };

    // (Re)build the schema instance if needed
    if (this.options.schema instanceof Schema) {
      this.schema = this.options.schema;
    } else {
      if (!this.options.type) {
        throw new NoTypeDefined();
      }
      this.schema = new Schema(this.options.type, this.options.schema);
    }
  }

  /**
   * Add or update given data. If a data does not have its key (defined by the schema
   * is.key()) defined, the repository will consider it's a new data it needs to
   * persist and it will update its key once saved.
   */
  async save(...data: TData[]): Promise<void> {
    const dataset = data.reduce((ds, record) => {
      const dataUrl = this.schema.getUrl(record);
      const thing = this.schema.write(
        (dataUrl && getThing(ds, dataUrl)) || createThing(), // Should we check the thing type retrieved with getThing here?
        record
      );
      this.schema.setUrl(
        record,
        asUrl(<ThingLocal>thing, ds.internal_resourceInfo.sourceIri)
      );
      return setThing(ds, thing);
    }, await this.getDataset());
    await this.saveDataset(dataset);
  }

  /**
   * Remove one or many data from this repository. You can provide data primary key or
   * the whole object.
   */
  async remove(...data: (Readonly<TData> | string)[]): Promise<void> {
    const dataset = data.reduce(
      (ds, record) => removeThing(ds, this.schema.getUrl(record)),
      await this.getDataset()
    );
    await this.saveDataset(dataset);
  }

  /**
   * Retrieve a single element from this repository. You can either provide the
   * unique identifier of a resource or a filter function to apply.
   */
  async only(key: string): Promise<Maybe<TData>>;
  async only(filter: (data: Readonly<TData>) => boolean): Promise<Maybe<TData>>;
  async only(
    filter: string | ((data: Readonly<TData>) => boolean)
  ): Promise<Maybe<TData>> {
    let found: TData[];

    // I could not inline that call because of tsc... ¯\_(ツ)_/¯
    if (typeof filter === "string") {
      found = await this.find([filter]);
    } else {
      found = await this.find(filter);
    }

    return found.length > 0 ? found[0] : null;
  }

  /**
   * Find all data in the repository. If you only need one data, you can use the `only`
   * method instead.
   */
  async find(): Promise<TData[]>;
  async find(filter: (data: Readonly<TData>) => boolean): Promise<TData[]>;
  async find(keys: string[]): Promise<TData[]>;
  async find(
    filter?: string[] | ((data: Readonly<TData>) => boolean)
  ): Promise<TData[]> {
    const dataset = await this.getDataset();

    // For now, if a thing matching a key is not of the same type as the repository,
    // it will be discarded.
    if (Array.isArray(filter)) {
      return filter.reduce((result, key) => {
        const thing = getThing(dataset, this.schema.getUrl(key));
        if (thing && this.schema.ofType(thing)) {
          result.push(this.schema.read(thing));
        }
        return result;
      }, [] as TData[]);
    }

    const results = getThingAll(dataset)
      .filter(this.schema.ofType.bind(this.schema))
      .map(this.schema.read.bind(this.schema));

    return filter ? results.filter(filter) : results;
  }

  /**
   * Shortcut to instantiate a repository by resolving the location of a dataset
   * using Solid types index or registering it if needed using the two helper
   * methods: `resolveTypeLocation` and `resolveOrRegisterTypeLocation` depending
   * on the given parameters.
   */
  static async resolve<TData>(
    options: Omit<Options<TData>, "source">,
    resolveOptions?: Partial<CreateOptions> & {
      webid?: string;
      fetch?: FetchFunc;
    }
  ): Promise<Repository<TData>> {
    const repo = new Repository({
      ...options,
      source: "", // Will be resolved later...
    });

    repo.options.source = resolveOptions?.path
      ? await resolveOrRegisterTypeLocation(
          repo.schema.type,
          {
            path: resolveOptions.path,
            index: resolveOptions.index ?? "public",
          },
          resolveOptions.webid,
          resolveOptions.fetch
        )
      : await resolveTypeLocation(
          repo.schema.type,
          resolveOptions?.webid,
          resolveOptions?.fetch
        );

    return repo;
  }

  /**
   * Get the solid dataset using the source option.
   *
   * Note that for this first version, it does not support resources in multiple
   * documents (wiht containers) but it's already planned :)
   */
  private async getDataset(): Promise<SolidDataset & WithResourceInfo> {
    return await getSolidDataset(
      this.options.source,
      fetcher(this.options.fetch)
    );
  }

  /**
   * Save a dataset and make sure it uses the fetch options of this repository.
   */
  private async saveDataset(
    dataset: SolidDataset & WithResourceInfo
  ): Promise<void> {
    await saveSolidDatasetAt(
      dataset.internal_resourceInfo.sourceIri,
      dataset,
      fetcher(this.options.fetch)
    );
  }
}
