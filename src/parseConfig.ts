import * as _ from 'lodash';
import * as fs from 'fs';

interface AppConfig {
    cacheDir: string;
    port: number;
    [key: string]: any;
}

const defaultConfig: AppConfig = {
    cacheDir: './cache',
    port: 18003,
};

const loadConfig = (): AppConfig => {
    const [, , configFileName] = process.argv;
    const finalConfigFileName = (_.isString(configFileName) && configFileName.length > 0) ? configFileName : './config.json';

    if (!fs.existsSync(finalConfigFileName)) {
        return defaultConfig;
    }

    const configFromFile = JSON.parse(fs.readFileSync(finalConfigFileName, 'utf8'));
    return { ...defaultConfig, ...configFromFile };
};

export default loadConfig;
