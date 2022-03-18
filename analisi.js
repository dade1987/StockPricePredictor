const dotenv = require('dotenv');
dotenv.config();


global.http = require('http');
global.https = require('https');

global.express = require('express');

global.EMA = require('technicalindicators').EMA;
global.RSI = require('technicalindicators').RSI;
global.BB = require('technicalindicators').BollingerBands;

//------------------------------------------- INIZIO BINANCE

let binance_api_status = false;

//const Binance = require('node-binance-api-testnet');
const Binance = require('node-binance-api');
let binance;

async function initializeBinanceAPI() {
    binance_api_status = true;

    binance = new Binance().options({
        APIKEY: '19IykeSJ5ksW3Gyvdkatw5jaH93WI3FBYDMHUAIPijVljtQbW3VHTcpcSzMRLqmB', //'e7bf540837fc6038cba00e591154ce20ad7cfa08268b232982434f637f094daa',
        APISECRET: 'ZCCByYMZgp6gPQtFZJfh84vwwZ4HtDDN6Z3jDTwP65TlWmcpdCpdsEbh1WSK0uwF' //'1b8ed254967498a507c3a23371c83948f7fced728f5620be874755c6b8a5c817'//
    });

    await binance.futuresLeverage('BTCUSDT', 5);
}

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

//nelle closeposition non serve il reduceOnly perchè già si presume.
//il reduceOnly serve solo quando si riduce la posizione, ma non del tutto, o anche del tutto, ma senza chiudera
//se è chiusa è ovvio che viene ridotta del 100%
//infatti controllando mette da solo il reduce only. in teoria non andrebbe neanche impostata la quantità da ridurre ma funziona uguale

async function binance_future_buy(currency_pair_1, currency_pair_2, /*quantity,*/
    limit = 0, take_profit = 0, stop_loss_perc = 0, actual_price = 0, trailing_stop_percent = 0, take_profit_percent = 0) {
    if (currency_pair_2 === "USD") {
        currency_pair_2 = "USDT";
    }
    limit = limit.toFixed(0);
    take_profit = take_profit.toFixed(0);

    let invested_amount = await binance_future_wallet_balance(currency_pair_2);

    let quantity = await currency_conversion(currency_pair_1, currency_pair_2, invested_amount / 100);

    quantity = quantity.toFixed(3);

    //temporaneo
    quantity = '0.001';

    //chiude se ci sono sell
    let opened_position = await binance_future_opened_position(currency_pair_1, currency_pair_2);

    console.log("BUY DEBUG", invested_amount, quantity, currency_pair_1, currency_pair_2, limit, opened_position);

    let close_qty = 0;
    if (opened_position < 0) {

        console.log("CLOSE SELL POSITION", currency_pair_1 + currency_pair_2, opened_position * -1);
        close_qty += Math.abs(opened_position);

        console.info(await binance.futuresMarketBuy(currency_pair_1 + currency_pair_2, close_qty.toFixed(3), {
            type: "MARKET",
            priceProtect: true,
            reduceOnly: true,
            //workingType: 'MARK_PRICE',
            //closePosition: true
        }));
    }
    if (opened_position <= 0) {
        binance.futuresCancelAll(currency_pair_1 + currency_pair_2);
        //let size = parseFloat(quantity) + parseFloat(close_qty);

        console.log("SEND BUY", currency_pair_1 + currency_pair_2, quantity /*+ close_qty*/ );
        console.info(await binance.futuresMarketBuy(currency_pair_1 + currency_pair_2, quantity
            /*, {
                        workingType: 'MARK_PRICE',
                    }*/
        ));

        //se arriva allo stop loss deve vendere per chiudere la posizione in long
        if (stop_loss_perc > 0) {
            //quantity è in currency pair 1, limit in currency pair 2
            console.log("SET BUY STOP LOSS", currency_pair_1 + currency_pair_2, quantity, limit);
            //console.info(await binance.futuresSell(currency_pair_1 + currency_pair_2, quantity, limit));
            console.log(await binance.futuresMarketSell(currency_pair_1 + currency_pair_2, quantity, {
                type: "STOP_MARKET",
                stopPrice: (parseFloat(actual_price) / 100 * (100 - stop_loss_perc)).toFixed(0),
                priceProtect: true,
                reduceOnly: true,
                /* workingType: 'MARK_PRICE',*/
                //closePosition: true
            }));
        }

        if (trailing_stop_percent > 0) {

            console.log("SET BUY TAKE PROFIT", currency_pair_1 + currency_pair_2, quantity, take_profit);

            console.log(await binance.futuresMarketSell(currency_pair_1 + currency_pair_2, quantity, {
                //newClientOrderId: my_order_id_tp,
                stopPrice: (parseFloat(actual_price) / 100 * (100 + take_profit_percent)).toFixed(0),
                type: "TAKE_PROFIT_MARKET",
                //timeInForce: "GTC",
                priceProtect: true,
                //reduceOnly: true,
                closePosition: true

            }));

            /*if (trailing_stop_percent < 0.1) {
                console.log("FORZATURA STOP LOSS BUY");
                trailing_stop_percent = 0.1;
            }

            console.log("TAKE PROFIT BUY", currency_pair_1 + currency_pair_2, 'quantity', quantity, 'activation_price', (parseFloat(actual_price) / 100 * (100 + stop_loss_perc)).toFixed(0), 'callback_rate', (trailing_stop_percent).toFixed(1));

            console.log(await binance.futuresMarketSell(currency_pair_1 + currency_pair_2, quantity, {
                //newClientOrderId: my_order_id_tp,
               
                callbackRate: (trailing_stop_percent).toFixed(1),
                type: "TRAILING_STOP_MARKET",
                //timeInForce: "GTC",
                priceProtect: true,
                reduceOnly: true,
             
                //closePosition: true
            }));*/
        }

        await binance_future_opened_position(currency_pair_1, currency_pair_2, "AFTER BUY");
    }
}

