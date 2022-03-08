const dotenv = require('dotenv');


console.log(process.cwd());

console.log(__dirname);




global.http = require('http');
global.https = require('https');

global.express = require('express');

global.socketio = require('socket.io');
global.tf = require('@tensorflow/tfjs-node');

global.SMA = require('technicalindicators').SMA;
global.MACD = require('technicalindicators').MACD;
global.RSI = require('technicalindicators').RSI;
global.Stochastic = require('technicalindicators').Stochastic;

global.router = express.Router();
global.app = express();

//modulo intercambiabile (tipo dependancy injector linearRegressor,multiClassClassifier)
global.trainer = require('./neural/linearRegressor');
global.pick_incidence = require('./indicators/pick_incidence');
global.normalizer = require('./services/normalizer');
//linearRegressorPrepareData,multiClassClassifierPrepareData
global.prepare_data = require('./services/linearRegressorPrepareData');
global.simulators = require('./simulators/simulator');
global.ai_model_loader = require('./services/ai_model_loader');
global.buy_sell_condition = require('./indicators/buy_sell_condition');



/*
Documentazione Binance API
https://github.com/jaggedsoft/node-binance-api#binance-api-spot-trading
*/

global.original_data;
global.sma_period = 21;
global.rsi_period = 14;
global.stochastic_period = 14;
global.stochastic_signalPeriod = 3;
global.macd_fastPeriod = 12;
global.macd_slowPeriod = 26;
global.macd_signalPeriod = 9;

//global.player = require('play-sound')({player: "C:/Program Files (x86)/Windows Media Player/wmplayer.exe"})


/*
global.prices_min = 0;
global.prices_max = 0;
*/



const PORT = process.env.PORT || 3000;

const INDEX = '/index.html';

dotenv.config();

const server = express()
    .get('/', function(req, res) {
        res.sendFile(process.cwd() + "/index.html");
    })
    .get('/admin', function(req, res) {
        res.sendFile(process.cwd() + "/index_modificabile.html");
    }).get('/banner', function(req, res) {
        res.sendFile(process.cwd() + "/banner.jpg");
    })
    .get('/predict/:timeInterval/:currencyPairOne', function(req, res) {
        //currency_pair_1
        //BTC
        //ETH

        //time_interval
        //DAILY
        //INTRADAY_60_MIN

        //non serve await perchè le API sono asincrone
        //res.send(req.params.timeInterval);
        main('CRYPTO', req.params.timeInterval, req.params.currencyPairOne, 'USD', 14, 50, false, res);

    }).get('/users/:userId/books/:bookId', (req, res) => {
        res.send(req.params)
    })
    .listen(PORT, () => console.log(`Listening on ${PORT}`));


const io = socketio(server);


io.on('connection', (socket) => {
    socket.on('test_data', (value) => {
        console.log("connection");
    });

    socket.on('predict', async(arg) => {
        console.log('received predict request');

        let parameters = JSON.parse(arg);

        console.log(parameters);

        await main(parameters.market_name, parameters.time_interval, parameters.currency_pair_1, parameters.currency_pair_2, parseInt(parameters.time_steps), parseInt(parameters.epochs_number), parameters.training_enabled, socket);
    });
});

global.binance_api_status = false;


const Binance = require('node-binance-api-testnet');
let binance;

if (global.binance_api_status === true) {

    //console.log(process.env.BINANCE_FUTURES_TESTNET_KEY);

    binance = new Binance().options({
        APIKEY: process.env.BINANCE_FUTURES_TESTNET_KEY,
        APISECRET: process.env.BINANCE_FUTURES_TESTNET_SECRET
    });

}

process.argv.forEach(function(val, index, array) {
    console.log(val);

    if (val === "--train") {

        console.log("STARTING TRAINING");

        train_models();

    }

    if (val === "--autoOneMinute") {
        autoOneMinute();
    }
});


setInterval(() => io.emit('time', new Date().toTimeString()), 1000);




