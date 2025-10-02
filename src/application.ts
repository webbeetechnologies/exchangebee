import express, { Request, Response, NextFunction } from "express";
import loadConfig from './parseConfig';
import RuBankCurrencyExchanger from './RuBankCurrencyExchanger';
import SimpleCache from './SimpleCache';
import { parseISO, isValid } from 'date-fns';

const app = express();
const config = loadConfig();

const cache = new SimpleCache(config.cacheDir);

app.get("/rates/:base/:date?", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const exchanger = new RuBankCurrencyExchanger(cache);

        let date: Date | null = null;
        if (req.params.date) {
            const parsedDate = parseISO(req.params.date);
            if (isValid(parsedDate)) {
                date = parsedDate;
            } else {
                return res.status(400).json({ name: 'invalid_date', message: 'The date provided is not a valid ISO 8601 date.' });
            }
        }

        const rates = await exchanger.getExchangeRateForCurrency(req.params.base, date);

        const responseData = {
            source: RuBankCurrencyExchanger._getUrlForDate(date),
            rates
        };

        res.json(responseData);
    } catch (err: any) {
        res.status(500).json({ name: 'unknown', message: err.message });
    }
});

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});
