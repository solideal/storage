import {
  SolidDataset,
  getSolidDataset,
  getThingAll,
  Thing,
  asUrl,
  ThingPersisted,
  getThing,
  createThing,
  saveSolidDatasetAt,
  setThing,
  removeThing,
} from "@inrupt/solid-client";
import { Schema, is } from "./schema";

export interface Options<TData> {
  /**
   * Source IRI of the document containing data. If not provided, it will try to find
   * one by looking at the public and private type index of the user represented
   * by the webid.
   *
   * If no document exists for this resource type, it will raise an Error.
   */
  source?: string;

  /**
   * WebID of a user. This is used when you don't know where a document containing
   * the kind of data you want to persist and want to rely on the Solid type index.
   *
   * If the webid is not provided, it will try to determine it using the solid-auth
   * library.
   */
  webid?: string;

  /**
   * Type of data managed by a repository. You must provide an URI representing the
   * resource type (this is the rdf:type value).
   */
  type: string;

  /**
   * Schema used to map between linked data and Javascript so you don't have to
   * manually updated subjects, predicates and objects.
   */
  schema: Schema<TData>;
}

/**
 * Include the $uri property representing the primary key of a resource.
 */
export interface WithURI {
  $uri: string;
}

const a = is.url("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");

/**
 * Provides access to a Solid POD and defines a schema (in term of Linked Data)
 * use to map back and forth so you don't have to do it manually.
 *
 * With this tiny class, you can easily build your app without much knowledge of
 * how Linked Data and Solid works.
 */
export class Repository<TData> {
  constructor(private readonly options: Options<TData>) {}

  async save(data: TData): Promise<TData & WithURI> {
    const { dataset, source } = await this.fetchDataset();
    const uri: string = (<any>data).$uri;
    let thing = a.write(
      uri ? getThing(dataset, uri) : createThing(),
      this.options.type
    );

    for (const name in this.options.schema) {
      thing = this.options.schema[name].write(thing, data[name]);
    }

    const newDataset = setThing(dataset, thing);
    await saveSolidDatasetAt(source, newDataset);

    return { ...data, $uri: asUrl(<any>thing, source) };
  }

  async remove(data: TData & WithURI): Promise<void> {
    const { dataset, source } = await this.fetchDataset();
    const newDataset = removeThing(dataset, data.$uri);
    await saveSolidDatasetAt(source, newDataset);
  }

  async find(): Promise<(TData & WithURI)[]> {
    const { dataset } = await this.fetchDataset();

    return getThingAll(dataset)
      .filter((thing) => a.read(thing) === this.options.type)
      .map(this.convert.bind(this));
  }

  /**
   * Try to fetch a dataset to store actual data.
   *
   * It returns a composite object with the dataset and the source URI because the
   * source is needed to store the dataset back.
   */
  private async fetchDataset(): Promise<{
    dataset: SolidDataset;
    source: string;
  }> {
    // TODO: use a cached one if available?

    if (this.options.source) {
      return {
        dataset: await getSolidDataset(this.options.source),
        source: this.options.source,
      };
    }

    throw new Error("not found");
  }

  private convert(thing: Thing): TData & WithURI {
    const data: any = { $uri: asUrl(<ThingPersisted>thing) };

    for (const name in this.options.schema) {
      data[name] = this.options.schema[name].read(thing);
    }

    return <TData & WithURI>data;
  }
}
