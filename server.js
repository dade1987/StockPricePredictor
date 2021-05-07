

const http = require('http');
const https = require('https');

const express = require('express');
const socketio = require('socket.io');
const tf = require('@tensorflow/tfjs-node');

const SMA = require('technicalindicators').SMA;
const MACD = require('technicalindicators').MACD;
const RSI = require('technicalindicators').RSI;
const Stochastic = require('technicalindicators').Stochastic;

/* global tf, tfvis, process */



const PORT = process.env.PORT || 3000;

const INDEX = '/index.html';

const server = express()
        .use((req, res) => res.sendFile(INDEX, {root: __dirname}))
        .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketio(server);


io.on('connection', (socket) => {
    socket.on('test_data', (value) => {
        console.log("connection");
    });

    socket.on('predict', async (arg) => {
        console.log('received predict request');

        let parameters = JSON.parse(arg);

        console.log(parameters);

        await main(parameters.crypto_name, parseInt(parameters.time_steps), parseInt(parameters.epochs_number), parameters.training_enabled);
    });
});

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);


async function getData(crypto_name) {

//QOUA4VUTZJXS3M01

    return new Promise((resolve, reject) => {

        /* EUR USD */
        /*let url = 'https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=EUR&to_symbol=USD&interval=1min&outputsize=full&apikey=QOUA4VUTZJXS3M01';*/

        /* S&P 500 */
        /*url = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SP&interval=5min&outputsize=full&apikey=QOUA4VUTZJXS3M01';*/

        /* sentimento sull'attrattivit� della valuta o la fragilit� del momento */
        /* https://www.alphavantage.co/query?function=CRYPTO_RATING&symbol=BTC&apikey=QOUA4VUTZJXS3M01 */


        /*prova con 5 timeseries (minuti in questo caso), 20 epochs . err 0.0005. previsione tra 5 minuti */
        let url = 'https://www.alphavantage.co/query?function=CRYPTO_INTRADAY&symbol=' + crypto_name + '&market=USD&interval=1min&outputsize=full&apikey=QOUA4VUTZJXS3M01';



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

                let rawData = Object.values(json_data["Time Series Crypto (1min)"]).map(d => ({open: parseFloat(d["1. open"]), high: parseFloat(d["2. high"]), low: parseFloat(d["3. low"]), close: parseFloat(d["4. close"]), volume: parseFloat(d["5. volume"])}));
                resolve(rawData.reverse());


            });
        });

        req.on('error', function (e) {
            console.log(e.message);
        });


    });
}

function prepareInputDatas(data, time_steps, b_test) {

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


                /* attualmente aderisce molto meglio evitando di usare gli indicatori - per lo meno assieme, impara meglio etc */
                return Object.values(d);/*.slice(0, 6);*/

                /*[d.open, d.high, d.low, d.close, d.sma, d.rsi, d.macd_macd, d.macd_signal, d.macd_histogram,d.stochastic_k,d.stochastic_k];*/

            }));

        }

        return arr;
    } else
    {
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

    } else
    {
        return false;
    }
}

let prices_min = 0;
let prices_max = 0;

function normalizza_dati(data) {

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
        return {
            open: (d.open - prices_min) / (prices_max - prices_min), high: (d.high - prices_min) / (prices_max - prices_min),
            low: (d.low - prices_min) / (prices_max - prices_min), close: (d.close - prices_min) / (prices_max - prices_min),
            volume: (d.volume - volume_min) / (volume_max - volume_min),
            sma: (d.sma - sma_min) / (sma_max - sma_min), rsi: (d.rsi - rsi_min) / (rsi_max - rsi_min),
            stochastic_k: (d.stochastic_k - stochastic_min) / (stochastic_max - stochastic_min), stochastic_d: (d.stochastic_d - stochastic_min) / (stochastic_max - stochastic_min),
            macd_macd: (d.macd_macd - macd_min) / (macd_max - macd_min),
            macd_signal: (d.macd_signal - macd_min) / (macd_max - macd_min),
            macd_histogram: (d.macd_histogram - macd_min) / (macd_max - macd_min)
        };
    });

    return finale;

}



