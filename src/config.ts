import { FetchFunc } from "./types";

/**
 * Global config objects. Global objects are usually a bad thing but let's face it,
 * in a common Solid client application, you will authenticate the user and update
 * this global configuration to make sure every repository use the webid and the
 * fetch method.
 *
 * No matter what, you can always override them in repositories if you need to.
 */
interface Config {
  /**
   * Global webid to use for resolving.
   */
  webid?: string;

  /**
   * Global fetch methods to use to make authenticated requests.
   */
  fetch?: FetchFunc;
}

// Internal global config object, protected from the outside.
let config: Config = {};

/**
 * Configure solideal global options provided as default to repositories and resolvers.
 * It makes it convenient to update the fetch function to use and the webid without
 * updating every repositories.
 */
export function configure(options: Partial<Config>): void {
  config = {
    ...config,
    ...options,
  };
}

/**
 * Retrieve a setting value from the global configuration.
 */
export function setting<TKey extends keyof Config>(name: TKey): Config[TKey] {
  return config[name];
}
