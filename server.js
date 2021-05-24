console.log(process.cwd());

console.log(__dirname);

const http = require('http');
const https = require('https');

const express = require('express');

const socketio = require('socket.io');
const tf = require('@tensorflow/tfjs-node');


const SMA = require('technicalindicators').SMA;
const MACD = require('technicalindicators').MACD;
const RSI = require('technicalindicators').RSI;
const Stochastic = require('technicalindicators').Stochastic;

const router = express.Router();
const app = express();

/* global tf, tfvis, process, __dirname */



const PORT = process.env.PORT || 3000;

const INDEX = '/index.html';

const server = express()
        .get('/', function (req, res) {
            res.sendfile("index.html");
        })
        .get('/admin', function (req, res) {
            res.sendfile("index_modificabile.html");
        }).get('/banner', function (req, res) {
            res.sendfile("banner.jpg");
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

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);


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


        let url = 'https://www.alphavantage.co/query?function=' + market_name_url + '&' + symbol_name_1 + '=' + currency_pair_1 + '&' + symbol_name_2 + '=' + currency_pair_2 + '' + interval + '&outputsize=full&apikey=QOUA4VUTZJXS3M01';

        console.log("URL", url);

        let req = https.get(url, function (res) {
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
                            rawData = Object.values(json_data[json_data_name]).map(d => ({
                                    open: parseFloat(d["1. open"]),
                                    high: parseFloat(d["2. high"]),
                                    low: parseFloat(d["3. low"]),
                                    close: parseFloat(d["4. close"]),
                                    volume: parseFloat(d["5. volume"])
                                }));
                        } else {
                            rawData = Object.values(json_data[json_data_name]).map(d => ({
                                    open: parseFloat(d["1b. open (USD)"]),
                                    high: parseFloat(d["2b. high (USD)"]),
                                    low: parseFloat(d["3b. low (USD)"]),
                                    close: parseFloat(d["4b. close (USD)"]),
                                    volume: parseFloat(d["5. volume"])
                                }));

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

        req.on('error', function (e) {
            console.log(e.message);
        });


    });
}

function prepareInputDatas(data, time_steps, b_test, market_name) {

    let test = 0;
    if (b_test === true) {
        test = 1;
    }

    /* if the date is major then time steps */
    if (data.length > time_steps) {

        let arr = new Array();

        for (let i = 0; i < data.length - time_steps + test; i++) {


            /* create the training or testing array, with x values (features) and batch size (batch size is the samples' first dimension of array) */
            arr.push(data.slice(i, i + time_steps).map(d => {


                /* ATTENZIONE. INDICATORI DISABILITATI NEL TRAINING */

                /* attualmente aderisce molto meglio evitando di usare gli indicatori - per lo meno assieme, impara meglio etc */
                /*return Object.values(d);//.slice(0, 6);*/
                switch (market_name) {
                    case "CRYPTO":
                        /* le crypto hanno anche il volume */
                        /* solo close, volume per le cripto e stocastico. prima facevo invece open high low close vol e stocastici (crescita 9 il 19/05/2021) */
                        /* meglio tenerli cosi. facendo come prima mi da crescita a -3 e aderiscono peggio */
                        /*aggiunto indicatore RSI (molto meglio:Crescita: 9 Giusti: 47 Errori: 38 Pari: 0)*/
                        //con RSI e Stoch solamente
                        //return [].concat(Object.values(d).slice(0, 5), Object.values(d).slice(6, 7), Object.values(d).slice(7, 9));
                        return [].concat(Object.values(d).slice(0, 5), Object.values(d).slice(6));
                        //con tutto
                        break;
                    case "FOREX":
                        /*
                         * 
                         TEST DAILY EURUSD
                         
                         * sempre 14steps-10epochs LTSM mixed
                         
                         return [].concat(Object.values(d).slice(3, 4), Object.values(d).slice(7,10));
                         crescita 8 121 113
                         
                         return [].concat(Object.values(d).slice(3, 4), Object.values(d).slice(7));
                         crescita 8 121 113
                         
                         return [].concat(Object.values(d).slice(3, 4), Object.values(d).slice(6));
                         6-8
                         
                         //open escluso e con tutti gli indicatori (risultato migliore)
                         return [].concat(Object.values(d).slice(1, 4), Object.values(d).slice(6));
                         10 Buono
                         
                         //l'open disturba la statistica
                         return [].concat(Object.values(d).slice(0, 4), Object.values(d).slice(6));
                         4
                         */

                        /*14 steps
                         
                         10 epochs
                         10 crescita
                         
                         15 epochs
                         16 crescita
                         
                         20 epochs
                         6 crescita
                         
                         
                         
                         13 epochs
                         8 crescita
                         
                         17 epochs
                         0*/



                        /*7 steps
                         crescita 7
                         
                         28 steps
                         crescita 8*/

                        /* nell EURGBP il 14 15 non � molto predittivo */

                        /*usando sma crescita 4 invece di 14*/
                        return [].concat(Object.values(d).slice(1, 4), Object.values(d).slice(6));

                        break;
                }


                /*[d.open, d.high, d.low, d.close, d.volume, d.sma, d.rsi, d.macd_macd, d.macd_signal, d.macd_histogram,d.stochastic_k,d.stochastic_k];*/

            }));

        }

        //input elements (high,low,close,sma,ecc...)
        //console.log(arr);

        return arr;
    } else {
        return false;
    }

}