const yesterday = () => {
    let d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

async function autoOneMinute() {

    global.binance_api_status = true;

    binance = new Binance().options({
        APIKEY: process.env.BINANCE_FUTURES_TESTNET_KEY,
        APISECRET: process.env.BINANCE_FUTURES_TESTNET_SECRET
    });

    let next_minute_date = new Date();
    next_minute_date.setMinutes(next_minute_date.getMinutes() + 1)
    next_minute_date.setSeconds(1);
    //let next_minute = next_minute_date.getTime();

    let current_date = Date.now();
    let wait_fist_time = next_minute_date - current_date;

    timeout = setTimeout(function() {
        main('CRYPTO', 'INTRADAY_1_MIN', "BTC", "USD", 14, 50, true, null);
        interval = setInterval(function() {
            main('CRYPTO', 'INTRADAY_1_MIN', "BTC", "USD", 14, 50, true, null);
        }, 60000);
    }, wait_fist_time);

    console.log('autoOneMinuteBackend wait_fist_time', wait_fist_time);

}

async function getOrderBook(currency_pair_1) {

    //documentazione: https://cryptowat.ch/docs/api

    //Il raggruppamento o tick size indica in che misura raggruppare il book
    //Esempio:
    //100 significa che da 39100 a 39199 vanno in 39100 i conti
    //50 invece significa che da 39050 a 39059 vanno in 39050
    //4 da 39055 a 39059 vanno in 39050
    //quindi ad esempio potrebbe dire che 3500 persone vorrebbero vendere 84 bitcoin a 40300 USDT per bitcoin
    //mentre 6000 persone magari vorrebbero acquistare 50 bitcoin pagandolo 39000 dollari
    //quindi succede che il prezzo si muoverà tra questi valori (il valore medio è lo spread)
    //per accontentare i compratori e venditori
    //nei trades si vedono le quantità di soldi movimentata, e se è una vendita o un acquisto


    //MIGLIORE SPREAD (MIGLIOR BID E ASK)
    //https://api.cryptowat.ch/markets/binance/btcusdt/orderbook?limit=1

    //SOLO ORDINI NEL 5% PIU' ALTO DEL BOOK
    //https://api.cryptowat.ch/markets/binance/btcusdt/orderbook?span=0.5

    //Solo ordini sufficienti per aggiungere fino a 100 BTC su ciascun lato
    //https://api.cryptowat.ch/markets/binance/btcusdt/orderbook?depth=100

    //Liquidità dell'order book (da approfondire)
    //https://api.cryptowat.ch/markets/binance/btcusdt/orderbook/liquidity

    //Trades (operazioni di mercato) più recenti
    //https://api.cryptowat.ch/markets/:exchange/:pair/trades
    //se è maggiore del trade precedente è verde, se è minore è rosso
    //quindi se è verde ha comprato, se è rosso ha venduto
    //da questo si possono analizzare anche se ci sono whales

    let url = "https://api.cryptowat.ch/markets/binance/" + currency_pair_1 + "usdt/orderbook";

    console.log(url);

    return new Promise((resolve, reject) => {

        let newsRequest = https.get(url.toLowerCase(), function(res) {
            let data = '',
                json_data;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                json_data = JSON.parse(data);

                // will output a Javascript object
                /*console.log("news data received");
                console.log(json_data);
    
                console.log(json_data.articles[0].title + ' ' + json_data.articles[0].description + ' ' + json_data.articles[0].content);*/

                //resolve(json_data.articles);

                //console.log(json_data.result.asks[0][0]);

                let total_asks_volume = 0;
                json_data.result.asks.forEach((v) => {
                    total_asks_volume += v[0] * v[1];
                });

                let total_bids_volume = 0;
                json_data.result.bids.forEach((v) => {
                    total_bids_volume += v[0] * v[1];
                });




                console.log("TOTAL ASKS VOLUME", total_asks_volume);

                console.log("TOTAL BIDS VOLUME", total_bids_volume)

                //l'ask migliore è il prezzo più basso al quale qualcuno vorrebbe vendere l'asset,
                //quindi è il prezzo che devi pagare se vuoi comprare l'asset in questo momento


                //il bid migliore è il prezzo più alto al quale qualcuno vorrebbe comprare l'asset
                //quindi è il prezzo che devi pagare se vuoi vendere l'asset in questo momento a mercato

                //in mezzo c'è lo spread

                //quindi siccome bids sono gli ordini in acquisto, se i volumi dei grossi traders sono negativi si propende per la vendita
                console.log("DIREZIONE DEL MERCATO?", total_asks_volume > total_bids_volume);

                //se il volume della domanda (bids)  è più alto  dell'offerta totale (asks) è true, il prezzo potrebbe salire,
                //ma solo se il mercato ovviamente è stabile. Non certo in caso di guerre o pandemie.
                resolve({ trend: total_bids_volume > total_asks_volume, status: json_data });

            });
        });

    });
}

function getResistenceAndSupport(orderBook) {

    //prima cosa bisogna vedere di quante cifre è il numero
    //prima senza decimali, poi con

    //poi va raggruppato l'order book in decimali, decine, centinaia, migliaia, ecc

    //poi da lì bisogna vedere i salti grossi che ci sono verso l'alto

    //come prima prova, dato che abbiamo solo eth e btc raggruppiamoli a centinaia

    let asks_hundred = new Object();
    orderBook.result.asks.forEach((v) => {
        if (asks_hundred[roundHundred(v[0])] === undefined) {
            asks_hundred[roundHundred(v[0])] = 0;
        }
        asks_hundred[roundHundred(v[0])] += parseFloat(v[1]);
    });

    let arrAsks = Object.values(asks_hundred).slice(0, 10);
    let arrAsksPrices = Object.keys(asks_hundred).slice(0, 10);
    console.log('asks', arrAsks);

    let maxAsk = Math.max(...arrAsks);
    let support = arrAsksPrices[arrAsks.indexOf(maxAsk)];
    console.log('Supporto asks', support, maxAsk);

    //nei bids va fatta dal più basso l'analisi
    let bids_hundred = new Object();

    orderBook.result.bids.forEach((v) => {
        if (bids_hundred[roundHundred(v[0])] === undefined) {
            bids_hundred[roundHundred(v[0])] = 0;
        }
        bids_hundred[roundHundred(v[0])] += parseFloat(v[1]);
    });

    let arrBids = Object.values(bids_hundred).reverse().slice(0, 10);
    let arrBidsPrices = Object.keys(bids_hundred).reverse().slice(0, 10);
    console.log('bids', arrBids);

    let maxBid = Math.max(...arrBids);
    let resistence = arrBidsPrices[arrBids.indexOf(maxBid)];
    console.log('Resistenza bids', resistence, maxBid);

    return { resistence: resistence, support: support }
}

function roundHundred(value) {
    return Math.round(value / 100) * 100;
}