async function binance_future_sell(currency_pair_1, currency_pair_2, /* quantity,*/
    limit = 0, take_profit = 0, stop_loss_perc = 0, actual_price = 0, trailing_stop_percent = 0, take_profit_percent = 0) {
    if (currency_pair_2 === "USD") {
        currency_pair_2 = "USDT";
    }

    limit = limit.toFixed(0);
    take_profit = take_profit.toFixed(0);

    let invested_amount = await binance_future_wallet_balance(currency_pair_2);

    let quantity = await currency_conversion(currency_pair_1, currency_pair_2, invested_amount / 100);

    quantity = quantity.toFixed(3);

    //temporaneo
    quantity = '0.001';

    //chiude se ci sono buy
    let opened_position = await binance_future_opened_position(currency_pair_1, currency_pair_2);

    console.log("SELL DEBUG", invested_amount, quantity, currency_pair_1, currency_pair_2, limit, opened_position);

    let close_qty = 0;
    if (opened_position > 0) {

        console.log("CLOSE BUY POSITION", currency_pair_1 + currency_pair_2, opened_position * -1);

        close_qty += Math.abs(opened_position);

        console.info(await binance.futuresMarketSell(currency_pair_1 + currency_pair_2, close_qty.toFixed(3), {
            type: "MARKET",
            priceProtect: true,
            reduceOnly: true,
            /*workingType: 'MARK_PRICE',*/
            //closePosition: true
        }));

    }

    if (opened_position >= 0) {
        binance.futuresCancelAll(currency_pair_1 + currency_pair_2);
        //let size = parseFloat(quantity) + parseFloat(close_qty);

        console.log("SEND SELL", currency_pair_1 + currency_pair_2, quantity);
        console.info(await binance.futuresMarketSell(currency_pair_1 + currency_pair_2, quantity
            /*, {
                        workingType: 'MARK_PRICE',
                    }*/
        ));



        //se arriva allo stop loss deve comprare per chiudere la posizione in short
        if (stop_loss_perc > 0) {
            //quantity è in currency pair 1, limit in currency pair 2
            console.log("SET SELL STOP LOSS", currency_pair_1 + currency_pair_2, quantity, limit);
            //console.info(await binance.futuresBuy(currency_pair_1 + currency_pair_2, quantity, limit));

            console.log(await binance.futuresMarketBuy(currency_pair_1 + currency_pair_2, quantity, {
                type: "STOP_MARKET",
                stopPrice: (parseFloat(actual_price) / 100 * (100 + stop_loss_perc)).toFixed(0),
                priceProtect: true,
                reduceOnly: true,
                /* workingType: 'MARK_PRICE',*/
                //closePosition: true
            }));
        }

        if (trailing_stop_percent > 0) {

            console.log("SET SELL TAKE PROFIT", currency_pair_1 + currency_pair_2, quantity, take_profit);

            console.log(await binance.futuresMarketBuy(currency_pair_1 + currency_pair_2, quantity, {
                //newClientOrderId: my_order_id_tp,
                stopPrice: (parseFloat(actual_price) / 100 * (100 - take_profit_percent)).toFixed(0),
                type: "TAKE_PROFIT_MARKET",
                //timeInForce: "GTC",
                priceProtect: true,
                //reduceOnly: true,
                closePosition: true
            }));
            /*if (trailing_stop_percent < 0.1) {
                console.log("FORZATURA STOP LOSS SELL");
                trailing_stop_percent = 0.1;
            }

            console.log("TAKE PROFIT SELL", currency_pair_1 + currency_pair_2, 'quantity', quantity, 'activation_price', (parseFloat(actual_price) / 100 * (100 - stop_loss_perc)).toFixed(0), 'callback_rate', (trailing_stop_percent).toFixed(1));

            console.log(await binance.futuresMarketBuy(currency_pair_1 + currency_pair_2, quantity, {
                //newClientOrderId: my_order_id_tp,
                
                callbackRate: (trailing_stop_percent).toFixed(1),
                type: "TRAILING_STOP_MARKET",
                //timeInForce: "GTC",
                priceProtect: true,
                reduceOnly: true,
                
                //closePosition: true
            }));*/
        }


        await binance_future_opened_position(currency_pair_1, currency_pair_2, "AFTER SELL");
    }
}
//------------------------------------------- FINE BINANCE

