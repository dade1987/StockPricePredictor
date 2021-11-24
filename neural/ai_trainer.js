module.exports = {
    train_data: async function (data, time_steps, epochs_number, training_enabled, market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, socket, newsData, orderBook) {

        /* applica indicatori */
        let rsi = RSI.calculate({
            period: rsi_period,
            values: data.map(d => d.close)
        });
        let sma = SMA.calculate({
            period: sma_period,
            values: data.map(d => d.close)
        });
        let macd = MACD.calculate({
            values: data.map(d => d.close),
            fastPeriod: macd_fastPeriod,
            slowPeriod: macd_slowPeriod,
            signalPeriod: macd_signalPeriod,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });


        let stochastic = Stochastic.calculate({
            high: data.map(d => d.high),
            low: data.map(d => d.low),
            close: data.map(d => d.close),
            period: stochastic_period,
            signalPeriod: stochastic_signalPeriod
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
        for (let i = rsi_period; i < data.length; i++) {
            //console.log("DEBUG RSI",sma[d],i,d)
            data[i].rsi = rsi[d];
            d++;
        }

        //alcuni periodi sono -1
        d = 0;
        for (let i = sma_period-1; i < data.length; i++) {
            //console.log("DEBUG SMA",sma[d],i,d)
            data[i].sma = sma[d];
            d++;
        }

        d = 0;
        for (let i = stochastic_period-1; i < data.length; i++) {
            data[i].stochastic_k = stochastic[d].k;
            data[i].stochastic_d = stochastic[d].d;
            d++;
        }

        d = 0;
        for (let i = macd_slowPeriod-1; i < data.length; i++) {
            data[i].macd_macd = macd[d].MACD;
            data[i].macd_signal = macd[d].signal;
            data[i].macd_histogram = macd[d].histogram;
            d++;
        }

        d = 0;
        for (let i = 0; i < data.length; i++) {
            //console.log(data[i]);
            data[i].pick_incidence = pick_incidence.pickIncidence(data[i].close, data[i].sma);
            d++;
        }

        //console.log("TRAIN DATA 0", data[data.length-1]);


        /* tagliati giusti e testati uno ad uno, compresa istruzione seguente */
        data = data.slice(33);

        original_data = data;


        //console.log("TRAIN DATA 1", data[0]);

        data = normalizer.normalizza_dati(data);



        //console.log("TRAIN DATA 2", data[0]);
        /* sometimes Chrome crashes and you need to open a new window */

        /* test sul 10% di dati */
        const size = Math.floor(data.length / 100 * 95);

        /* lasciare così per fare daily FX, 14 giorni è il timestep piu usato dai trader */
        /* const time_steps = 14;
         const epochs_number = 10;*/

        const predict_size = data.length - size;

        const start = data.length - size - predict_size;


        const input = prepare_data.prepareInputDatas(data.slice(start, start + size), time_steps, false, market_name, time_interval);
        const output = prepare_data.prepareOutputDatas(data.slice(start, start + size), time_steps);

        console.log("original_data",original_data.slice(-1));
        console.log("data",data.slice(-1));
        console.log("input",input.slice(-1));


        const testing = prepare_data.prepareInputDatas(data.slice(start + size, start + size + predict_size), time_steps, true, market_name, time_interval);
        const testingResults = prepare_data.prepareOutputDatas(data.slice(start + size, start + size + predict_size), time_steps);


        //console.log("INPUT", input[0]);
        //console.log("OUTPUT", output);
        //console.log("TESTING", testing);
        //console.log("TESTINGRESULTS", testingResults);


        //Creating tensors (input 3d tensor, and output 1d tensor)

        const input_size_3 = input.length;
        const input_size_2 = input[0].length;
        const input_size = input[0][0].length;

        //console.log("INPUT", input_size_3, input_size_2, input_size);

        const trainingData = tf.tensor3d(input, [input.length, input_size_2, input_size]);
        const outputData = tf.tensor1d(output);

        if (testing === false) {
            return false;
        }
        const testing_size_3 = testing.length;
        const testing_size_2 = testing[0].length;
        const testing_size = testing[0][0].length;

        //console.log("OUTPUT", input_size_3, input_size_2, input_size);


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
        let learningRate = 0;

        if (time_interval === "DAILY") {
            //epochs_number = 30;
            //learningRate = 0.001;
            //errore 0.001

            epochs_number = 50;
            learningRate = 0.001;
            //errore

        } else {
            learningRate = 0.0001;
            epochs_number = 50;
        }

        /* selecting the best training optimizer */
        const optimizer = tf.train.adam(learningRate);
        //const optimizer = tf.train.rmsprop(learningRate, 0.95);


        if (training_enabled == true) {

            try {

                model = await ai_model_loader.load_model(market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, optimizer);
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
                //console.log('Loss Log');

                for (let i = 0; i < epochs_number; i++) {
                    let res = await model.fit(trainingData, outputData, {
                        epochs: 1
                    });
                    console.log(`Iteration ${i + 1}: ${res.history.loss[0]}`);

                }

                /* credo che qui convenga salvare un modello con nome fisso dall hard disk tipo con model.save o simili */
                await model.save('file://' + process.cwd() + '/ai_models/' + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '');

                console.log("SAVE MODEL", 'file://' + process.cwd() + '/ai_models/' + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '');

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
                if (socket !== null) {
                    socket.emit('training', JSON.stringify([trainingResults, trainingValidation]));
                }

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

            model = await ai_model_loader.load_model(market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, optimizer);

        }




        /* predicting */

        //console.log('Real prediction');



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

        //console.log("INPUT", testing);


        //console.log("OUTPUT", realResults);

        //console.log("PREDICTIONS", predictions);

        if (socket !== null) {
            setTimeout(() => socket.emit('testing', JSON.stringify([realResults, predictions])), 1500);
        }


        let {
            crescita,
            giusti,
            errori,
            pari,
            importo_take_profit,
            tipo_negoziazione,
            importo_attuale,
            percentuale_take_profit,
            price_rise_probability,
            price_drop_probability
        } = simulators.simulazione_guadagni(realResults, predictions, data.slice(start + size + time_steps, start + size + predict_size), newsData, orderBook);

        //console.log("TEST2",data.slice(start + size, start + size + predict_size));

        let temp_testingData = [...testing];

        temp_testingData.pop();

        //Attenzione: evaluate torna un tensore di accuratezza PER OGNI loss e metrica impostate nel modello
        //Quindi la funzione Print() va solo su un tensore alla volta, altrimenti da undefined
        const testingAccuracy = model.evaluate(tf.tensor3d(temp_testingData, [temp_testingData.length, testing_size_2, testing_size]), outputTestingData);


        const testingAccuracyDataSync = testingAccuracy[1].dataSync();
        const testingAccuracyArray = Array.from(testingAccuracyDataSync);

        //console.log("TESTING ACCURACY", testingAccuracyArray);



        console.log("CRESCITA", crescita, giusti, errori, pari);


        let market_depth_status = "POSITIVE";
        if (orderBook === false) {
            market_depth_status === "NEGATIVE";
        }

        if (socket !== null) {
            // setTimeout(() => socket.emit('final', JSON.stringify([crescita, giusti, errori, pari, testingAccuracyArray, parseFloat(importo_take_profit).toFixed(0), tipo_negoziazione, importo_attuale, percentuale_take_profit, (parseFloat(newsData) * 100).toFixed(0), price_rise_probability, price_drop_probability, orderBook])), 3000);
            socket.emit('final', JSON.stringify([crescita, giusti, errori, pari, testingAccuracyArray, parseFloat(importo_take_profit).toFixed(0), tipo_negoziazione, importo_attuale, percentuale_take_profit, (parseFloat(newsData) * 100).toFixed(2), price_rise_probability, price_drop_probability, market_depth_status]));
        }

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

}