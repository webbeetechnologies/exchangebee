import * as _ from 'lodash';
import * as fs from 'fs-extra';
var md5 = require('md5');

const getFileTime = async (path: string): Promise<Date> => (await fs.stat(path)).mtime;

interface MemCacheItem<T> {
    data: T;
    lastChanged: Date;
}

// ToDo incomplete
class SimpleCache {
    private readonly dir: string;
    private readonly tags: { [key: string]: number };
    private readonly defaultTtlMinutes: number;
    private memCache: { [key: string]: MemCacheItem<any> };

    constructor(dir: string, tags: { [key: string]: number } = {}, defaultTtlMinutes: number = -1) {
        this.dir = dir;
        this.tags = tags;
        this.defaultTtlMinutes = defaultTtlMinutes;
        this.memCache = {};
    }

    getTtlForTag(name: string): number {
        let ttl = _.get(this.tags, name, this.defaultTtlMinutes);
        return ttl === -1 ? -1 : ttl * 60000;
    }

    isExpired(timeSet: Date, tagName: string): boolean {
        let tagTtlMs = this.getTtlForTag(tagName);

        if (tagTtlMs === -1) {
            return false;
        }

        let expireTime = Date.now() - tagTtlMs;
        return timeSet.getTime() < expireTime;
    }

    getCachedFileName(key: string, tag: string): string {
        const filename = md5(key);
        return `${this.dir}/${tag}___${filename}.json`;
    }

    async set<T>(key: string, tag: string, data: T): Promise<void> {
        let cachePath = this.getCachedFileName(key, tag);
        return await fs.writeJson(cachePath, data);
    }

    async get<T>(key: string, tag: string, defaultData: T | null = null): Promise<T | null> {
        let memKey = `${tag}.${key}`;
        let memData: MemCacheItem<T> = _.get(this.memCache, memKey);
        if (memData) {
            if (this.isExpired(memData.lastChanged, tag)) {
                _.unset(this.memCache, memKey);
                return defaultData;
            }

            return _.cloneDeep(memData.data);
        }

        let fileData = await this.fileGet<T>(key, tag);
        if (!fileData) {
            return defaultData;
        }

        _.set(this.memCache, memKey, fileData);
        return fileData.data;
    }

    async getOrSet<T>(key: string, tag: string, foo: () => Promise<T>): Promise<T> {
        const cached = await this.get<T>(key, tag);

        if (cached) {
            return cached;
        }
        const data = await foo();

        await this.set(key, tag, data);

        return data;
    }

    async fileGet<T>(key: string, tag: string): Promise<MemCacheItem<T> | null> {
        let cachePath = this.getCachedFileName(key, tag);

        if (!await fs.pathExists(cachePath)) {
            return null;
        }

        let lastChanged = await getFileTime(cachePath);
        if (this.isExpired(lastChanged, tag)) {
            await fs.remove(cachePath);
            return null;
        }

        let data: T = await fs.readJson(cachePath);
        return {data, lastChanged};
    }

    async flushAll(): Promise<void> {
        //ToDO
    }

    async flushTag(): Promise<void> {
        //ToDO
    }

    async clean(): Promise<void> {
        //ToDo
    }
}

export default SimpleCache;