async function getData(market_name, time_interval, currency_pair_1, currency_pair_2) {

    console.log(market_name, time_interval, currency_pair_1, currency_pair_2);
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



        //console.log("URL", url);
        //console.trace();

        let timeseriesRequest = https.get(url, function(res) {
            let data = '',
                json_data;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                json_data = JSON.parse(data);

                // will output a Javascript object
                //console.log("data received");

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

async function getFuturesData(json_data) {

    let rawData = null;

    rawData = json_data.map(d => ({
        date: new Date(d[0]),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
    }));

    //console.log("CANDELE RAW DATA", rawData);
    return rawData;

}

async function applyIndicators(data) {

    let ema_5 = EMA.calculate({
        period: 5,
        values: data.map(d => d.close)
    });

    let ema_10 = EMA.calculate({
        period: 10,
        //semmai rimettere su close e cambiare trigger dell'azione
        values: data.map(d => d.close)
    });

    let ema_60 = EMA.calculate({
        period: 60,
        values: data.map(d => d.close)
    });

    let ema_223 = EMA.calculate({
        period: 223,
        values: data.map(d => d.close)
    });

    let rsi = RSI.calculate({
        period: 14,
        //semmai rimettere su close e cambiare trigger dell'azione
        values: data.map(d => d.close)
    });

    data.forEach((v, i) => {
        v.ema_10 = 0;
        v.ema_60 = 0
        v.ema_223 = 0;
        v.rsi = 0;
        v.aumento = false;
        v.uguale = false;
        v.diminuzione = false;
        v.azione = "NIENTE";
    });

    let d = 0;
    for (let i = 5; i < data.length; i++) {
        data[i].ema_5 = ema_5[d];
        d++;
    }

    d = 0;
    for (let i = 10; i < data.length; i++) {
        data[i].ema_10 = ema_10[d];
        d++;
    }

    d = 0;
    for (let i = 60; i < data.length; i++) {
        data[i].ema_60 = ema_60[d];
        d++;
    }

    d = 0;
    for (let i = 223; i < data.length; i++) {
        data[i].ema_223 = ema_223[d];
        d++;
    }

    d = 0;
    for (let i = 14; i < data.length; i++) {
        data[i].rsi = rsi[d];
        d++;
    }


    numero_media_rsi_buy = 0;
    valori_media_rsi_buy = 0;

    numero_media_rsi_sell = 0;
    valori_media_rsi_sell = 0;

    d = 0;
    //i dev'essere 14, anche se anche sotto è così il controllo
    for (let i = 14; i < data.length; i++) {

        data[i].aumento = data[i].close > data[i - 1].close;
        data[i].uguale = data[i].close == data[i - 1].close;
        data[i].diminuzione = data[i].close < data[i - 1].close;

        //questo è l'indicatore che ho testato il 15 marzo notte che ha prodotto discreti risultati
        //TRIGGER ACTION 15032022 SERA
        if (data[i].rsi > 40 && data[i].open < data[i].ema_10) {

            valori_media_rsi_buy += data[i].close - data[i - 1].close;
            numero_media_rsi_buy++;

            data[i].azione = "BUY";

        } else if (data[i].rsi < 60 && data[i].open > data[i].ema_10) {

            valori_media_rsi_sell += data[i - 1].close - data[i].close;
            numero_media_rsi_sell++;

            data[i].azione = "SELL";

        }

        //questo da il risultato migliore ma statisticamente su pochi numeri
        //sembra giusto. rsi e ema non cambiano durante il minuto quindi dovrebbe andare bene
        //senza dover mettere indietro di 1 data[i]
        /*if (data[i].rsi > 55 && data[i].rsi < 90 && data[i].open < data[i].ema_10) {

            valori_media_rsi_buy += data[i].close - data[i - 1].close;
            numero_media_rsi_buy++;

            data[i].azione = "BUY";

        } else
        if (data[i].rsi < 45 && data[i].rsi > 10 && data[i].open > data[i].ema_10) {

            valori_media_rsi_sell += data[i - 1].close - data[i].close;
            numero_media_rsi_sell++;

            data[i].azione = "SELL";
        }*/


        //test con rsi e ema su open invece che su close. forse è meglio
        /*if (data[i - 1].open < data[i].open && data[i].open < data[i].ema_10 && data[i].rsi > 50) {

            valori_media_rsi_buy += data[i].close - data[i - 1].close;
            numero_media_rsi_buy++;

            data[i].azione = "BUY";
        } else if (data[i - 1].open > data[i].open && data[i].open > data[i].ema_10 && data[i].rsi < 50) {

            valori_media_rsi_sell += data[i - 1].close - data[i].close;
            numero_media_rsi_sell++;

            data[i].azione = "SELL";
        }*/

    }

    //console.log("\n\nGUADAGNO SU 1 BTC BUY: ", valori_media_rsi_buy, "SELL: ", valori_media_rsi_sell, "\n\n")

    return data;

}


let roundByNumber = (value, number) => number * Math.round(value / number);

async function getOrderBook(currency_pair_1, actual_price) {

    console.log(actual_price);

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

    //console.log(url);

    let asks = new Object();
    let bids = new Object();

    return new Promise((resolve, reject) => {

        https.get(url.toLowerCase(), function(res) {
            let data = '',
                json_data;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                json_data = JSON.parse(data);


                let total_asks_volume = 0;
                json_data.result.asks.forEach((v) => {
                    // if (roundByNumber(v[0], 100) > actual_price) {
                    //total_asks_volume += v[0] * v[1];
                    if (asks[roundByNumber(v[0], 100)] === undefined) {
                        asks[roundByNumber(v[0], 100)] = new Object();
                        asks[roundByNumber(v[0], 100)].volume = 0;
                    }
                    asks[roundByNumber(v[0], 100)].volume++;

                    if (asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)] === undefined) {
                        asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)] = new Object();
                        asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)].volume = 0;
                    }
                    asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)].volume++;

                    if (asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)] === undefined) {
                        asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)] = new Object();
                        asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)].volume = 0;
                    }
                    asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)].volume++;

                    if (asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)][roundByNumber(v[0], 5)] === undefined) {
                        asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)][roundByNumber(v[0], 5)] = new Object();
                        asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)][roundByNumber(v[0], 5)].volume = 0;
                    }
                    asks[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)][roundByNumber(v[0], 5)].volume++;
                    //  }
                });

                let total_bids_volume = 0;
                json_data.result.bids.forEach((v) => {
                    //console.log(v[0], actual_price, v[0] < actual_price)
                    //if (roundByNumber(v[0], 100) < actual_price) {
                    //total_bids_volume += v[0] * v[1];
                    if (bids[roundByNumber(v[0], 100)] === undefined) {
                        bids[roundByNumber(v[0], 100)] = new Object();
                        bids[roundByNumber(v[0], 100)].volume = 0;
                    }
                    bids[roundByNumber(v[0], 100)].volume++;

                    if (bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)] === undefined) {
                        bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)] = new Object();
                        bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)].volume = 0;
                    }
                    bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)].volume++;

                    if (bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)] === undefined) {
                        bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)] = new Object();
                        bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)].volume = 0;
                    }
                    bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)].volume++;

                    if (bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)][roundByNumber(v[0], 5)] === undefined) {
                        bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)][roundByNumber(v[0], 5)] = new Object();
                        bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)][roundByNumber(v[0], 5)].volume = 0;
                    }
                    bids[roundByNumber(v[0], 100)][roundByNumber(v[0], 50)][roundByNumber(v[0], 10)][roundByNumber(v[0], 5)].volume++;
                    // }
                });

                //console.log("\n\n\n");

                let next_ask_volume = 0;
                let next_ask_price = 0;
                let next_bid_volume = 0;
                let next_bid_price = 0;

                i = 0;
                for (let key of Object.keys(asks)) {
                    if (i === 3) { break; }

                    //console.log("ASK 100", asks[key].volume, key);

                    total_asks_volume += asks[key].volume * key;

                    let asks_50_highest_key = 0;
                    let asks_50_highest_value = 0;
                    for (let keykey of Object.keys(asks[key]).reverse()) {

                        if (asks[key][keykey].volume > asks_50_highest_value) {
                            asks_50_highest_value = asks[key][keykey].volume;
                            asks_50_highest_key = keykey;

                        }

                    }

                    //console.log("ASK 50", asks_50_highest_key, asks_50_highest_value);

                    let asks_10_highest_key = 0;
                    let asks_10_highest_value = 0;
                    for (let keykeykey of Object.keys(asks[key][asks_50_highest_key]).reverse()) {

                        if (asks[key][asks_50_highest_key][keykeykey].volume > asks_10_highest_value) {
                            asks_10_highest_value = asks[key][asks_50_highest_key][keykeykey].volume;
                            asks_10_highest_key = keykeykey;
                        }

                    }
                    //console.log("ASK 10", asks_10_highest_key, asks_10_highest_value);

                    let asks_5_highest_key = 0;
                    let asks_5_highest_value = 0;
                    for (let keykeykeykey of Object.keys(asks[key][asks_50_highest_key][asks_10_highest_key]).reverse()) {

                        if (asks[key][asks_50_highest_key][asks_10_highest_key][keykeykeykey].volume > asks_5_highest_value) {
                            asks_5_highest_value = asks[key][asks_50_highest_key][asks_10_highest_key][keykeykeykey].volume;
                            asks_5_highest_key = keykeykeykey;
                            if (i === 0) {
                                next_ask_volume = asks_5_highest_value;
                                next_ask_price = asks_5_highest_key;
                            }
                        }

                    }
                    //console.log("ASK 5", asks_5_highest_key, asks_5_highest_value);

                    i++;
                }

                //console.log("\n\n\n");

                i = 0;
                for (let key of Object.keys(bids).reverse()) {
                    if (i === 3) { break; }


                    //console.log("BID 100", bids[key].volume, key);

                    total_bids_volume += bids[key].volume * key;


                    let bids_50_highest_key = 0;
                    let bids_50_highest_value = 0;
                    for (let keykey of Object.keys(bids[key]).reverse()) {

                        if (bids[key][keykey].volume > bids_50_highest_value) {
                            bids_50_highest_value = bids[key][keykey].volume;
                            bids_50_highest_key = keykey;

                        }

                    }

                    //console.log("BID 50", bids_50_highest_key, bids_50_highest_value);

                    let bids_10_highest_key = 0;
                    let bids_10_highest_value = 0;
                    for (let keykeykey of Object.keys(bids[key][bids_50_highest_key]).reverse()) {

                        if (bids[key][bids_50_highest_key][keykeykey].volume > bids_10_highest_value) {
                            bids_10_highest_value = bids[key][bids_50_highest_key][keykeykey].volume;
                            bids_10_highest_key = keykeykey;
                        }

                    }
                    //console.log("BID 10", bids_10_highest_key, bids_10_highest_value);

                    let bids_5_highest_key = 0;
                    let bids_5_highest_value = 0;
                    for (let keykeykeykey of Object.keys(bids[key][bids_50_highest_key][bids_10_highest_key]).reverse()) {

                        if (bids[key][bids_50_highest_key][bids_10_highest_key][keykeykeykey].volume > bids_5_highest_value) {
                            bids_5_highest_value = bids[key][bids_50_highest_key][bids_10_highest_key][keykeykeykey].volume;
                            bids_5_highest_key = keykeykeykey;

                            if (i === 0) {
                                next_bid_volume = bids_5_highest_value;
                                next_bid_price = bids_5_highest_key;
                            }
                        }

                    }
                    // console.log("BID 5", bids_5_highest_key, bids_5_highest_value);

                    i++;
                }


                /* console.log("TOTAL ASKS VOLUME", total_asks_volume);
                 console.log("TOTAL BIDS VOLUME", total_bids_volume)*/
                //console.log("DIREZIONE DEL MERCATO?", total_asks_volume > total_bids_volume, total_asks_volume, total_bids_volume);
                //console.log("ASKS", asks, "BIDS", bids)


                resolve({ trend: total_bids_volume > total_asks_volume, next_ask_volume: next_ask_volume, next_ask_price: next_ask_price, next_bid_volume: next_bid_volume, next_bid_price: next_bid_price /*, status: json_data*/ });

            });
        });

    });
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

                resolve(json_data.result.price);
            });
        });
    });
}

