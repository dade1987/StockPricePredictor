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

global.trainer = require('./neural/ai_trainer');
global.pick_incidence = require('./indicators/pick_incidence');
global.normalizer = require('./services/normalizer');
global.prepare_data = require('./services/prepare_data');
global.simulators = require('./simulators/simulator');
global.ai_model_loader = require('./services/ai_model_loader');
global.buy_sell_condition = require('./indicators/buy_sell_condition');

//global.player = require('play-sound')({player: "C:/Program Files (x86)/Windows Media Player/wmplayer.exe"})


/*
global.prices_min = 0;
global.prices_max = 0;
*/

const PORT = process.env.PORT || 3000;

const INDEX = '/index.html';

dotenv.config();

const server = express()
    .get('/', function (req, res) {
        res.sendFile(process.cwd() + "/index.html");
    })
    .get('/admin', function (req, res) {
        res.sendFile(process.cwd() + "/index_modificabile.html");
    }).get('/banner', function (req, res) {
        res.sendFile(process.cwd() + "/banner.jpg");
    }).listen(PORT, () => console.log(`Listening on ${PORT}`));


const io = socketio(server);


io.on('connection', (socket) => {
    socket.on('test_data', (value) => {
        console.log("connection");
    });

    socket.on('predict', async (arg) => {
        console.log('received predict request');

        let parameters = JSON.parse(arg);

        console.log(parameters);

        await main(parameters.market_name, parameters.time_interval, parameters.currency_pair_1, parameters.currency_pair_2, parseInt(parameters.time_steps), parseInt(parameters.epochs_number), parameters.training_enabled, socket);
    });
});

process.argv.forEach(function (val, index, array) {
    console.log(val);

    if (val === "--train") {

        console.log("STARTING TRAINING");

        train_models();

    }
});


setInterval(() => io.emit('time', new Date().toTimeString()), 1000);

const yesterday = () => {
    let d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

async function getOrderBook(currency_pair_1) {

    //leggi il primo 5% degli ordini più grossi
    //attenzione. 5 vale solo come span per 5 bitcoins
    let url = "https://api.cryptowat.ch/markets/binance/" + currency_pair_1 + "usdt/orderbook";//?span=5
    //let url = "https://api.cryptowat.ch/markets/binance/" + currency_pair_1 + "usdt/orderbook?limit=1";

    return new Promise((resolve, reject) => {

        let newsRequest = https.get(url.toLowerCase(), function (res) {
            let data = '',
                json_data;

            res.on('data', function (stream) {
                data += stream;
            });
            res.on('end', function () {
                json_data = JSON.parse(data);

                // will output a Javascript object
                /*console.log("news data received");
                console.log(json_data);
    
                console.log(json_data.articles[0].title + ' ' + json_data.articles[0].description + ' ' + json_data.articles[0].content);*/

                //resolve(json_data.articles);

                //console.log(json_data.result.asks[0][0]);

                let asks = 0;
                json_data.result.asks.forEach((v) => {
                    asks += v[0] * v[1];
                });

                let bids = 0;
                json_data.result.bids.forEach((v) => {
                    bids += v[0] * v[1];
                });

                //quindi siccome bids sono gli ordini in acquisto, se i volumi dei grossi traders sono negativi si propende per la vendita
                console.log("DIREZIONE DELLE BALENE... COMPRANO ?", bids > asks);

                //SE E' false vendono, se è true comprano
                resolve(bids > asks);

            }
            );
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

        let newsRequest = https.get(url_news, function (res) {
            let data = '',
                json_data;

            res.on('data', function (stream) {
                data += stream;
            });
            res.on('end', function () {
                json_data = JSON.parse(data);

                // will output a Javascript object
                /*console.log("news data received");
                console.log(json_data);

                console.log(json_data.articles[0].title + ' ' + json_data.articles[0].description + ' ' + json_data.articles[0].content);*/

                resolve(json_data.articles);
            }
            );
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
    }
    catch (e) {

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

        let timeseriesRequest = https.get(url, function (res) {
            let data = '',
                json_data;

            res.on('data', function (stream) {
                data += stream;
            });
            res.on('end', function () {
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

        timeseriesRequest.on('error', function (e) {
            console.log(e.message);
        });


    });
}












async function main(market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, training_enabled, socket) {

    let learningRate = 0.0001;
    const optimizer = tf.train.adam(learningRate);

    /*console.log(model = await ai_model_loader.load_model(market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, optimizer));
    return false;*/

    const timeseriesData = await getData(market_name, time_interval, currency_pair_1, currency_pair_2);


    const orderBook = await getOrderBook(currency_pair_1);


    const newsData = await getNewsData(currency_pair_1);

    const sentimentAnalysisData = await getSentimentAnalysis(newsData);



    await trainer.train_data(timeseriesData, time_steps, epochs_number, training_enabled, market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, socket, sentimentAnalysisData, orderBook);

}

async function train_models() {

    
    await main('CRYPTO', 'DAILY', "BTC", "USD", 14, 50, true, null);
    await main('CRYPTO', 'DAILY', "ETH", "USD", 14, 50, true, null);
    await main('CRYPTO', 'DAILY', "DOGE", "USD", 14, 50, true, null);

    
    await main('CRYPTO', 'INTRADAY_60_MIN', "BTC", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_60_MIN', "ETH", "USD", 14, 50, true, null);
    await main('CRYPTO', 'INTRADAY_60_MIN', "DOGE", "USD", 14, 50, true, null);

}