function prepareOutputDatas(data, time_steps) {

    if (data.length > time_steps) {

        let arr = new Array();

        /* create output training set (or testing values) (y values) */
        for (let i = time_steps; i < data.length; i++) {

            arr.push(data[i].close);


        }

        return arr;

    } else {
        return false;
    }
}

let prices_min = 0;
let prices_max = 0;

function normalizza_dati(data) {

    console.log("DATA", data[0]);

    //prima deve calcolare massimi e minimi
    prices_min = Math.min.apply(null, data.map(function (d) {
        return Math.min.apply(null, [d.open, d.high, d.low, d.close]);
    }));
    prices_max = Math.max.apply(null, data.map(function (d) {
        return Math.max.apply(null, [d.open, d.high, d.low, d.close]);
    }));

    let volume_min = Math.min.apply(null, data.map(function (d) {
        return d.volume;
    }));

    let volume_max = Math.max.apply(null, data.map(function (d) {
        return d.volume;
    }));


    let sma_min = Math.min.apply(null, data.map(function (d) {
        return d.sma;
    }));

    let sma_max = Math.max.apply(null, data.map(function (d) {
        return d.sma;
    }));


    let rsi_min = Math.min.apply(null, data.map(function (d) {
        return d.rsi;
    }));

    let rsi_max = Math.max.apply(null, data.map(function (d) {
        return d.rsi;
    }));

    let stochastic_min = Math.min.apply(null, data.map(function (d) {
        return Math.min.apply(null, [d.stochastic_k, d.stochastic_d]);
    }));

    let stochastic_max = Math.max.apply(null, data.map(function (d) {
        return Math.max.apply(null, [d.stochastic_k, d.stochastic_d]);
    }));

    let macd_min = Math.min.apply(null, data.map(function (d) {
        return Math.min.apply(null, [d.macd_macd, d.macd_signal, d.macd_histogram]);
    }));

    let macd_max = Math.max.apply(null, data.map(function (d) {
        return Math.max.apply(null, [d.macd_macd, d.macd_signal, d.macd_histogram]);
    }));

    /*let macd_macd_max = 0;
     let macd_macd_min = 0;
     
     let macd_signal_max = 0;        
     let macd_signal_min = 0;
     
     let macd_histogram_max = 0;
     let macd_histogram_min = 0;*/



    let finale = data.map(function (d) {
        let volumeTemp = (d.volume - volume_min) / (volume_max - volume_min);
        if (isNaN(volumeTemp)) {
            volumeTemp = 0;
        }
        return {
            open: (d.open - prices_min) / (prices_max - prices_min),
            high: (d.high - prices_min) / (prices_max - prices_min),
            low: (d.low - prices_min) / (prices_max - prices_min),
            close: (d.close - prices_min) / (prices_max - prices_min),
            volume: volumeTemp,
            sma: (d.sma - sma_min) / (sma_max - sma_min),
            rsi: (d.rsi - rsi_min) / (rsi_max - rsi_min),
            stochastic_k: (d.stochastic_k - stochastic_min) / (stochastic_max - stochastic_min),
            stochastic_d: (d.stochastic_d - stochastic_min) / (stochastic_max - stochastic_min),
            macd_macd: (d.macd_macd - macd_min) / (macd_max - macd_min),
            macd_signal: (d.macd_signal - macd_min) / (macd_max - macd_min),
            macd_histogram: (d.macd_histogram - macd_min) / (macd_max - macd_min)
        };
    });

    console.log("FINALE", finale);

    return finale;

}