async function analisiAndamento(data) {

    let arrayStatistica = new Object();

    arrayStatistica.verificata_buy = 0;
    arrayStatistica.non_verificata_buy = 0;

    arrayStatistica.verificata_sell = 0;
    arrayStatistica.non_verificata_sell = 0;

    arrayStatistica.scartati = 0;

    //parti dal 14 che è il periodo di RSI (il 10 di ema è già incluso)
    for (let i = 14; i < data.length; i++) {

        if (data[i].azione === "BUY") {

            if (data[i].aumento === true) {
                arrayStatistica.verificata_buy++;
            } else {
                arrayStatistica.non_verificata_buy++;
            }
        } else if (data[i].azione === "SELL") {

            if (data[i].diminuzione === true) {
                arrayStatistica.verificata_sell++;
            } else {
                arrayStatistica.non_verificata_sell++;
            }
        } else {
            arrayStatistica.scartati++;
        }
    }

    arrayStatistica.percentuale_buy_giuste = ((arrayStatistica.verificata_buy / (arrayStatistica.verificata_buy + arrayStatistica.non_verificata_buy)) * 100).toFixed(1);

    arrayStatistica.percentuale_sell_giuste = ((arrayStatistica.verificata_sell / (arrayStatistica.verificata_sell + arrayStatistica.non_verificata_sell)) * 100).toFixed(1);

    arrayStatistica.percentuale_totale_giuste = (((arrayStatistica.verificata_buy + arrayStatistica.verificata_sell) / (arrayStatistica.verificata_buy + arrayStatistica.non_verificata_buy + arrayStatistica.verificata_sell + arrayStatistica.non_verificata_sell)) * 100).toFixed(1);

    return arrayStatistica;
}

