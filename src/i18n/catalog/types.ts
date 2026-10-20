/**
 * The shape another language's catalog must have: the Spanish one's keys,
 * all of them, with string values. A missing or extra key is a type error.
 */
export type Catalog<T> = { [K in keyof T]: T[K] extends string ? string : Catalog<T[K]> };
