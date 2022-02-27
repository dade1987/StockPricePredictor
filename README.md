# StockPricePrediction
To predict stock prices. Features based on last values in a timestep, and technical indicators.

Currently running on https://price-predictor-eu.herokuapp.com/

API https://price-predictor-eu.herokuapp.com/predict/:timeInterval/:currencyPairOne

timeInterval: DAILY, INTRADAY_60_MIN
currencyPairOne: BTC, ETH

Answer Example:
[{
  "take_profit":"39193",            // take profit price (USD)
  "transaction_type":"NOTHING",     // what to do (NOTHING, BUY, SELL)
  "actual_price":39193.05,          // actual price (USD)
  "take_profit_percent":0,          // take profit percent
  "news_status":"16.00",            // news sentimental analysis (percent)
  "price_rise_probability":"20.00", // price rise probability (percent)
  "price_drop_probability":"40.00", // price drop probablity (percent)
  "order_book_status":"POSITIVE"    // order book status (POSITIVE, NEGATIVE)
  }]

 




On Windows 11, in case of this error after executing server node.js:
C:\laragon\www\StockPricePredictor
C:\laragon\www\StockPricePredictor
node:internal/modules/cjs/loader:1183
  return process.dlopen(module, path.toNamespacedPath(filename));
                 ^

Error: The specified module could not be found.
\\?\C:\laragon\www\StockPricePredictor\node_modules\@tensorflow\tfjs-node\lib\napi-v7\tfjs_binding.node
    at Object.Module._extensions..node (node:internal/modules/cjs/loader:1183:18)
    at Module.load (node:internal/modules/cjs/loader:981:32)
    at Function.Module._load (node:internal/modules/cjs/loader:822:12)
    at Module.require (node:internal/modules/cjs/loader:1005:19)
    at require (node:internal/modules/cjs/helpers:102:18)
    at Object.<anonymous> (C:\laragon\www\StockPricePredictor\node_modules\@tensorflow\tfjs-node\dist\index.js:58:16)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1153:10)
    at Module.load (node:internal/modules/cjs/loader:981:32)
    at Function.Module._load (node:internal/modules/cjs/loader:822:12) {
  code: 'ERR_DLOPEN_FAILED'
}


try to move tensorflow.dll
from .\StockPricePredictor\node_modules\@tensorflow\tfjs-node\deps\lib
to .\StockPricePredictor\node_modules\@tensorflow\tfjs-node\lib\napi-v7