async function analisi() {

    let timeseriesData;

    let actual_price;

    let orderBook;

    let dataWithIndicators;

    let datiAndamento;

    let nomiCripto = ["BTC" /*, "ETH", "BNB", "LUNA", "SOL", "AVAX"*/ ];

    console.log("DATE", new Date());

    for (let name of nomiCripto) {

        timeseriesData = await binance.futuresCandles(name + "USDT", "1m");

        timeseriesData = await getFuturesData(timeseriesData)

        //console.log(timeseriesData[timeseriesData.length - 1]);

        //timeseriesData = await getData('CRYPTO', 'INTRADAY_5_MIN', name, 'USD');

        const myArr = timeseriesData.map((v, i) => {
            return v.close;
        });

        //console.log("A", myArr);

        const percentageArr = myArr.map((v, i) => i === 0 ? 100 : Math.abs(100 - (v * 100 / myArr[i - 1])));
        percentageArr.shift();

        //console.log("B", percentageArr);

        const median = arr => {
            const mid = Math.floor(arr.length / 2),
                nums = [...arr].sort((a, b) => a - b);
            return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
        };

        let median_difference = median(percentageArr);

        //lo stop loss è il prezzo + (o -) la mediana della differenza percentuale degli ultimi 30 valori x 3 volte, 
        //come fosse una media di un minuto ripetuta per 3 minuti
        let stop_loss_percent = median_difference * 1.5;
        //nel take profit deve fermarsi alla mediana di 1 minuto, ma per ora uso il trailing stop
        let take_profit_percent = median_difference;
        //nel trailing stop deve tornare indietro al massimo di 1.2 volte la mediana del take profit per evitare correzioni
        let trailing_stop_percent = median_difference;

        console.log("VOLATILITA' PERCENTUALE MEDIANA SUL TIMEFRAME CORRENTE", median_difference);

        actual_price = await getMarketPrice(name);

        orderBook = await getOrderBook(name, actual_price);

        // console.log("ORDER BOOK PROMETTENTE", orderBook.trend);

        dataWithIndicators = await applyIndicators(timeseriesData);

        console.log(dataWithIndicators[dataWithIndicators.length - 1]);

        if (dataWithIndicators[dataWithIndicators.length - 1].azione === "BUY" && orderBook.trend === true) {
            console.log("LONG", stop_loss_percent, actual_price, trailing_stop_percent);
            if (binance_api_status === true) {
                binance_future_buy(name, 'USDT', 0, 0, stop_loss_percent, actual_price, trailing_stop_percent, take_profit_percent);
            }
        } else if (dataWithIndicators[dataWithIndicators.length - 1].azione === "SELL" && orderBook.trend === false) {
            console.log("SHORT", stop_loss_percent, actual_price, trailing_stop_percent);
            if (binance_api_status === true) {
                binance_future_sell(name, 'USDT', 0, 0, stop_loss_percent, actual_price, trailing_stop_percent, take_profit_percent);
            }
        } else {
            console.log("NIENTE")
        }

        datiAndamento = await analisiAndamento(dataWithIndicators);

        console.log("VALIDAZIONE BACKTESTING", datiAndamento);

    }


}