async function getMarketPrice(currency_pair_1) {
    let url = "https://api.cryptowat.ch/markets/binance/" + currency_pair_1 + "usdt/price";

    return new Promise((resolve, reject) => {

        let request = https.get(url.toLowerCase(), function(res) {
            let data = '',
                json_data;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                json_data = JSON.parse(data);

                resolve(json_data);
            });
        });
    });
}

async function getTrades(currency_pair_1, time_interval) {
    //prima c'era l'analisi ultimi 1000 trades
    //ora proviamo a farla a seconda dell'intervallo da prevedere
    //in realtà va bene solo per lo scalping. al massimo va indietro di 1 ora
    //il timestamp dev'essere in secondi. Non in millisecondi
    let interval = Math.round(Date.now() / 1000);

    //proviamo ad analizzare 3 intervalli precedenti
    //secondo la teoria di Elliott il trend continua, ma ha bisogno di correzioni
    //ogni 5 fasi di trend con 3 fasi di correzione
    switch (time_interval) {
        case "INTRADAY_1_MIN":
            interval -= 5 * 60 /** 1000*/ ;
            break;
        case "INTRADAY_5_MIN":
            interval -= 5 * 5 * 60 /** 1000*/ ;
            break;
        case "INTRADAY_15_MIN":
            interval -= 5 * 15 * 60 /** 1000*/ ;
            break;
        case "INTRADAY_30_MIN":
            interval -= 5 * 30 * 60 /** 1000*/ ;
            break;
        case "INTRADAY_60_MIN":
            interval -= 5 * 60 * 60 /** 1000*/ ;
            break;
        case "DAILY":
            interval -= 5 * 24 * 60 /** 60 * 1000*/ ;
            break;
    }

    let url = "https://api.cryptowat.ch/markets/binance/" + currency_pair_1 + "usdt/trades?since=" + interval;

    //temporaneamente riprovo così col limit 1000. mi pareva andasse meglio
    //comunque 1000 è il massimo
    url = "https://api.cryptowat.ch/markets/binance/" + currency_pair_1 + "usdt/trades?limit=1000";

    console.log(url);

    return new Promise((resolve, reject) => {

        let request = https.get(url.toLowerCase(), function(res) {
            let data = '',
                json_data;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                json_data = JSON.parse(data);

                //console.log(json_data, typeof(json_data.result));

                let buy = false;

                let whales_buying_num = 0;
                let whales_selling_num = 0;
                let poveraccis_buying_num = 0;
                let poveraccis_selling_num = 0;

                let whales_buying_vol = 0;
                let whales_selling_vol = 0;
                let poveraccis_buying_vol = 0;
                let poveraccis_selling_vol = 0;
                //indice 2 prezzo di transazione in dollari
                //indice 3 numero di crypto transate

                json_data.result.forEach(function(v, i) {
                    if (json_data.result[i - 1] !== undefined) {
                        if (v[2] > json_data.result[i - 1][2]) {
                            buy = true;
                        } else if (v[2] < json_data.result[i - 1][2]) {
                            buy = false;
                        }

                        let transacted_amount = v[2] * v[3];

                        //per ora è 1 milione ma si potrà cambiare
                        if (transacted_amount > 1000000) {
                            if (buy === true) {
                                whales_buying_num++;
                                whales_buying_vol += transacted_amount;
                            } else {
                                whales_selling_num++;
                                whales_selling_vol += transacted_amount;
                            }
                        } else {
                            if (buy === true) {
                                poveraccis_buying_num++;
                                poveraccis_buying_vol += transacted_amount;
                            } else {
                                poveraccis_selling_num++;
                                poveraccis_selling_vol += transacted_amount;
                            }
                        }
                        //se è uguale mantiene lo status
                    }
                    json_data.result[i].push(buy);
                });

                /*console.log({
                    trades: json_data.result,
                    whales_buying_num: whales_buying_num,
                    whales_selling_num: whales_selling_num,
                    poveraccis_buying_num: poveraccis_buying_num,
                    poveraccis_selling_num: poveraccis_selling_num,

                    whales_buying_vol: whales_buying_vol,
                    whales_selling_vol: whales_selling_vol,
                    poveraccis_buying_vol: poveraccis_buying_vol,
                    poveraccis_selling_vol: poveraccis_selling_vol
                });*/

                //per ora se uno muove almeno 1 milione di dollari posso considerarlo "whale"

                resolve({
                    trades: json_data.result,
                    whales_buying_num: whales_buying_num,
                    whales_selling_num: whales_selling_num,
                    poveraccis_buying_num: poveraccis_buying_num,
                    poveraccis_selling_num: poveraccis_selling_num,

                    whales_buying_vol: whales_buying_vol,
                    whales_selling_vol: whales_selling_vol,
                    poveraccis_buying_vol: poveraccis_buying_vol,
                    poveraccis_selling_vol: poveraccis_selling_vol
                });

            });
        });

    });
}

