const _ = require('lodash'),
    fs = require('fs');

const defaultConfig = {
    cacheDir: './cache',
    port: 18003,
};

const processConfig = (config) => {
    return {
        ...config,
    };
};

module.exports = () => {
    let [n, f, configFileName] = process.argv;

    configFileName = (_.isString(configFileName) && configFileName.length > 0) ? configFileName : './config.json';

    if (!fs.existsSync(configFileName)) {
        return processConfig(defaultConfig);
    }

    let config = JSON.parse(fs.readFileSync(configFileName, 'utf8'));
    config = {...defaultConfig, ...config};


    config = {...defaultConfig, ...config};

    return processConfig(config);
};