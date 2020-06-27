const http = require('http');
const https = require('https');
const socketio = require('socket.io');
const tf = require('@tensorflow/tfjs');

const SMA = require('technicalindicators').SMA;
const MACD = require('technicalindicators').MACD;
const RSI = require('technicalindicators').RSI;


/* global tf, tfvis */

const server = http.createServer();
const io = socketio(server);

//porta 3000
const port = 8001;
server.listen(port, () => {
    console.log(`Running socket on port: ${port}`);
});

io.on('connection', (socket) => {
    socket.on('test_data', (value) => {
        console.log("connection");
    });

    socket.on('predict', async () => {
        console.log('received predict request');
        io.emit('predictResult', await main());
    });
});

async function getData() {

//QOUA4VUTZJXS3M01

    return new Promise((resolve, reject) => {

        const url = 'https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=EUR&to_symbol=USD&interval=1min&outputsize=full&apikey=QOUA4VUTZJXS3M01';

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

                let rawData = Object.values(json_data["Time Series FX (Daily)"]).map(d => ({open: parseFloat(d["1. open"]), high: parseFloat(d["2. high"]), low: parseFloat(d["3. low"]), close: parseFloat(d["4. close"])}));
                resolve(rawData.reverse());


            });
        });

        req.on('error', function (e) {
            console.log(e.message);
        });


    });
}





function prepareInputDatas(data, time_steps) {

    /* if the date is major then time steps */
    if (data.length > time_steps) {


        let arr = new Array();

        for (let i = 0; i < data.length - time_steps; i++) {


            /* create the training or testing array, with x values (features) and batch size (batch size is the samples' first dimension of array) */
            arr.push(data.slice(i, i + time_steps).map(d => {

                return [d.open, d.high, d.low, d.close, d.sma, d.rsi, d.macd_macd, d.macd_signal, d.macd_histogram];


            }));

        }

        return arr.slice(time_steps);
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

        return arr.slice(time_steps);

    } else
    {
        return false;
    }
}

function prepareInputTestingDatas(data, time_steps) {

    /* if the date is major then time steps */
    if (data.length > time_steps) {

        /* indicator examples */



        let arr = new Array();

        for (let i = 0; i <= data.length - time_steps; i++) {

            /*let sma = SMA.calculate({period: time_steps, values: data.slice(i, i + time_steps).map(d => d.close)})[0];*/

            /* create the training or testing array, with x values (features) and batch size (batch size is the samples' first dimension of array) */
            arr.push(data.slice(i, i + time_steps).map(d => {

                return [d.open, d.high, d.low, d.close, d.sma, d.rsi, d.macd_macd, d.macd_signal, d.macd_histogram];


            }));

        }

        return arr;
    } else
    {
        return false;
    }

}

function prepareOutputTestingDatas(data, time_steps) {

    if (data.length > time_steps) {

        let arr = new Array();

        /* create output training set (or testing values) (y values) */
        for (let i = time_steps; i <= data.length; i++) {
            if (data[i]) {
                arr.push(data[i].close);
            }


        }

        return arr;

    } else
    {
        return false;
    }
}



