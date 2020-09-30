# @solideal/storage [![npm version](https://badgen.net/npm/v/@solideal/storage)](https://www.npmjs.com/package/@solideal/storage) [![package size](https://badgen.net/bundlephobia/minzip/@solideal/storage)](https://bundlephobia.com/result?p=@solideal/storage) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=solideal_storage&metric=coverage)](https://sonarcloud.io/dashboard?id=solideal_storage)

Making access to Solid Pod's data a breeze! (or at least, trying to 😁)

## Motivation

There's already a lot of librairies out there to read and write Linked Data quads but for developers coming from a relatively mainstream background, getting up & running and develop for Solid is really a huge pain.

This tiny library abstracts the [inrupt/solid-client-js](https://github.com/inrupt/solid-client-js) and provides a simpler alternative to create, update, delete and find stuff on a Pod by taking care of the boring and repetitive stuff.

## Installation

```console
$ npm install @solideal/storage
```

## Usage

Let's say you are a new developer trying to get its head around that Linked Data stuff. You now understand that in order to persist stuff to a Pod, you need to define **what** you are persisting and **which** vocabulary to use for each of your properties.

Now, a simple example. You want to persist user generated bookmarks to its pod and you already have a javascript structure to hold that data.

```ts
const aBookmark = {
  id: "some-unique-identifier",
  title: "My super duber local bookmark",
  url: "http://localhost:3000",
};
```

By navigating on Internet, you found that the vocabulary https://www.w3.org/2002/01/bookmark#Bookmark makes sense and that you can describe the title with http://purl.org/dc/elements/1.1/title and the url with https://www.w3.org/2002/01/bookmark#recalls.

Everything looks good, let's try to save our `aBookmark` to a Pod with `@solideal/storage`.

```ts
import { Repository, is } from "@solideal/storage";

const repository = new Repository<typeof aBookmark>({
  source: "https://yuukanoo.solid.community/public/bookmarks.ttl", // where to store and read data
  type: "https://www.w3.org/2002/01/bookmark#Bookmark",
  schema: {
    id: is.key(), // This one is mandatory and will contains the resource location
    title: is.string("http://purl.org/dc/elements/1.1/title"),
    url: is.url("https://www.w3.org/2002/01/bookmark#recalls"),
  },
});

await repository.save(aBookmark); // Easy right?

// Let's find every bookmarks
const bookmarks = await repository.find();

/**
 * Will returns every bookmarks in https://yuukanoo.solid.community/public/bookmarks.ttl
 * [
 *    {
 *      id: "https://yuukanoo.solid.community/public/bookmarks.ttl#anid",
 *      title: "My super duber local bookmark",
 *      url: "http://localhost:3000",
 *    },
 *    {
 *      id: "https://yuukanoo.solid.community/public/bookmarks.ttl#anotherone",
 *      title: "Another bookmark",
 *      url: "http://localhost:5000",
 *    },
 * ]
 */

// And delete the previously added one
await repository.remove(aBookmark);
```

## Determining the source of a repository

⚠ For now, the Repository only works with **Resources**, not **Containers**, but this is already planned 😎

Commonly you don't know where a kind of data exactly is stored on a user pod. Lucky for us, Solid has types index which makes it easy to resolve a location. For this usage, `@solideal/storage` provides helper functions which returns the first available location of a specific type.

```ts
import {
  Repository,
  is,
  configure,
  resolveTypeLocation,
  resolveOrCreateTypeLocation,
} from "@solideal/storage";

// Let's configure the global webid to use as a default if not provided
// everywhere else, you can also pass the `fetch` used by every network calls here.
configure({ webid: "https://yuukanoo.solid.community/profile/card#me" });

// Let's resolve the type location from a user webid by looking at public/private
// type indexes.
const source = await resolveTypeLocation(
  "https://www.w3.org/2002/01/bookmark#Bookmark"
);

// Sometimes you also want to create the resource and register the type if
// it does not exists yet. For this purpose, you can use the function below
const createIfNotFoundSource = await resolveOrCreateTypeLocation(
  "https://www.w3.org/2002/01/bookmark#Bookmark",
  {
    path: "/public/my-bookmarks.ttl",
    index: "public", // or private, but you need write access to the index
  }
);

const repository = new Repository<typeof aBookmark>({
  source,
  type: "https://www.w3.org/2002/01/bookmark#Bookmark",
  schema: {
    id: is.key(),
    title: is.string("http://purl.org/dc/elements/1.1/title"),
    url: is.url("https://www.w3.org/2002/01/bookmark#recalls"),
  },
});

// To make things easier, you can also use the following shortcut
const repo = await Repository.resolve<typeof aBookmark>({
  type: "https://www.w3.org/2002/01/bookmark#Bookmark",
  schema: {
    id: is.key(),
    title: is.string("http://purl.org/dc/elements/1.1/title"),
    url: is.url("https://www.w3.org/2002/01/bookmark#recalls"),
  },
});
```