async function train_data(data, time_steps, epochs_number, training_enabled) {

    /* applica indicatori */
    let rsi = RSI.calculate({period: 7, values: data.map(d => d.close)});
    let sma = SMA.calculate({period: 7, values: data.map(d => d.close)});
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

    /* tagliati giusti e testati uno ad uno, compresa istruzione seguente */
    data = data.slice(33);

    data = normalizza_dati(data);


    /* sometimes Chrome crashes and you need to open a new window */

    const size = Math.floor(data.length / 100 * 98);

    /* lasciare così per fare daily FX, 14 giorni è il timestep piu usato dai trader */
    /* const time_steps = 14;
     const epochs_number = 10;*/

    const predict_size = data.length - size;

    const start = data.length - size - predict_size;

    const input = prepareInputDatas(data.slice(start, start + size), time_steps);
    const output = prepareOutputDatas(data.slice(start, start + size), time_steps);


    const testing = prepareInputDatas(data.slice(start + size, start + size + predict_size), time_steps, true);
    const testingResults = prepareOutputDatas(data.slice(start + size, start + size + predict_size), time_steps);

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
    /*const trainingDataMax = trainingData.max();
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


    console.log("Training enabled: " + training_enabled + "" + (training_enabled === true) + (training_enabled == true));

    let model = null;

    if (training_enabled == true) {

        /* creating model */
        model = tf.sequential();

        /* il miglior modello finora ,sennò c'è lstm,lstm,dense,dense sempre con sto adam ecc*/

        model.add(tf.layers.lstm({inputShape: [input_size_2, input_size], units: Math.floor(input_size_3 / (2 * ((input_size_2 * input_size) + 1))), returnSequences: true}));

        /* 4% di dropout */
        model.add(tf.layers.dropout({rate: 0.04}));

        //questa è una formula per calcolare il numero giusto di neuroni da usare nel layer nascosto
        model.add(tf.layers.lstm({units: Math.floor(input_size_3 / (2 * ((input_size_2 * input_size) + 1))), returnSequences: false}));

        model.add(tf.layers.dropout({rate: 0.04}));

        model.add(tf.layers.dense({units: 1}));



        model.summary();


        /* setting training */
        /* bisogna stare attenti ad evitare il rimbalzo dopo la correzione 
         * così basso è meglio perchè rimbalza poco nell'ambito dei miei prezzi 
         * e mettendo meno diventa troppo basso e non impara niente (TESTATO)*/
        let learningRate = 0.001;

        /* selecting the best training optimizer */
        const optimizer = tf.train.adam(learningRate);
        //const optimizer = tf.train.rmsprop(learningRate, 0.95);

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
            let res = await model.fit(trainingData, outputData, {epochs: 1});
            console.log(`Iteration ${i + 1}: ${res.history.loss[0] }`);

        }

        /* credo che qui convenga salvare un modello con nome fisso dall hard disk tipo con model.save o simili */
        await model.save('file:///app/DadeModel');

        /* training prediction (validation) */

        const validation = model.predict(trainingData);

        /*const unNormValidation = validation
         .mul(outputDataMax.sub(outputDataMin))
         .add(outputDataMin).dataSync();*/

        const unNormValidation = validation.dataSync();

        const trainingResults = output.map((d, i) => {
            if (d) {
                return {
                    x: i, y: d * (prices_max - prices_min) + prices_min
                };
            }
        });
        const trainingValidation = Array.from(unNormValidation).map((d, i) => {
            if (d) {
                return {
                    x: i, y: d * (prices_max - prices_min) + prices_min
                };
            }
        });

        io.emit('training', JSON.stringify([trainingResults, trainingValidation]));

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

    } else {

        /* da sostituire con model.load ad esempio */
        model = await tf.loadLayersModel('file:///app/DadeModel.json');

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
                x: i, y: d * (prices_max - prices_min) + prices_min
            };
        }
    });
    const predictions = Array.from(unNormPredictions).map((d, i) => {
        if (d) {
            return {
                x: i, y: d * (prices_max - prices_min) + prices_min
            };
        }
    });

    /*console.log("INPUT", testing);
     
     
     console.log("OUTPUT", realResults);
     
     console.log("PREDICTIONS", predictions);*/


    setTimeout(() => io.emit('testing', JSON.stringify([realResults, predictions])), 1500);

    let crescita = 0;

    let giusti = 0;
    let errori = 0;
    let pari = 0;

    for (let i = 1; i < realResults.length; i++) {

        if (parseFloat(realResults[i].y) > parseFloat(realResults[i - 1].y) && parseFloat(predictions[i].y) > parseFloat(predictions[i - 1].y)) {
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

    let temp_testingData = [...testing];

    temp_testingData.pop();

    //Attenzione: evaluate torna un tensore di accuratezza PER OGNI loss e metrica impostate nel modello
    //Quindi la funzione Print() va solo su un tensore alla volta, altrimenti da undefined
    const testingAccuracy = model.evaluate(tf.tensor3d(temp_testingData, [temp_testingData.length, testing_size_2, testing_size]), outputTestingData);


    const testingAccuracyDataSync = testingAccuracy[1].dataSync();
    const testingAccuracyArray = Array.from(testingAccuracyDataSync);

    console.log("TESTING ACCURACY", testingAccuracyArray);



    console.log("CRESCITA", crescita, giusti, errori, pari);

    setTimeout(() => io.emit('final', JSON.stringify([crescita, giusti, errori, pari, testingAccuracyArray])), 3000);
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

async function main(crypto_name, time_steps, epochs_number, training_enabled) {
    const data = await getData(crypto_name);
    await train_data(data, time_steps, epochs_number, training_enabled);

}

