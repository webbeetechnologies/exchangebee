const express = require("express"),
    parseConfig  = require('./parseConfig'),
    RuBankCurrencyExchanger = require('./RuBankCurrencyExchanger'),
    SimpleCache  = require('./SimpleCache');

const app = express(),
    config = parseConfig();

const cache = new SimpleCache(config.cacheDir);

app.get("/rates/:base/:date?", async (req, res, next) => {
   const exchanger = new RuBankCurrencyExchanger(cache);

   let rates = await exchanger.getExchangeRateForCurrency(req.params.base, req.params.date);

   let responseData = {
      source: RuBankCurrencyExchanger.SOURCE,
      rates
   };

   res.json(responseData);
});

app.listen(config.port);