/* ---------------------- TIMES ------------------------------ */

const roundTo = roundTo => x => Math.round(x / roundTo) * roundTo;
const roundDownTo = roundTo => x => Math.floor(x / roundTo) * roundTo;
const roundUpTo = roundTo => x => Math.ceil(x / roundTo) * roundTo;


const roundUpTo1Minutes = roundUpTo(1000 * 60 * 1);
const roundUpTo5Minutes = roundUpTo(1000 * 60 * 5);
const roundUpTo15Minutes = roundUpTo(1000 * 60 * 15);
const roundUpTo30Minutes = roundUpTo(1000 * 60 * 30);
const roundUpTo60Minutes = roundUpTo(1000 * 60 * 60);


/* ----------------------------------------------------------- */

async function autoOneMinutes() {

    let next_minute_date = roundUpTo1Minutes(new Date()) + 1000;

    let current_date = Date.now();
    let wait_fist_time = next_minute_date - current_date;

    timeout = setTimeout(function() {
        analisi();
        interval = setInterval(function() {
            analisi();
        }, 60000);
    }, wait_fist_time);

    console.log('autoOneMinuteBackend wait_fist_time', wait_fist_time);
}

async function autoFiveMinutes() {

    let next_minute_date = roundUpTo5Minutes(new Date()) + 1000;

    let current_date = Date.now();
    let wait_fist_time = next_minute_date - current_date;

    timeout = setTimeout(function() {
        analisi();
        interval = setInterval(function() {
            analisi();
        }, 60000 * 5);
    }, wait_fist_time);

    console.log('autoFiveMinuteBackend wait_fist_time', wait_fist_time);
}


initializeBinanceAPI();

autoOneMinutes();

//analisi();