async function getNewsData(currency_pair_1) {

    return new Promise((resolve, reject) => {

        let currency_full_name = "";
        switch (currency_pair_1) {

            case "ADA":
                currency_full_name = "ADA CARDANO";
                break;
            case "BTC":
                currency_full_name = "BITCOIN";
                break;
            case "DOGE":
                currency_full_name = "DOGECOIN";
                break;
            case "CRO":
                currency_full_name = "Crypto Coin CRO";
                break;
            case "SOL":
                currency_full_name = "SOLANA COIN";
                break;
            case "SHIB":
                currency_full_name = "SHIBAINU COIN";
                break;
            default:
                currency_full_name = currency_pair_1;
        }

        /*options
        apiKey
REQUIRED
Your API key. Alternatively you can provide this via the X-Api-Key HTTP header.

q
Keywords or phrases to search for in the article title and body.

Advanced search is supported here:

Surround phrases with quotes (") for exact match.
Prepend words or phrases that must appear with a + symbol. Eg: +bitcoin
Prepend words that must not appear with a - symbol. Eg: -bitcoin
Alternatively you can use the AND / OR / NOT keywords, and optionally group these with parenthesis. Eg: crypto AND (ethereum OR litecoin) NOT bitcoin.
The complete value for q must be URL-encoded. Max length: 500 chars.

qInTitle
Keywords or phrases to search for in the article title only.

Advanced search is supported here:

Surround phrases with quotes (") for exact match.
Prepend words or phrases that must appear with a + symbol. Eg: +bitcoin
Prepend words that must not appear with a - symbol. Eg: -bitcoin
Alternatively you can use the AND / OR / NOT keywords, and optionally group these with parenthesis. Eg: crypto AND (ethereum OR litecoin) NOT bitcoin.
The complete value for qInTitle must be URL-encoded. Max length: 500 chars.

sources
A comma-seperated string of identifiers (maximum 20) for the news sources or blogs you want headlines from. Use the /sources endpoint to locate these programmatically or look at the sources index.

domains
A comma-seperated string of domains (eg bbc.co.uk, techcrunch.com, engadget.com) to restrict the search to.

excludeDomains
A comma-seperated string of domains (eg bbc.co.uk, techcrunch.com, engadget.com) to remove from the results.

from
A date and optional time for the oldest article allowed. This should be in ISO 8601 format (e.g. 2021-11-17 or 2021-11-17T12:02:10)

Default: the oldest according to your plan.
to
A date and optional time for the newest article allowed. This should be in ISO 8601 format (e.g. 2021-11-17 or 2021-11-17T12:02:10)

Default: the newest according to your plan.
language
The 2-letter ISO-639-1 code of the language you want to get headlines for. Possible options: ardeenesfrheitnlnoptruseudzh.

Default: all languages returned.
sortBy
The order to sort the articles in. Possible options: relevancy, popularity, publishedAt.
relevancy = articles more closely related to q come first.
popularity = articles from popular sources and publishers come first.
publishedAt = newest articles come first.

Default: publishedAt
pageSize
int
The number of results to return per page.

Default: 100. Maximum: 100.
page
int
Use this to page through the results.

Default: 1.

*/

        let url_news = 'https://newsapi.org/v2/everything?q=' + currency_full_name + '&language=en&from=' + yesterday() + '&sortBy=publishedAt&pageSize=5&page=1&apiKey=' + process.env.NEWS_API_KEY;

        console.log(url_news);

        let newsRequest = https.get(url_news, function(res) {
            let data = '',
                json_data;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                json_data = JSON.parse(data);

                // will output a Javascript object
                /*console.log("news data received");
                console.log(json_data);

                console.log(json_data.articles[0].title + ' ' + json_data.articles[0].description + ' ' + json_data.articles[0].content);*/

                resolve(json_data.articles);
            });
        });

        /*newsRequest.setTimeout(10000, function() {
            request.abort();
            resolve(false);
        });*/
    });

}


async function getSentimentAnalysisFearGreed() {

    let url = "https://api.alternative.me/fng/";

    return new Promise((resolve, reject) => {
        https.get(url, function(res) {
            let data = '',
                json_data;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                json_data = JSON.parse(data);

                console.log("getSentimentAnalysisFearGreed", json_data.data[0].value);

                resolve((parseFloat(json_data.data[0].value) / 100).toFixed(2));
            });
        });
    });
}


async function getSentimentAnalysis(newsJsonData) {




    let risultato = 0.5;

    try {
        const deepai = require('deepai'); // OR include deepai.min.js as a script tag in your HTML

        deepai.setApiKey(process.env.DEEPAI_API_KEY);




        var resp = await deepai.callStandardApi("sentiment-analysis", {
            text: newsJsonData.map((v) => { return v.title + '. ' + v.description + '. ' + v.content }).join('. '),
        });

        let sum = 0;
        let total = 0;

        console.log(resp);

        Object.values(resp.output).forEach((v) => {



            switch (v) {
                case "Verynegative":
                    sum += 0;
                    total++;
                    break;
                case "Negative":
                    sum += 0.25;
                    total++;
                    break;
                case "Neutral":
                    sum += 0;
                    total++;
                    break;
                case "Positive":
                    sum += 0.75;
                    total++;
                    break;
                case "Verypositive":
                    sum += 1;
                    total++;
                    break;
            }

        });

        risultato = sum / total;

        console.log("MEDIA DELLA SENTIMENTAL ANALYSIS E' " + risultato);
    } catch (e) {

        console.log(e);

    }

    return risultato;

}

