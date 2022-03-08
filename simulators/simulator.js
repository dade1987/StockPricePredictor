module.exports = {


    simulazione_guadagni: function(realResults, predictions, data, sentimentAnalysis, orderBook, resistenceAndSupport, trades) {


        const myArr = realResults.map((v, i) => {
            return v.y;
        });

        console.log("A", myArr);

        const percentageArr = myArr.map((v, i) => i === 0 ? 100 : Math.abs(100 - (v * 100 / myArr[i - 1])));
        percentageArr.shift();

        console.log("B", percentageArr);

        const median = arr => {
            const mid = Math.floor(arr.length / 2),
                nums = [...arr].sort((a, b) => a - b);
            return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
        };

        let median_difference = median(percentageArr);

        //lo stop loss è il prezzo + (o -) la mediana della differenza percentuale degli ultimi 30 valori + il 10%;
        let stop_loss_percent = median_difference /*/ 100 * 90*/ ;
        let take_profit_percent = median_difference /* / 100 * 110*/ ;

        console.log("C", median_difference);

        console.log("STOP");
        //return;
        //intanto proviamo sui 5 minuti con alternative coins

        //SE C'E' un picco, le notizie hanno un sentiment contrario, il volume cambia al contrario e le previsioni sono contrarie al trend
        //se pick_incidence>0.75 indica da fare un sell
        //se la pick_incidence<0.25 indica da fare un buy

        //se le notizie sono negative sell, se positive buy

        //se la previsione è in giù sell, altrimenti buy

        //se il volume scende sell, se sale buy

        //se è aperta in una posizione ma vorrebbe cambiarla chiudi e cambia

        //sarebbe da aggiungere le whales ma per ora lascio stare, però posso usare il volume

        //0 è sell, 1 è niente e 2 è buy
        let status = 1;
        let crescita = 0;
        let giusti = 0;
        let errori = 0;
        let pari = 0;
        let percentuale_take_profit = 0;
        let importo_take_profit = 0;
        let tipo_negoziazione = "";
        let importo_attuale = 0;
        let price_rise_probability = 0;
        let price_drop_probability = 0;
        let bool_last_prediction = false;

        //Attenzione: la condizione di cutoff è > MAGGIORE e NON >= MAGGIORE UGUALE
        let historical_approval_cutoff = 60;
        let actual_approval_cutoff = 44;


        //let operations=new Array();

        //console.log("LAST DATA SIMULATION",data.slice(-1),realResults.length,data.length);

        let i = 1;
        for (; i <= realResults.length; i++) {

            //console.log("CICLO", i);

            //solo per la previsione di oggi
            if ( /*realResults[i] === undefined*/ true) {


                if (realResults[i] === undefined) {
                    bool_last_prediction = true;
                }
                //console.log("DATI", data[i - 1], realResults[i - 1].y);
                // console.log("original_data",original_data.slice(-3));
                price_rise_probability = buy_sell_condition.buy_condition(predictions[i].y, predictions[i - 1].y, realResults[i - 1].y, data[i - 1], sentimentAnalysis, orderBook, bool_last_prediction, trades);
                price_drop_probability = buy_sell_condition.sell_condition(predictions[i].y, predictions[i - 1].y, realResults[i - 1].y, data[i - 1], sentimentAnalysis, orderBook, bool_last_prediction, trades)

                if ((bool_last_prediction === true && price_rise_probability > actual_approval_cutoff) || (bool_last_prediction === false && price_rise_probability > historical_approval_cutoff)) {
                    /*if (status === 2 && bool_last_prediction === false) {
                        importo_attuale = realResults[i - 1].y;
                        percentuale_take_profit = 0;
                        tipo_negoziazione = "NOTHING";
                        importo_take_profit = importo_attuale;

                        //console.log(tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);

                    } else {*/
                    if (status === 0 && bool_last_prediction === false) {
                        console.log("CLOSE");
                        status = 1;
                    }
                    status = 2;
                    importo_attuale = realResults[i - 1].y;
                    percentuale_take_profit = Math.abs(((((parseFloat(predictions[i].y) / parseFloat(predictions[i - 1].y) - 1) * 100))));
                    tipo_negoziazione = "BUY";
                    importo_take_profit = (parseFloat(importo_attuale) + (importo_attuale / 100 * percentuale_take_profit));

                    //se la previsione del buy sell condition è fatta sui dati -1 ovviamente il giro da cui parte la predizione sarà il -1
                    console.log(i - 1, tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);
                    /* }*/
                } else if ((bool_last_prediction === true && price_drop_probability > actual_approval_cutoff) || (bool_last_prediction === false && price_drop_probability > historical_approval_cutoff)) {
                    /*if (status === 0 && bool_last_prediction === false) {
                        importo_attuale = realResults[i - 1].y;
                        percentuale_take_profit = 0;
                        tipo_negoziazione = "NOTHING";
                        importo_take_profit = importo_attuale;

                        //console.log(tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);


                    } else {*/
                    if (status === 2 && bool_last_prediction === false) {
                        console.log("CLOSE");
                        status = 1;
                    }

                    status = 0;

                    importo_attuale = realResults[i - 1].y;
                    percentuale_take_profit = Math.abs(((((parseFloat(predictions[i].y) / parseFloat(predictions[i - 1].y) - 1) * 100))));
                    tipo_negoziazione = "SELL";
                    importo_take_profit = (parseFloat(importo_attuale) - (importo_attuale / 100 * percentuale_take_profit));

                    //se la previsione del buy sell condition è fatta sui dati -1 ovviamente il giro da cui parte la predizione sarà il -1
                    console.log(i - 1, tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);
                    /*}*/
                } else {

                    importo_attuale = realResults[i - 1].y;
                    percentuale_take_profit = 0;
                    tipo_negoziazione = "NOTHING";
                    importo_take_profit = importo_attuale;

                    console.log("GIRO", i - 1);
                    //console.log(tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);

                }

            }

        }

        //è -1 perchè nel ciclo mostro il giro -1, dato che i data sono -1 (l'ultimo non ce l'ho perchè è la previsione)
        console.log("IL " + (i - 1) + "-ESIMO GIRO E' LA PREDIZIONE E NON HA DATI");

        return {
            crescita,
            giusti,
            errori,
            pari,
            importo_take_profit,
            tipo_negoziazione,
            importo_attuale,
            percentuale_take_profit,
            price_rise_probability,
            price_drop_probability,
            resistenceAndSupport,
            stop_loss_percent,
            take_profit_percent
        };
    },



    simulazione_guadagni_FINO_AL_18112021: function(realResults, predictions, data) {
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

    },
    /*data are real data referred to testing results*/
    simulazione_guadagni_2: function(realResults, predictions, data) {
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

            try {
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
            } catch (error) {
                console.log("INDICE " + i);
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

}