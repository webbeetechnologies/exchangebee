import axios from 'axios';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';
import SimpleCache from './SimpleCache';

interface ExchangeRate {
    numCode: number;
    code: string;
    currencyName: string;
    rate: number;
}

interface ExchangeRates {
    [currencyCode: string]: ExchangeRate;
}

class RuBankCurrencyExchanger {
    public static readonly OWN_CURRENCY = 'RUB';
    public static readonly SOURCE = 'https://www.cbr.ru/eng/currency_base/daily/';

    constructor(private cache: SimpleCache) {}

    static _getUrlForDate(date?: Date | null): string {
        date = date ? date : new Date();
        //06.06.2019
        let strDate = format(date, "dd.MM.yyyy");

        return RuBankCurrencyExchanger.SOURCE + '?UniDbQuery.Posted=True&UniDbQuery.To=' + strDate;
    }

    async getOfficialExchangeRates(date: Date | null = null): Promise<ExchangeRates> {
        const url = RuBankCurrencyExchanger._getUrlForDate(date);

        return this.cache.getOrSet<ExchangeRates>(url, 'exchangeRates', async () => {
            return this._getOfficialExchangeRates(url);
        });
    }

    private async _getOfficialExchangeRates(url: string): Promise<ExchangeRates> {
        try {
            const { data: html } = await axios.get<string>(url);
            const $ = cheerio.load(html);

            const tableColumns = ['numCode', 'code', 'unit', 'currencyName', 'rate'];
            const exchangeRates: ExchangeRates = {};

            $('table.data tbody tr').each(function () {
                let row: { [key: string]: any } = {},
                    columnI = 0;

                // @ts-ignore
                $(this).find('td').each(function () {
                    // @ts-ignore
                    let textValue = $(this).text();
                    let columnKey = tableColumns[columnI];

                    switch (columnKey) {
                        case 'unit':
                        case 'numCode':
                            row[columnKey] = parseInt(textValue);
                            break;
                        case 'rate':
                            row[columnKey] = parseFloat(textValue.replace(',', '.')); // Handle comma decimal separator
                            break;
                        default:
                            row[columnKey] = textValue;
                            break;
                    }
                    columnI++;
                });

                if (row.code) {
                    const rate = row.rate / row.unit;
                    
                    exchangeRates[row.code] = {
                        numCode: row.numCode,
                        code: row.code,
                        currencyName: row.currencyName,
                        rate: rate
                    };
                }
            });

            return exchangeRates;
        } catch (err) {
            throw err;
        }
    }

    async getExchangeRateForCurrency(baseCurrency: string, date: Date | null = null): Promise<ExchangeRates> {
        const rates = await this.getOfficialExchangeRates(date);
        const newRates: ExchangeRates = {};

        for (const currencyCode in rates) {
            if (Object.prototype.hasOwnProperty.call(rates, currencyCode)) {
                newRates[currencyCode] = { ...rates[currencyCode] };
                newRates[currencyCode]['rate'] = await this.getExchangeRate(currencyCode, baseCurrency, date);
            }
        }

        return newRates;
    }

    async getExchangeRate(from: string, to: string, date: Date | null = null): Promise<number> {
        from = from.toUpperCase();
        to = to.toUpperCase();

        if (from === to) {
            return 1;
        }

        const officialExchangeRates = await this.getOfficialExchangeRates(date);

        let fromRate = 1;
        if (from !== RuBankCurrencyExchanger.OWN_CURRENCY) {
            if (!officialExchangeRates[from]) throw new Error(`Currency ${from} not found.`);
            fromRate = officialExchangeRates[from].rate;
        }

        let toRate = 1;
        if (to !== RuBankCurrencyExchanger.OWN_CURRENCY) {
            if (!officialExchangeRates[to]) throw new Error(`Currency ${to} not found.`);
            toRate = officialExchangeRates[to].rate;
        }

        return fromRate / toRate;
    }

    async convert(amount: number, from: string, to: string, date: Date | null = null): Promise<number> {
        let exchangeRate = await this.getExchangeRate(from, to, date);
        return amount * exchangeRate;
    }
}

export default RuBankCurrencyExchanger;