async function getData(market_name, time_interval, currency_pair_1, currency_pair_2) {

    //QOUA4VUTZJXS3M01

    return new Promise((resolve, reject) => {

        /* EUR USD */
        /*let url = 'https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=EUR&to_symbol=USD&interval=5min&outputsize=full&apikey=QOUA4VUTZJXS3M01';*/

        /* S&P 500 */
        /*url = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SP&interval=5min&outputsize=full&apikey=QOUA4VUTZJXS3M01';*/

        /* sentimento sull'attrattivit� della valuta o la fragilit� del momento */
        /*  
         * https://www.alphavantage.co/query?function=CRYPTO_RATING&symbol=BTC&apikey=QOUA4VUTZJXS3M01
         * 
         * OPPURE 
         * 
         * https://app.flipsidecrypto.com/tracker/all-coins (se tutti comprano sale di valore, se tutti vendono scende perch� la capitalizzazione cambia)
         * */


        /*prova con 5 timeseries (minuti in questo caso), 20 epochs . err 0.0005. previsione tra 5 minuti */

        let market_name_url = "";
        let symbol_name_1 = "";
        let symbol_name_2 = "";



        let interval = "";
        let json_data_name = "";

        switch (time_interval) {
            /*<option value="INTRADAY_1_MIN">1 min</option>
             <option value="INTRADAY_5_MIN">5 min</option>
             <option value="INTRADAY_15_MIN">15 min</option>
             <option value="INTRADAY_30_MIN">30 min</option>
             <option value="INTRADAY_60_MIN">60 min</option>
             <option value="DAILY" selected>1 DAY</option>
             <option value="WEEKLY">1 WEEK</option>
             <option value="MONTHLY">1 MONTH</option>*/
            case "INTRADAY_1_MIN":
                switch (market_name) {
                    case "CRYPTO":
                        market_name_url = "CRYPTO_";
                        symbol_name_1 = "symbol";
                        symbol_name_2 = "market";
                        json_data_name = "Time Series Crypto (1min)";
                        break;

                    case "FOREX":
                        market_name_url = "FX_";
                        symbol_name_1 = "from_symbol";
                        symbol_name_2 = "to_symbol";
                        json_data_name = "Time Series FX (1min)";
                        break;

                }

                market_name_url += "INTRADAY";
                interval = "&interval=1min";

                break;

            case "INTRADAY_5_MIN":
                switch (market_name) {
                    case "CRYPTO":
                        market_name_url = "CRYPTO_";
                        symbol_name_1 = "symbol";
                        symbol_name_2 = "market";
                        json_data_name = "Time Series Crypto (5min)";
                        break;

                    case "FOREX":
                        market_name_url = "FX_";
                        symbol_name_1 = "from_symbol";
                        symbol_name_2 = "to_symbol";
                        json_data_name = "Time Series FX (5min)";
                        break;

                }

                market_name_url += "INTRADAY";
                interval = "&interval=5min";
                break;

            case "INTRADAY_15_MIN":
                switch (market_name) {
                    case "CRYPTO":
                        market_name_url = "CRYPTO_";
                        symbol_name_1 = "symbol";
                        symbol_name_2 = "market";
                        json_data_name = "Time Series Crypto (15min)";
                        break;

                    case "FOREX":
                        market_name_url = "FX_";
                        symbol_name_1 = "from_symbol";
                        symbol_name_2 = "to_symbol";
                        json_data_name = "Time Series FX (15min)";
                        break;

                }

                market_name_url += "INTRADAY";
                interval = "&interval=15min";
                break;

            case "INTRADAY_30_MIN":

                switch (market_name) {
                    case "CRYPTO":
                        market_name_url = "CRYPTO_";
                        symbol_name_1 = "symbol";
                        symbol_name_2 = "market";
                        json_data_name = "Time Series Crypto (30min)";
                        break;

                    case "FOREX":
                        market_name_url = "FX_";
                        symbol_name_1 = "from_symbol";
                        symbol_name_2 = "to_symbol";
                        json_data_name = "Time Series FX (30min)";
                        break;

                }

                market_name_url += "INTRADAY";
                interval = "&interval=30min";
                break;

            case "INTRADAY_60_MIN":

                switch (market_name) {
                    case "CRYPTO":
                        market_name_url = "CRYPTO_";
                        symbol_name_1 = "symbol";
                        symbol_name_2 = "market";
                        json_data_name = "Time Series Crypto (60min)";
                        break;

                    case "FOREX":
                        market_name_url = "FX_";
                        symbol_name_1 = "from_symbol";
                        symbol_name_2 = "to_symbol";
                        json_data_name = "Time Series FX (60min)";
                        break;

                }
                market_name_url += "INTRADAY";
                interval = "&interval=60min";
                break;

            case "DAILY":
                switch (market_name) {
                    case "CRYPTO":
                        market_name_url = "DIGITAL_CURRENCY_DAILY";
                        symbol_name_1 = "symbol";
                        symbol_name_2 = "market";
                        json_data_name = "Time Series (Digital Currency Daily)";
                        break;

                    case "FOREX":
                        market_name_url = "FX_DAILY";
                        symbol_name_1 = "from_symbol";
                        symbol_name_2 = "to_symbol";
                        json_data_name = "Time Series FX (Daily)";
                        break;

                }

                break;

            case "WEEKLY":
                switch (market_name) {
                    case "CRYPTO":
                        market_name_url = "DIGITAL_CURRENCY_WEEKLY";
                        symbol_name_1 = "symbol";
                        symbol_name_2 = "market";
                        json_data_name = "Time Series (Digital Currency Weekly)";
                        break;

                    case "FOREX":
                        market_name_url = "FX_WEEKLY";
                        symbol_name_1 = "from_symbol";
                        symbol_name_2 = "to_symbol";
                        json_data_name = "Time Series FX (Weekly)";
                        break;

                }
                break;

            case "MONTHLY":
                switch (market_name) {
                    case "CRYPTO":
                        market_name_url = "DIGITAL_CURRENCY_MONTHLY";
                        symbol_name_1 = "symbol";
                        symbol_name_2 = "market";
                        json_data_name = "Time Series (Digital Currency Monthly)";
                        break;

                    case "FOREX":
                        market_name_url = "FX_MONTHLY";
                        symbol_name_1 = "from_symbol";
                        symbol_name_2 = "to_symbol";
                        json_data_name = "Time Series FX (Monthly)";
                        break;

                }
                break;

        }


        let url = 'https://www.alphavantage.co/query?function=' + market_name_url + '&' + symbol_name_1 + '=' + currency_pair_1 + '&' + symbol_name_2 + '=' + currency_pair_2 + '' + interval + '&outputsize=full&apikey=' + process.env.ALPHADVANTAGE_API_KEY;



        console.log("URL", url);

        let timeseriesRequest = https.get(url, function(res) {
            let data = '',
                json_data;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                json_data = JSON.parse(data);

                // will output a Javascript object
                console.log("data received");

                /*Time Series FX (Daily) per il forex*/

                let rawData = null;

                switch (market_name) {
                    case "CRYPTO":
                        if (time_interval.indexOf("INTRADAY") === 0) {
                            if (currency_pair_1 === "SHIB") {
                                rawData = Object.values(json_data[json_data_name]).map(d => ({
                                    open: parseFloat(d["1. open"]) * 1000,
                                    high: parseFloat(d["2. high"]) * 1000,
                                    low: parseFloat(d["3. low"]) * 1000,
                                    close: parseFloat(d["4. close"]) * 1000,
                                    volume: parseFloat(d["5. volume"])
                                }));
                            } else {
                                rawData = Object.values(json_data[json_data_name]).map(d => ({
                                    open: parseFloat(d["1. open"]),
                                    high: parseFloat(d["2. high"]),
                                    low: parseFloat(d["3. low"]),
                                    close: parseFloat(d["4. close"]),
                                    volume: parseFloat(d["5. volume"])
                                }));
                            }
                        } else {
                            if (currency_pair_1 === "SHIB") {
                                rawData = Object.values(json_data[json_data_name]).map(d => ({
                                    open: parseFloat(d["1b. open (USD)"]) * 1000,
                                    high: parseFloat(d["2b. high (USD)"]) * 1000,
                                    low: parseFloat(d["3b. low (USD)"]) * 1000,
                                    close: parseFloat(d["4b. close (USD)"]) * 1000,
                                    volume: parseFloat(d["5. volume"]) * 1000,
                                    market_cap: parseFloat(d["6. market cap (USD)"])
                                }));
                            } else {
                                rawData = Object.values(json_data[json_data_name]).map(d => ({
                                    open: parseFloat(d["1b. open (USD)"]),
                                    high: parseFloat(d["2b. high (USD)"]),
                                    low: parseFloat(d["3b. low (USD)"]),
                                    close: parseFloat(d["4b. close (USD)"]),
                                    volume: parseFloat(d["5. volume"]),
                                    market_cap: parseFloat(d["6. market cap (USD)"])
                                }));
                            }

                        }
                        break;
                    case "FOREX":
                        rawData = Object.values(json_data[json_data_name]).map(d => ({
                            open: parseFloat(d["1. open"]),
                            high: parseFloat(d["2. high"]),
                            low: parseFloat(d["3. low"]),
                            close: parseFloat(d["4. close"])
                        }));
                        break;
                }


                resolve(rawData.reverse());

            });
        });

        timeseriesRequest.on('error', function(e) {
            console.log(e.message);
        });


    });
}

