const express = require("express"),
    parseConfig  = require('./parseConfig'),
    RuBankCurrencyExchanger = require('./RuBankCurrencyExchanger'),
    SimpleCache  = require('./SimpleCache'),
   { parseISO } = require('date-fns');

const app = express(),
    config = parseConfig();

const cache = new SimpleCache(config.cacheDir);

app.get("/rates/:base/:date?", async (req, res, next) => {
   try {
      const exchanger = new RuBankCurrencyExchanger(cache);

      let date =  req.params.date ? parseISO(req.params.date) : null;
      let rates = await exchanger.getExchangeRateForCurrency(req.params.base, date);

      let responseData = {
         source: RuBankCurrencyExchanger._getUrlForDate(date),
         rates
      };

      res.json(responseData);
   } catch(err) {
       res.status(500).json({ name: 'unknown', message: err.message });
   }
});

app.listen(config.port);