async function train_data(data, time_steps, epochs_number, training_enabled, market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, socket) {

    /* applica indicatori */
    let rsi = RSI.calculate({
        period: 7,
        values: data.map(d => d.close)
    });
    let sma = SMA.calculate({
        period: 7,
        values: data.map(d => d.close)
    });
    let macd = MACD.calculate({
        values: data.map(d => d.close),
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });


    let stochastic = Stochastic.calculate({
        high: data.map(d => d.high),
        low: data.map(d => d.low),
        close: data.map(d => d.close),
        period: 14,
        signalPeriod: 3
    });

    for (let i = 0; i < data.length; i++) {
        data[i].sma = 0;
        data[i].rsi = 0;
        data[i].macd_macd = 0;
        data[i].macd_signal = 0;
        data[i].macd_histogram = 0;
        data[i].stochastic_k = 0;
        data[i].stochastic_d = 0;
    }

    let d = 0;
    for (let i = 7; i < data.length; i++) {
        data[i].rsi = rsi[d];
        d++;
    }

    d = 0;
    for (let i = 6; i < data.length; i++) {
        data[i].sma = sma[d];
        d++;
    }

    d = 0;
    for (let i = 13; i < data.length; i++) {
        data[i].stochastic_k = stochastic[d].k;
        data[i].stochastic_d = stochastic[d].d;
        d++;
    }

    d = 0;
    for (let i = 25; i < data.length; i++) {
        data[i].macd_macd = macd[d].MACD;
        data[i].macd_signal = macd[d].signal;
        data[i].macd_histogram = macd[d].histogram;
        d++;
    }


    console.log("TRAIN DATA 0", data[0]);


    /* tagliati giusti e testati uno ad uno, compresa istruzione seguente */
    data = data.slice(33);

    console.log("TRAIN DATA 1", data[0]);

    data = normalizza_dati(data);

    console.log("TRAIN DATA 2", data[0]);
    /* sometimes Chrome crashes and you need to open a new window */

    /* test sul 10% di dati */
    const size = Math.floor(data.length / 100 * 95);

    /* lasciare così per fare daily FX, 14 giorni è il timestep piu usato dai trader */
    /* const time_steps = 14;
     const epochs_number = 10;*/

    const predict_size = data.length - size;

    const start = data.length - size - predict_size;

    const input = prepareInputDatas(data.slice(start, start + size), time_steps, false, market_name);
    const output = prepareOutputDatas(data.slice(start, start + size), time_steps);




    const testing = prepareInputDatas(data.slice(start + size, start + size + predict_size), time_steps, true, market_name);
    const testingResults = prepareOutputDatas(data.slice(start + size, start + size + predict_size), time_steps);


    console.log("INPUT", input[0]);
    /*console.log("OUTPUT", output);
     console.log("TESTING", testing);
     console.log("TESTINGRESULTS", testingResults); * /
     
     
     /* Creating tensors (input 3d tensor, and output 1d tensor) */

    const input_size_3 = input.length;
    const input_size_2 = input[0].length;
    const input_size = input[0][0].length;

    const trainingData = tf.tensor3d(input, [input.length, input_size_2, input_size]);
    const outputData = tf.tensor1d(output);

    const testing_size_3 = testing.length;
    const testing_size_2 = testing[0].length;
    const testing_size = testing[0][0].length;

    const testingData = tf.tensor3d(testing, [testing.length, testing_size_2, testing_size]);
    const outputTestingData = tf.tensor1d(testingResults);


    /* normalizing datas */
    /* const trainingDataMax = trainingData.max();
     const trainingDataMin = trainingData.min();
     
     const testingDataMax = testingData.max();
     const testingDataMin = testingData.min();
     
     const outputDataMax = outputData.max();
     const outputDataMin = outputData.min();
     
     const outputTestingDataMax = outputTestingData.max();
     const outputTestingDataMin = outputTestingData.min();
     
     const normalizedTrainingData = trainingData.sub(trainingDataMin).div(trainingDataMax.sub(trainingDataMin));
     const normalizedTestingData = testingData.sub(testingDataMin).div(testingDataMax.sub(testingDataMin));
     
     const normalizedOutputData = outputData.sub(outputDataMin).div(outputDataMax.sub(outputDataMin));
     const normalizedTestingOutputData = outputTestingData.sub(outputTestingDataMin).div(outputTestingDataMax.sub(outputTestingDataMin));*/


    console.log("Training enabled: " + training_enabled + " " + (training_enabled === true) + " " + (training_enabled == true));

    let model = null;

    /* setting training */
    /* bisogna stare attenti ad evitare il rimbalzo dopo la correzione 
     * così basso è meglio perchè rimbalza poco nell'ambito dei miei prezzi 
     * e mettendo meno diventa troppo basso e non impara niente (TESTATO)*/
    let learningRate = 0.001;

    /* selecting the best training optimizer */
    const optimizer = tf.train.adam(learningRate);
    //const optimizer = tf.train.rmsprop(learningRate, 0.95);

    if (training_enabled == true) {

        try {
            model = await tf.loadLayersModel('file://' /*+ new Date().toISOString().slice(0, 10)*/ + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '/model.json')

            console.log("LOAD MODEL", 'file://' /*+ new Date().toISOString().slice(0, 10)*/ + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '/model.json');

            model.summary();

            /* compiling model with optimizer, loss and metrics */
            /* meglio con queste 2 loss assieme, oppure con meanabsolute */
            model.compile({

                optimizer: optimizer,
                loss: tf.losses.meanSquaredError,
                metrics: [tf.losses.meanSquaredError] /*[tf.metrics.meanAbsoluteError, tf.losses.meanSquaredError]*/

            });

            /* in caso di errore */
        } catch (e) {


            /* creating model */
            model = tf.sequential();

            /* il miglior modello finora ,sennò c'è lstm,lstm,dense,dense sempre con sto adam ecc*/

            model.add(tf.layers.lstm({
                inputShape: [input_size_2, input_size],
                units: Math.floor(input_size_3 / (2 * ((input_size_2 * input_size) + 1))),
                returnSequences: true
            }));

            /* 4% di dropout */
            model.add(tf.layers.dropout({
                rate: 0.04
            }));

            //questa è una formula per calcolare il numero giusto di neuroni da usare nel layer nascosto
            model.add(tf.layers.lstm({
                units: Math.floor(input_size_3 / (2 * ((input_size_2 * input_size) + 1))),
                returnSequences: false
            }));

            model.add(tf.layers.dropout({
                rate: 0.04
            }));

            model.add(tf.layers.dense({
                units: 1
            }));



            model.summary();




            /* compiling model with optimizer, loss and metrics */
            /* meglio con queste 2 loss assieme, oppure con meanabsolute */
            model.compile({

                optimizer: optimizer,
                loss: tf.losses.meanSquaredError,
                metrics: [tf.losses.meanSquaredError] /*[tf.metrics.meanAbsoluteError, tf.losses.meanSquaredError]*/

            });


            /* training ... */
            console.log('Loss Log');

            for (let i = 0; i < epochs_number; i++) {
                let res = await model.fit(trainingData, outputData, {
                    epochs: 1
                });
                console.log(`Iteration ${i + 1}: ${res.history.loss[0] }`);

            }

            /* credo che qui convenga salvare un modello con nome fisso dall hard disk tipo con model.save o simili */
            await model.save('file://' /*+ new Date().toISOString().slice(0, 10)*/ + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '');

            console.log("SAVE MODEL", 'file://' /*+ new Date().toISOString().slice(0, 10)*/ + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '');

            /* training prediction (validation) */

            const validation = model.predict(trainingData);

            /*const unNormValidation = validation
             .mul(outputDataMax.sub(outputDataMin))
             .add(outputDataMin).dataSync();*/

            const unNormValidation = validation.dataSync();

            const trainingResults = output.map((d, i) => {
                if (d) {
                    return {
                        x: i,
                        y: d * (prices_max - prices_min) + prices_min
                    };
                }
            });
            const trainingValidation = Array.from(unNormValidation).map((d, i) => {
                if (d) {
                    return {
                        x: i,
                        y: d * (prices_max - prices_min) + prices_min
                    };
                }
            });

            /* non serve saperlo per forza */
            socket.emit('training', JSON.stringify([trainingResults, trainingValidation]));

            /* creating training chart */

            /*tfvis.render.linechart(
             {name: 'Validation Results'},
             {values: [trainingResults, trainingValidation], series: ['original', 'predicted']},
             {
             xLabel: 'contatore',
             yLabel: 'prezzo',
             height: 300,
             zoomToFit: true
             }
             );*/
        }



    } else {

        /* da sostituire con model.load ad esempio */
        model = await tf.loadLayersModel('file://' /* + new Date().toISOString().slice(0, 10)*/ + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '/model.json');

        console.log("LOAD MODEL", 'file://' /* + new Date().toISOString().slice(0, 10)*/ + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '/model.json');

        model.summary();

        /* compiling model with optimizer, loss and metrics */
        /* meglio con queste 2 loss assieme, oppure con meanabsolute */
        model.compile({

            optimizer: optimizer,
            loss: tf.losses.meanSquaredError,
            metrics: [tf.losses.meanSquaredError] /*[tf.metrics.meanAbsoluteError, tf.losses.meanSquaredError]*/

        });

    }


    /* predicting */

    console.log('Real prediction');



    const preds = model.predict(testingData);

    /*const unNormPredictions = preds
     .mul(outputTestingDataMax.sub(outputTestingDataMin))
     .add(outputTestingDataMin).dataSync();*/

    const unNormPredictions = preds.dataSync();

    const realResults = testingResults.map((d, i) => {
        if (d) {
            return {
                x: i,
                y: d * (prices_max - prices_min) + prices_min
            };
        }
    });
    const predictions = Array.from(unNormPredictions).map((d, i) => {
        if (d) {
            return {
                x: i,
                y: d * (prices_max - prices_min) + prices_min
            };
        }
    });

    /*console.log("INPUT", testing);
     
     
     console.log("OUTPUT", realResults);
     
     console.log("PREDICTIONS", predictions);*/


    setTimeout(() => socket.emit('testing', JSON.stringify([realResults, predictions])), 1500);



    let {
        crescita,
        giusti,
        errori,
        pari,
        importo_take_profit,
        tipo_negoziazione,
        importo_attuale,
        percentuale_take_profit
    } = simulazione_guadagni(realResults, predictions, data.slice(start + size, start + size + predict_size));


    let temp_testingData = [...testing];

    temp_testingData.pop();

    //Attenzione: evaluate torna un tensore di accuratezza PER OGNI loss e metrica impostate nel modello
    //Quindi la funzione Print() va solo su un tensore alla volta, altrimenti da undefined
    const testingAccuracy = model.evaluate(tf.tensor3d(temp_testingData, [temp_testingData.length, testing_size_2, testing_size]), outputTestingData);


    const testingAccuracyDataSync = testingAccuracy[1].dataSync();
    const testingAccuracyArray = Array.from(testingAccuracyDataSync);

    console.log("TESTING ACCURACY", testingAccuracyArray);



    console.log("CRESCITA", crescita, giusti, errori, pari);

    setTimeout(() => socket.emit('final', JSON.stringify([crescita, giusti, errori, pari, testingAccuracyArray, importo_take_profit, tipo_negoziazione, importo_attuale, percentuale_take_profit])), 3000);
    /* creating prediction chart */
    /*tfvis.render.linechart(
     {name: 'Real Predictions'},
     {values: [realResults, predictions], series: ['original', 'predicted']},
     {
     xLabel: 'contatore',
     yLabel: 'prezzo',
     height: 300,
     zoomToFit: true
     }
     );*/





}