function percDiff(a, b) {
    return 100 * Math.abs((a - b) / ((a + b) / 2));
}

let newsData;
let newsDataTimestamp = 0;
let sentimentAnalysisData;



/* --------------------------- BINANCE ------------------------- */
//forse meglio simulare con un centesimo in USDT del bilancio (iniziale quasi 100mila)


//nella one way mode, se shorti va negativo, e se longhi va positivo l'ammontare
//ma la positionSide è sempre BOTH

async function currency_conversion(currency_pair_1, currency_pair_2, currency_pair_2_amount) {
    if (currency_pair_2 === "USD") {
        currency_pair_2 = "USDT";
    }

    //restituisce la somma di currency_pair_1 ottenuta pagando con currency_pair_2
    let currency_pair_1_price = await binance_future_price(currency_pair_1, currency_pair_2);

    return currency_pair_2_amount / currency_pair_1_price;
}

async function binance_future_price(currency_pair_1, currency_pair_2) {
    if (currency_pair_2 === "USD") {
        currency_pair_2 = "USDT";
    }

    let futurePrices = await binance.futuresPrices();

    //console.log("MARK PRICE", await binance.futuresMarkPrice(currency_pair_1 + currency_pair_2));

    //console.info("QUOTE", await binance.futuresQuote("BCHUSDT"));




    return futurePrices[currency_pair_1 + currency_pair_2];
}

async function binance_future_wallet_balance(currency_pair_2) {
    if (currency_pair_2 === "USD") {
        currency_pair_2 = "USDT";
    }
    let futuresBalance = await binance.futuresBalance();
    let USDTBalance = futuresBalance.filter(word => word.asset === currency_pair_2);
    if (USDTBalance[0]) {
        return USDTBalance[0].availableBalance;
    } else {
        return 0;
    }

}

