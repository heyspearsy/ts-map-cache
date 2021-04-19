export interface FetchParams {
  key: string
  params?: any
  callback(): any
  expiresInSeconds?: number
}

export interface KeyParams {
  key: string
  params?: any
}

export interface StoredData<T> {
  key: string
  data: T
  expiresInSeconds: number
}

export interface IStorageCache {
  fetch<T>(params: FetchParams): Promise<T> | T
}

// By default data will expire in 5 minutes.
const DEFAULT_EXPIRATION_SECONDS = 5 * 60

class MapCache implements IStorageCache {
  constructor(private cache = new Map()) {}

  // The fetch method, before calling callback, will check if there is cached data.
  // If cached data is not available, it will call callback, store the data in memory
  // and return it. If cached data is available, it won't call callback and it will
  // just return the cached values.
  async fetch<T>({
    key,
    params = null,
    callback,
    expiresInSeconds = DEFAULT_EXPIRATION_SECONDS
  }: FetchParams): Promise<T> {
    const cacheKey = this.generateKey({ key, params })
    const data = this.get<T>(cacheKey)

    return data ? data : this.set<T>({ key: cacheKey, data: await callback(), expiresInSeconds })
  }

  clear(): void {
    this.cache = new Map()
  }

  size(): number {
    return this.cache.size
  }

  // This method returns a base64 string containing a combination of a key and parameters
  // creating a unique identifier for a specific key and specific parameters. This is
  // useful in case the callback returns different values based on parameters.
  private generateKey({ key, params }: KeyParams): string {
    const keyValues = params ? { key, params } : { key }
    const stringifiedKey = JSON.stringify(keyValues)

    // This check allows to generate base64 strings depending on the current environment.
    // If the window object exists, we can assume this code is running in a browser.
    if (typeof process === 'undefined') {
      return btoa(stringifiedKey)
    } else {
      const bufferObj = Buffer.from(stringifiedKey, 'utf8')
      const base64String = bufferObj.toString('base64')

      return base64String
    }
  }

  // Store the data in memory and attach to the object expiresInSeconds containing the
  // expiration time.
  private set<T>({ key, data, expiresInSeconds }: StoredData<T>): T {
    this.cache.set(key, { data, expiresInSeconds })

    return data
  }

  // Will get specific data from the Map object based on a key and return null if
  // the data has expired.
  private get<T>(key: string): T | null {
    if (this.cache.has(key)) {
      const { data, expiresInSeconds } = this.cache.get(key) as StoredData<T>

      return this.hasExpired(expiresInSeconds) ? null : data
    }

    return null
  }

  private getExpirationInMs(expiresInSeconds: number): number {
    return new Date().getTime() + expiresInSeconds * 1000
  }

  private hasExpired(expiresInSeconds: number): boolean {
    return this.getExpirationInMs(expiresInSeconds) < new Date().getTime()
  }
}

export default new MapCache()