function simulazione_guadagni(realResults, predictions, data) {
    let crescita = 0;
    let giusti = 0;
    let errori = 0;
    let pari = 0;
    let percentuale_take_profit = 0;
    let importo_take_profit = 0;
    let tipo_negoziazione = "";
    let importo_attuale = 0;


    for (let i = 1; i <= realResults.length; i++) {

        if (realResults[i] === undefined && parseFloat(predictions[i].y) > parseFloat(predictions[i - 1].y)) {


            importo_attuale = realResults[i - 1].y;
            percentuale_take_profit = Math.abs(((((parseFloat(predictions[i].y) / parseFloat(predictions[i - 1].y) - 1) * 100))));
            tipo_negoziazione = "BUY";
            importo_take_profit = (parseFloat(importo_attuale) + (importo_attuale / 100 * percentuale_take_profit));

            console.log(tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);

        } else if (realResults[i] === undefined && parseFloat(predictions[i].y) < parseFloat(predictions[i - 1].y)) {

            importo_attuale = realResults[i - 1].y;
            percentuale_take_profit = Math.abs(((((parseFloat(predictions[i].y) / parseFloat(predictions[i - 1].y) - 1) * 100))));
            tipo_negoziazione = "SELL";
            importo_take_profit = (parseFloat(importo_attuale) - (importo_attuale / 100 * percentuale_take_profit));

            console.log(tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);

        } else if (realResults[i] === undefined && parseFloat(predictions[i].y) === parseFloat(predictions[i - 1].y)) {

            importo_attuale = realResults[i - 1].y;
            percentuale_take_profit = 0;
            tipo_negoziazione = "NOTHING";
            importo_take_profit = importo_attuale;

            console.log(tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);


        } else if (parseFloat(realResults[i].y) > parseFloat(realResults[i - 1].y) && parseFloat(predictions[i].y) > parseFloat(predictions[i - 1].y)) {

            giusti++;
            crescita++;

        } else if (parseFloat(realResults[i].y) < parseFloat(realResults[i - 1].y) && parseFloat(predictions[i].y) < parseFloat(predictions[i - 1].y)) {

            giusti++;
            crescita++;

        } else if (parseFloat(realResults[i].y) === parseFloat(realResults[i - 1].y) && parseFloat(predictions[i].y) === parseFloat(predictions[i - 1].y)) {
            pari++;

        } else {

            errori++;
            crescita--;

        }
    }

    return {
        crescita,
        giusti,
        errori,
        pari,
        importo_take_profit,
        tipo_negoziazione,
        importo_attuale,
        percentuale_take_profit
    };

}
/*data are real data referred to testing results*/
function simulazione_guadagni_2(realResults, predictions, data) {
    let crescita = 0;
    let giusti = 0;
    let errori = 0;
    let pari = 0;

    let guadagno_totale = 1000;
    let leva = 1;
    let perdita_max = 5.5;
    /*strategia eurusd
     * chiusi le transazioni aperte il giorno dopo alla stessa ora
     * fermi lo stop loss a 16.5% di perdita massima, che � 1/3 della volatilit� media giornaliera
     * 
     * attenzione: i pip di commissione non sono calcolati perch� dipendono dal broker
     * ed � calcolato sul reinvestire ogni giorno che lo propone l'intera somma a disposizione + i guadagni fatti la volta prima
     
     *per vedere se � stata chiusa bisogna vedere i punti pi� bassi per�
     **/

    for (let i = 1; i <= realResults.length; i++) {

        if (parseFloat(realResults[i].y) > parseFloat(realResults[i - 1].y) && parseFloat(predictions[i].y) > parseFloat(predictions[i - 1].y)) {

            let percentuale_perdita = Math.min(Math.abs(((parseFloat(data[i].low) / parseFloat(data[i].open) - 1) * 100) * leva), perdita_max);

            if (percentuale_perdita >= perdita_max) {
                console.log("STOP LOSS BUY", guadagno_totale, "-", percentuale_perdita.toFixed(2), "%", "IMPORTO", (guadagno_totale / 100 * percentuale_perdita).toFixed(2));
                if (percentuale_perdita !== 0) {
                    guadagno_totale = guadagno_totale - (guadagno_totale / 100 * percentuale_perdita);
                }
                if (guadagno_totale <= 0) {
                    guadagno_totale = 0;
                }
                console.log("SALDO", guadagno_totale.toFixed(2));

                errori++;
                crescita--;
            } else {

                let percentuale_aumento = Math.abs(((((parseFloat(realResults[i].y) / parseFloat(realResults[i - 1].y) - 1) * 100) * leva)));

                console.log("GUADAGNO IN BUY", guadagno_totale, "+", percentuale_aumento.toFixed(2), "%", "IMPORTO", (guadagno_totale / 100 * percentuale_aumento).toFixed(2));


                guadagno_totale = guadagno_totale + (guadagno_totale / 100 * percentuale_aumento);
                if (guadagno_totale <= 0) {
                    guadagno_totale = 0;
                }
                console.log("SALDO", guadagno_totale.toFixed(2));
                giusti++;
                crescita++;
            }
        } else if (parseFloat(realResults[i].y) < parseFloat(realResults[i - 1].y) && parseFloat(predictions[i].y) < parseFloat(predictions[i - 1].y)) {

            let percentuale_perdita = Math.min(Math.abs(((parseFloat(data[i].low) / parseFloat(data[i].open) - 1) * 100) * leva), perdita_max);

            if (percentuale_perdita >= perdita_max) {
                console.log("STOP LOSS SELL", guadagno_totale, "-", percentuale_perdita.toFixed(2), "%", "IMPORTO", (guadagno_totale / 100 * percentuale_perdita).toFixed(2));
                if (percentuale_perdita !== 0) {
                    guadagno_totale = guadagno_totale - (guadagno_totale / 100 * percentuale_perdita);
                }
                if (guadagno_totale <= 0) {
                    guadagno_totale = 0;
                }
                console.log("SALDO", guadagno_totale.toFixed(2));

                errori++;
                crescita--;
            } else {
                let percentuale_aumento = Math.abs(((((parseFloat(realResults[i].y) / parseFloat(realResults[i - 1].y) - 1) * 100) * leva)));

                console.log("GUADAGNO IN SELL", guadagno_totale, "+", percentuale_aumento.toFixed(2), "%", "IMPORTO", (guadagno_totale / 100 * percentuale_aumento).toFixed(2));

                guadagno_totale = guadagno_totale + (guadagno_totale / 100 * percentuale_aumento);
                if (guadagno_totale <= 0) {
                    guadagno_totale = 0;
                }
                console.log("SALDO", guadagno_totale.toFixed(2));
                giusti++;
                crescita++;
            }
        } else if (parseFloat(realResults[i].y) === parseFloat(realResults[i - 1].y) && parseFloat(predictions[i].y) === parseFloat(predictions[i - 1].y)) {
            pari++;
        } else {

            let percentuale_perdita = Math.min(Math.abs((((parseFloat(realResults[i].y) / parseFloat(realResults[i - 1].y) - 1) * 100) * leva)), perdita_max);

            console.log("PERDITA", guadagno_totale, "-", percentuale_perdita.toFixed(2), "%", "IMPORTO", (guadagno_totale / 100 * percentuale_perdita).toFixed(2));
            if (percentuale_perdita !== 0) {
                guadagno_totale = guadagno_totale - (guadagno_totale / 100 * percentuale_perdita);
            }
            if (guadagno_totale <= 0) {
                guadagno_totale = 0;
            }
            console.log("SALDO", guadagno_totale.toFixed(2));

            errori++;
            crescita--;
        }
    }

    console.log("GUADAGNO TOTALE CON 1000 EURO LEVA x" + leva, guadagno_totale - 1000);

    return {
        crescita,
        giusti,
        errori,
        pari
    };

}

async function main(market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, training_enabled, socket) {

    const data = await getData(market_name, time_interval, currency_pair_1, currency_pair_2);

    console.log("RAW DATA", data[0]);


    await train_data(data, time_steps, epochs_number, training_enabled, market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, socket);

}