async function binance_future_opened_position(currency_pair_1, currency_pair_2, message) {
    if (currency_pair_2 === "USD") {
        currency_pair_2 = "USDT";
    }


    let futuresPositions = await binance.futuresPositionRisk();



    let BTCUSDTPosition = futuresPositions.filter(word => word.symbol === currency_pair_1 + currency_pair_2);
    //BTCUSDTPosition.forEach((v) => {

    if (message != undefined) {
        console.log("FUTURES POSITIONS", message, BTCUSDTPosition);
    }

    if (BTCUSDTPosition[0]) {
        return BTCUSDTPosition[0].positionAmt;
    } else {
        return 0;
    }
}

//stop loss and take profit
//https://github.com/jaggedsoft/node-binance-api/issues/754

global.binance_future_buy = async function(currency_pair_1, currency_pair_2, /*quantity,*/ limit = 0, take_profit = 0) {
    if (currency_pair_2 === "USD") {
        currency_pair_2 = "USDT";
    }
    limit = limit.toFixed(0);
    take_profit = take_profit.toFixed(0);

    let invested_amount = await binance_future_wallet_balance(currency_pair_2);

    let quantity = await currency_conversion(currency_pair_1, currency_pair_2, invested_amount / 100 * 20);

    quantity = quantity.toFixed(3);

    //chiude se ci sono sell
    let opened_position = await binance_future_opened_position(currency_pair_1, currency_pair_2);

    console.log("BUY DEBUG", invested_amount, quantity, currency_pair_1, currency_pair_2, limit, opened_position);

    let close_qty = 0;
    if (opened_position < 0) {
        binance.futuresCancelAll(currency_pair_1 + currency_pair_2);
        console.log("CLOSE SELL POSITION", currency_pair_1 + currency_pair_2, opened_position * -1);
        close_qty += Math.abs(opened_position);
    }
    if (opened_position <= 0) {
        let size = parseFloat(quantity) + parseFloat(close_qty);

        console.log("SEND BUY", currency_pair_1 + currency_pair_2, quantity + close_qty);
        console.info(await binance.futuresMarketBuy(currency_pair_1 + currency_pair_2, size.toFixed(3)));

        //se arriva allo stop loss deve vendere per chiudere la posizione in long
        if (limit > 0) {
            //quantity è in currency pair 1, limit in currency pair 2
            console.log("SET BUY STOP LOSS", currency_pair_1 + currency_pair_2, quantity, limit);
            //console.info(await binance.futuresSell(currency_pair_1 + currency_pair_2, quantity, limit));
            console.log(await binance.futuresMarketSell(currency_pair_1 + currency_pair_2, quantity, {
                type: "STOP_MARKET",
                stopPrice: limit,
                priceProtect: true
            }));
        }

        if (take_profit > 0) {
            console.log("SET BUY TAKE PROFIT", currency_pair_1 + currency_pair_2, quantity, take_profit);

            console.log(await binance.futuresSell(currency_pair_1 + currency_pair_2, quantity, take_profit, {
                //newClientOrderId: my_order_id_tp,
                stopPrice: take_profit,
                type: "TAKE_PROFIT",
                //timeInForce: "GTC",
                priceProtect: true
            }));
        }

        await binance_future_opened_position(currency_pair_1, currency_pair_2, "AFTER BUY");
    }
}

global.binance_future_sell = async function(currency_pair_1, currency_pair_2, /* quantity,*/ limit = 0, take_profit = 0) {
    if (currency_pair_2 === "USD") {
        currency_pair_2 = "USDT";
    }

    limit = limit.toFixed(0);
    take_profit = take_profit.toFixed(0);

    let invested_amount = await binance_future_wallet_balance(currency_pair_2);

    let quantity = await currency_conversion(currency_pair_1, currency_pair_2, invested_amount / 100 * 20);

    quantity = quantity.toFixed(3);

    //chiude se ci sono buy
    let opened_position = await binance_future_opened_position(currency_pair_1, currency_pair_2);

    console.log("SELL DEBUG", invested_amount, quantity, currency_pair_1, currency_pair_2, limit, opened_position);

    let close_qty = 0;
    if (opened_position > 0) {
        binance.futuresCancelAll(currency_pair_1 + currency_pair_2);
        console.log("CLOSE BUY POSITION", currency_pair_1 + currency_pair_2, opened_position * -1);
        close_qty += Math.abs(opened_position);
    }
    if (opened_position >= 0) {
        let size = parseFloat(quantity) + parseFloat(close_qty);

        console.log("SEND SELL", currency_pair_1 + currency_pair_2, quantity + close_qty);
        console.info(await binance.futuresMarketSell(currency_pair_1 + currency_pair_2, size.toFixed(3)));



        //se arriva allo stop loss deve comprare per chiudere la posizione in short
        if (limit > 0) {
            //quantity è in currency pair 1, limit in currency pair 2
            console.log("SET SELL STOP LOSS", currency_pair_1 + currency_pair_2, quantity, limit);
            //console.info(await binance.futuresBuy(currency_pair_1 + currency_pair_2, quantity, limit));

            console.log(await binance.futuresMarketBuy(currency_pair_1 + currency_pair_2, quantity, {
                type: "STOP_MARKET",
                stopPrice: limit,
                priceProtect: true
            }));
        }

        if (take_profit > 0) {
            console.log("SET SELL TAKE PROFIT", currency_pair_1 + currency_pair_2, quantity, take_profit);

            console.log(await binance.futuresBuy(currency_pair_1 + currency_pair_2, quantity, take_profit, {
                //newClientOrderId: my_order_id_tp,
                stopPrice: take_profit,
                type: "TAKE_PROFIT",
                //timeInForce: "GTC",
                priceProtect: true
            }));
        }


        await binance_future_opened_position(currency_pair_1, currency_pair_2, "AFTER SELL");
    }
}