async function train_data(data) {


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

    /*let rsi_min = Math.min.apply(null, rsi);
     let rsi_max = Math.max.apply(null, rsi);
     let normRSI = rsi.map(d => (d - rsi_min) / (rsi_max - rsi_min));
     
     
     let sma_min = Math.min.apply(null, sma);
     let sma_max = Math.max.apply(null, sma);
     let normSMA = sma.map(d => (d - sma_min) / (sma_max - sma_min));*/

    for (let i = 0; i < data.length; i++) {
        data[i].sma = 0;
        data[i].rsi = 0;
        data[i].macd_macd = 0;
        data[i].macd_signal = 0;
        data[i].macd_histogram = 0;
        /*data[i].stochastic = 0;*/

    }

    let d = 0;
    for (let i = 7; i < data.length; i++) {
        data[i].sma = /*normSMA*/sma[d + 1];
        data[i].rsi = /*normRSI*/rsi[d];
        d++;
    }

    d = 0;
    for (let i = 12 + 26; i < data.length; i++) {
        data[i].macd_macd = macd[d].MACD;
        data[i].macd_signal = macd[d].signal;
        data[i].macd_histogram = macd[d].histogram;
        d++;
    }

    data = data.slice(12 + 26);

    /* sometimes Chrome crashes and you need to open a new window */

    const size = Math.floor(data.length / 100 * 98);

    /* lasciare così per fare daily FX, 14 giorni è il timestep piu usato dai trader */
    const time_steps = 14;
    const epochs_number = 25;

    const predict_size = data.length - size;

    const start = data.length - size - predict_size;

    const input = prepareInputDatas(data.slice(start, start + size), time_steps);
    const output = prepareOutputDatas(data.slice(start, start + size), time_steps);


    const testing = prepareInputTestingDatas(data.slice(start + size, start + size + predict_size), time_steps);
    const testingResults = prepareOutputTestingDatas(data.slice(start + size, start + size + predict_size), time_steps);

    /* Creating tensors (input 3d tensor, and output 1d tensor) */

    const input_size_2 = input[0].length;
    const input_size = input[0][0].length;

    const trainingData = tf.tensor3d(input, [input.length, input_size_2, input_size]);
    const outputData = tf.tensor1d(output);

    const testing_size_2 = testing[0].length;
    const testing_size = testing[0][0].length;

    const testingData = tf.tensor3d(testing, [testing.length, testing_size_2, testing_size]);
    const outputTestingData = tf.tensor1d(testingResults);


    /* normalizing datas */
    const trainingDataMax = trainingData.max();
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
    const normalizedTestingOutputData = outputTestingData.sub(outputTestingDataMin).div(outputTestingDataMax.sub(outputTestingDataMin));


    /* creating model */
    const model = tf.sequential();

    /* il miglior modello finora ,sennò c'è lstm,lstm,dense,dense sempre con sto adam ecc*/
    model.add(tf.layers.lstm({inputShape: [input_size_2, input_size], units: input_size_2, returnSequences: true}));

    model.add(tf.layers.dropout({rate: 0.01}));

    model.add(tf.layers.lstm({units: input_size_2 * 2, returnSequences: false}));

    model.add(tf.layers.dropout({rate: 0.01}));

    model.add(tf.layers.dense({units: 1}));



    model.summary();


    /* setting training */
    let learningRate = 0.01;

    /* selecting the best training optimizer */
    const optimizer = tf.train.adam(learningRate);
    //const optimizer = tf.train.rmsprop(learningRate, 0.95);

    /* compiling model with optimizer, loss and metrics */
    model.compile({

        optimizer: optimizer,
        loss: tf.losses.meanSquaredError,
        metrics: [tf.metrics.meanAbsoluteError, tf.losses.meanSquaredError]

    });


    /* training ... */
    console.log('Loss Log');

    for (let i = 0; i < epochs_number; i++) {
        let res = await model.fit(normalizedTrainingData, normalizedOutputData, {epochs: 1});
        console.log(`Iteration ${i + 1}: ${res.history.loss[0] }`);

    }

    /* training prediction (validation) */

    const validation = model.predict(normalizedTrainingData);

    const unNormValidation = validation
            .mul(outputDataMax.sub(outputDataMin))
            .add(outputDataMin).dataSync();

    const trainingResults = output.map((d, i) => {
        if (d) {
            return {
                x: i, y: d
            };
        }
    });
    const trainingValidation = Array.from(unNormValidation).map((d, i) => {
        if (d) {
            return {
                x: i, y: d
            };
        }
    });

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

    /* predicting */

    console.log('Real prediction');

    const preds = model.predict(normalizedTestingData);

    const unNormPredictions = preds
            .mul(outputTestingDataMax.sub(outputTestingDataMin))
            .add(outputTestingDataMin).dataSync();

    const realResults = testingResults.map((d, i) => {
        if (d) {
            return {
                x: i, y: d.toFixed(4)
            };
        }
    });
    const predictions = Array.from(unNormPredictions).map((d, i) => {
        if (d) {
            return {
                x: i, y: d.toFixed(4)
            };
        }
    });

    io.emit('predictions', [realResults, predictions]);

    console.log("INPUT", testing);


    console.log("OUTPUT", realResults);

    console.log("PREDICTIONS", predictions);

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

    console.log("CRESCITA", crescita, giusti, errori, pari);


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

async function main() {
    const data = await getData();
    await train_data(data);

}