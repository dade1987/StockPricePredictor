module.exports = {
    simulazione_guadagni: function (realResults, predictions, data, sentimentAnalysis, orderBook) {

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

        //console.log(realResults);

        for (let i = 1; i <= realResults.length; i++) {

            //console.log("CICLO", i);

            //solo per la previsione di oggi
            if (/*realResults[i] === undefined*/true) {


                if (realResults[i] === undefined) {
                    bool_last_prediction = true;
                }
                //console.log("DATI", data[i - 1], realResults[i - 1].y);
                price_rise_probability = buy_sell_condition.buy_condition(predictions[i].y, predictions[i - 1].y, realResults[i - 1].y, data[i - 1], sentimentAnalysis, orderBook, bool_last_prediction);
                price_drop_probability = buy_sell_condition.sell_condition(predictions[i].y, predictions[i - 1].y, realResults[i - 1].y, data[i - 1], sentimentAnalysis, orderBook, bool_last_prediction)

                if (price_rise_probability > 65) {
                    /* if (status === 0) {
                         console.log("CLOSE");
                         status = 1;
                     } else if (status === 2) {
                         importo_attuale = realResults[i - 1].y;
                         percentuale_take_profit = 0;
                         tipo_negoziazione = "NOTHING";
                         importo_take_profit = importo_attuale;
     
                         //console.log(tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);
     
                     } else {*/
                    status = 2;
                    importo_attuale = realResults[i - 1].y;
                    percentuale_take_profit = Math.abs(((((parseFloat(predictions[i].y) / parseFloat(predictions[i - 1].y) - 1) * 100))));
                    tipo_negoziazione = "BUY";
                    importo_take_profit = (parseFloat(importo_attuale) + (importo_attuale / 100 * percentuale_take_profit));
                    /*player.play('buy.mp3', function(err){
                        if (err) throw err
                      });*/
                    console.log(i, tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);
                    /*}*/
                } else if (price_drop_probability > 65) {
                    /*if (status === 2) {
                        console.log("CLOSE");
                        status = 1;
                    } else if (status === 0) {
                        importo_attuale = realResults[i - 1].y;
                        percentuale_take_profit = 0;
                        tipo_negoziazione = "NOTHING";
                        importo_take_profit = importo_attuale;
    
                        //console.log(tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);
    
    
                    } else {*/
                    status = 0;

                    importo_attuale = realResults[i - 1].y;
                    percentuale_take_profit = Math.abs(((((parseFloat(predictions[i].y) / parseFloat(predictions[i - 1].y) - 1) * 100))));
                    tipo_negoziazione = "SELL";
                    importo_take_profit = (parseFloat(importo_attuale) - (importo_attuale / 100 * percentuale_take_profit));
                    /*player.play('sell.mp3', function(err){
                        if (err) throw err
                      });*/
                    console.log(i, tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);
                    /* }*/
                } else {
                    importo_attuale = realResults[i - 1].y;
                    percentuale_take_profit = 0;
                    tipo_negoziazione = "NOTHING";
                    importo_take_profit = importo_attuale;

                    //console.log(tipo_negoziazione, importo_attuale, predictions[i - 1].y, predictions[i].y, percentuale_take_profit, importo_take_profit);

                }

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
            percentuale_take_profit,
            price_rise_probability,
            price_drop_probability
        };
    },



    simulazione_guadagni_FINO_AL_18112021: function (realResults, predictions, data) {
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
    simulazione_guadagni_2: function (realResults, predictions, data) {
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