/* ------------------- END BINANCE --------------------------- */

async function main(market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, training_enabled, socket) {

    /*console.log(await binance_future_price(currency_pair_1, currency_pair_2));
    return;*/

    let learningRate = 0.0001;
    const optimizer = tf.train.adam(learningRate);

    /*console.log(model = await ai_model_loader.load_model(market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, optimizer));
    return false;*/

    const timeseriesData = await getData(market_name, time_interval, currency_pair_1, currency_pair_2);

    /*let actual_price = await getMarketPrice(currency_pair_1);

    actual_price = actual_price.result.price;*/

    let tmp_currency_pair_2 = currency_pair_2;
    if (currency_pair_2 === "USD") {
        tmp_currency_pair_2 = "USDT";
    }

    let actual_price = await binance.futuresMarkPrice(currency_pair_1 + tmp_currency_pair_2);

    console.log("DEBUG MARK PRICE", actual_price);

    actual_price = actual_price.markPrice;

    console.log("MARKET PRICE", currency_pair_1, actual_price);

    let orderBook = await getOrderBook(currency_pair_1);

    let orderBookTrend = orderBook['trend'];

    let orderBookStatus = orderBook['status'];

    let resistenceAndSupport = getResistenceAndSupport(orderBookStatus);

    let i = 0;
    //se le resistenze e supporti sono irrealistici rifà il giro
    //massimo 3 tentativi, poi uno si arrangia
    while (i < 3 &&
        (percDiff(actual_price, resistenceAndSupport['resistence']) > 25 ||
            percDiff(actual_price, resistenceAndSupport['support']) > 25 ||
            actual_price > resistenceAndSupport['support'] ||
            actual_price < resistenceAndSupport['resistence'])) {

        console.log("CONDIZIONI RIPETUTE",
            percDiff(actual_price, resistenceAndSupport['resistence']) > 25,
            percDiff(actual_price, resistenceAndSupport['support']) > 25,
            actual_price > resistenceAndSupport['support'],
            actual_price < resistenceAndSupport['resistence'],
            actual_price,
            resistenceAndSupport['resistence'],
            resistenceAndSupport['support'],
            percDiff(actual_price, resistenceAndSupport['resistence']),
            percDiff(actual_price, resistenceAndSupport['support']))

        orderBook = await getOrderBook(currency_pair_1);

        orderBookTrend = orderBook['trend'];

        orderBookStatus = orderBook['status'];

        resistenceAndSupport = getResistenceAndSupport(orderBookStatus);

        i++;
    }

    console.log(actual_price, resistenceAndSupport);



    console.log('resistencesAndSupport', resistenceAndSupport['resistence'], resistenceAndSupport['support']);

    const trades = await getTrades(currency_pair_1, time_interval);

    console.log(trades);

    //le news le deve prendere solo 1 volta ogni ora, poi devono rimanere quelle
    //sennò ci mette troppo a dare le indicazioni per lo scalping
    //e non serve a una sega così

    //se la data di adesso - la data delle ultime news 
    //è superiore a 60 minuti per 60 secondi ovvero mezz'ora
    //le richiede nuovamente. se è 0 ovviamente sarà superiore
    /*const dateNow = new Date().getTime() / 1000;
    if (dateNow - newsDataTimestamp > (30 * 60)) {
        newsData = await getNewsData(currency_pair_1);
        newsDataTimestamp = new Date().getTime() / 1000;

        console.log("got news data");

        //ATTENZIONE
        sentimentAnalysisData = 0.5;

        sentimentAnalysisData = await getSentimentAnalysis(newsData);


        // https://api.alternative.me/fng/

        

        console.log("got sentiment analysis data");
    }*/

    sentimentAnalysisData = 0.5;

    sentimentAnalysisData = await getSentimentAnalysisFearGreed();

    console.log("FEAR AND GREED", sentimentAnalysisData);

    await trainer.train_data(timeseriesData, time_steps, epochs_number, training_enabled, market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, socket, sentimentAnalysisData, orderBookTrend, resistenceAndSupport, trades, actual_price);

    /*let ticker = await binance.prices();
    console.info(`Price of BTC: ${ticker.BTCUSDT}`);*/

}



async function train_models() {


    await main('CRYPTO', 'DAILY', "BTC", "USD", 14, 50, true, null);
    await main('CRYPTO', 'DAILY', "ETH", "USD", 14, 50, true, null);
    await main('CRYPTO', 'DAILY', "DOGE", "USD", 14, 50, true, null);


    await main('CRYPTO', 'INTRADAY_60_MIN', "BTC", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_60_MIN', "ETH", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_60_MIN', "DOGE", "USD", 14, 50, true, null);

    await main('CRYPTO', 'INTRADAY_30_MIN', "BTC", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_30_MIN', "ETH", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_30_MIN', "DOGE", "USD", 14, 50, true, null);

    await main('CRYPTO', 'INTRADAY_15_MIN', "BTC", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_15_MIN', "ETH", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_15_MIN', "DOGE", "USD", 14, 50, true, null);

    await main('CRYPTO', 'INTRADAY_5_MIN', "BTC", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_5_MIN', "ETH", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_5_MIN', "DOGE", "USD", 14, 50, true, null);

    await main('CRYPTO', 'INTRADAY_1_MIN', "BTC", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_1_MIN', "ETH", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_1_MIN', "DOGE", "USD", 14, 50, true, null);

}