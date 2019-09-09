const _ = require('lodash');
const fs = require('fs-extra');
const  md5 = require('md5');

const getFileTime = async (path) => (await fs.stat(path)).mtime;

// ToDo incomplete
class SimpleCache {
    constructor(dir, tags = {}, defaultTtlMinutes = -1) {
        this.dir = dir;
        this.tags = tags;
        this.defaultTtlMinutes = defaultTtlMinutes;
        this.memCache = {};
    }

    getTtlForTag(name) {
        let ttl = _.get(this.tags, name, this.defaultTtlMinutes);
        return ttl === -1 ? -1 : ttl *  60000;
    }

    isExpired(timeSet, tagName) {
        let tagTtlMs = this.getTtlForTag(tagName);

        if(tagTtlMs === -1) { return false; }

        let expireTime = Date.now()-tagTtlMs;
        return timeSet < expireTime;
    }

    getCachedFileName(key, tag) {
        const filename = md5(key);
        return `${this.dir}/${tag}___${filename}.json`;
    }

    async set(key, tag, data) {
        let cachePath = this.getCachedFileName(key, tag);
        return await fs.writeJson(cachePath, data);
    }

    async get(key, tag, defaultData = null) {
        let memKey = `${tag}.${key}`;
        let memData = _.get(this.memCache, memKey);
        if(memData) {
            if(this.isExpired(memData.lastChanged, tag)) {
                _.unset(memData, memKey);
                return defaultData;
            }

            return _.cloneDeep(memData.data);
        }

        let fileData = await this.fileGet(key, tag, defaultData);
        if(!fileData) { return defaultData; }

        _.set(this.memCache, memKey, fileData);
        return fileData.data;
    }

    async getOrSet(key, tag, foo) {
        let cached = await this.get(key, tag);

        if(cached) { return cached; }
        let data = await foo();

        await this.set(key, tag, data);

        return data;
    }

    async fileGet(key, tag) {
        let cachePath = this.getCachedFileName(key, tag);

        if(!await fs.pathExists(cachePath)) {
            return null;
        }

        let lastChanged = await getFileTime(cachePath);
        if(this.isExpired(lastChanged, tag)) {
            await fs.remove(cachePath);
            return null;
        }

        let data  = await fs.readJson(cachePath);
        return {data,lastChanged};
    }

    async flushAll() {
        //ToDO
    }

    async flushTag() {
        //ToDO
    }

    async clean() {
        //ToDo
    }
}

module.exports = SimpleCache;