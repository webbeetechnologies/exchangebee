const axios  = require('axios');
const cheerio = require('cheerio');
const { format } = require('date-fns');

class RuBankCurrencyExchanger {
    constructor(cache) {
        this.cache = cache;
    }

    static _getUrlForDate(date) {
        date = date ? date : new Date();
        //06.06.2019
        let strDate = format(date, "dd.MM.yyyy");

        return RuBankCurrencyExchanger.SOURCE+'?date_req='+strDate;
    }

    async getOfficialExchangeRates(date = null) {
        let url = RuBankCurrencyExchanger._getUrlForDate(date);

        let exchangeRates = await this.cache.get(url, 'exchangeRates');
        if(exchangeRates) { return exchangeRates; }
        exchangeRates = await this._getOfficialExchangeRates(url);
        await this.cache.set(url, 'exchangeRates', exchangeRates);
        return exchangeRates;
    }

    async _getOfficialExchangeRates(url) {
        try {
            let html = (await axios.get(url)).data;
            const $ = cheerio.load(html);

            const tableColumns = ['numCode', 'code', 'unit', 'currencyName', 'rate'];
            const exchangeRates = {};

            $('table.data tbody tr').each(function() {
                let row = {},
                    columnI = 0;

                $(this).find('td').each(function() {
                    let textValue = $(this).text();
                    let columnKey = tableColumns[columnI];

                    switch(columnKey) {
                        case 'unit':
                        case 'numCode':
                            row[columnKey] = parseInt(textValue);
                            break;
                        case 'rate':
                            row[columnKey] = parseFloat(textValue);
                            break;
                        default:
                            row[columnKey] = textValue;
                            break;
                    }
                    columnI++;
                });

                if(row.code) {
                    row.rate = row.rate / row.unit;
                    delete row.unit;

                    exchangeRates[row.code] = row;
                }

            });

            return exchangeRates;
        } catch(err) {
            throw err;
        }
    }

    async getExchangeRateForCurrency(baseCurrency, date = null) {
        let rates = await this.getOfficialExchangeRates(date);

        for(let currencyCode in rates) {
            if(!rates.hasOwnProperty(currencyCode)) { continue; }
            rates[currencyCode]['rate'] = await this.getExchangeRate(baseCurrency,currencyCode, date)
        }

        return rates;
    }

    async getExchangeRate(from, to, date = null) {
        from = from.toUpperCase();
        to = to.toUpperCase();

        let officialExchangeRates = await this.getOfficialExchangeRates(date);

        let intermediateRate = 1;
        if(from !== RuBankCurrencyExchanger.OWN_CURRENCY) {
            intermediateRate = officialExchangeRates[from].rate
        }

        let finalRate  = 1;
        if(to !== RuBankCurrencyExchanger.OWN_CURRENCY) {
            finalRate = officialExchangeRates[to].rate
        }

        return intermediateRate / finalRate;
    }

    async convert(amount, from, to, date = null) {
        let exchangeRate = await this.getExchangeRate(from, to, date);
        return amount * exchangeRate;
    }
}

RuBankCurrencyExchanger.OWN_CURRENCY = 'RUB';
RuBankCurrencyExchanger.SOURCE  = 'https://www.cbr.ru/eng/currency_base/daily/';


module.exports = RuBankCurrencyExchanger;