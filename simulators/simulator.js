module.exports={
    simulazione_guadagni:function (realResults, predictions, data, sentimentAnalysis, orderBook) {

        //console.log(data);
    
        function buy_condition(prediction, actual, last_data, indicators) {
    
    
            let sum = 0;
            let totale_per_media = 0;
    
            //se ti discosti dalle previsioni del 5% sotto è indicatore che sei ipervenduto quindi può essere da comprare
    
            /*let close_sum = 0;
            realResults.forEach((v) => { close_sum += v.y });
            let media = close_sum / data.length;*/
    
            //console.log("INDICATORS", indicators, "RSI", indicators);
    
            if (parseFloat(indicators.pick_incidence) < 0.3) {
                console.log("BUY", "parseFloat(indicators.pick_incidence) < 0.3", parseFloat(indicators.pick_incidence) < 0.3);
                sum++;
            };
            totale_per_media++;
    
            if (parseFloat(indicators.rsi) < 0.3) {
                console.log("BUY", "parseFloat(indicators.rsi) < 0.3", parseFloat(indicators.rsi) < 0.3);
                sum++;
            };
            totale_per_media++;
    
            if (parseFloat(last_data) < parseFloat(actual)) {
                console.log("BUY", "parseFloat(last_data) < parseFloat(actual)", parseFloat(last_data) < parseFloat(actual));
                sum++;
            };
            totale_per_media++;
    
            if (parseFloat(prediction) > parseFloat(actual)) {
                console.log("BUY", "parseFloat(prediction) > parseFloat(actual)", parseFloat(prediction) > parseFloat(actual));
                sum++;
            }
            totale_per_media++;
    
            if (sentimentAnalysis > 0.5) {
                console.log("BUY", "sentimentAnalysis > 0.5", sentimentAnalysis > 0.5);
                sum++;
            }
            totale_per_media++;
    
            if (orderBook === true) {
                console.log("BUY", "orderBook === true", orderBook === true);
                sum++;
            }
            totale_per_media++;
    
    
    
            //console.log("BUY CONDITION INFO", actual, prediction, last_data, media, (media / 100 * 95));
    
            let probabilita = (sum / totale_per_media * 100).toFixed(2);
    
            console.log("PROBABILITA DI SALITA DEL PREZZO:" + probabilita + "%");
    
            console.log("\r\n");
    
            //SE LA PROBABILITA E' ALTA LA CONDIZIONE E' VERA
            return probabilita > 65;
    
        }
    
        function sell_condition(prediction, actual, last_data, indicators) {
    
    
            let sum = 0;
            let totale_per_media = 0;
    
            //se ti discosti dalle previsioni del 5% sotto è indicatore che sei ipervenduto quindi può essere da comprare
    
            /*let close_sum = 0;
            realResults.forEach((v) => { close_sum += v.y });
            let media = close_sum / data.length;*/
    
            if (parseFloat(indicators.pick_incidence) < 0.3) {
                console.log("SELL", "parseFloat(indicators.pick_incidence) < 0.3", parseFloat(indicators.pick_incidence) < 0.3);
                sum++;
            };
            totale_per_media++;
    
            if (parseFloat(indicators.rsi) > 0.7) {
                console.log("SELL", "parseFloat(indicators.rsi) > 0.7", parseFloat(indicators.rsi) > 0.7);
                sum++;
            };
            totale_per_media++;
    
            if (parseFloat(last_data) > parseFloat(actual)) {
                console.log("SELL", "parseFloat(last_data) > parseFloat(actual)", parseFloat(last_data) > parseFloat(actual));
                sum++;
            };
            totale_per_media++;
    
            if (parseFloat(prediction) < parseFloat(actual)) {
                console.log("SELL", "parseFloat(prediction) < parseFloat(actual)", parseFloat(prediction) < parseFloat(actual));
                sum++;
            }
            totale_per_media++;
    
            if (sentimentAnalysis < 0.5) {
                console.log("SELL", "sentimentAnalysis < 0.5", sentimentAnalysis < 0.5);
                sum++;
            }
            totale_per_media++;
    
            if (orderBook === false) {
                console.log("SELL", "orderBook === false", orderBook === false);
                sum++;
            }
            totale_per_media++;
    
    
    
            //console.log("SELL CONDITION INFO", actual, prediction, last_data, media, (media / 100 * 105));
            //console.log("SELL CONDITION2?", last_data > (media / 100 * 105), parseFloat(last_data) > parseFloat(actual), parseFloat(prediction) < parseFloat(actual), sentimentAnalysis < 0.5);
    
            let probabilita = (sum / totale_per_media * 100).toFixed(2);
    
            console.log("PROBABILITA DI DISCESA DEL PREZZO:" + probabilita + "%");
    
            console.log("\r\n");
    
            //SE LA PROBABILITA E' ALTA LA CONDIZIONE E' VERA
            return probabilita > 65;
    
        }
    
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
    
        //console.log(realResults);
    
        for (let i = 1; i <= realResults.length; i++) {
    
            //console.log("CICLO", i);
    
            //solo per la previsione di oggi
            if (/*true*/realResults[i] === undefined) {
    
                //console.log("DATI", data[i - 1], realResults[i - 1].y);
    
                if (buy_condition(predictions[i].y, predictions[i - 1].y, realResults[i - 1].y, data[i - 1]) === true) {
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
                } else if (sell_condition(predictions[i].y, predictions[i - 1].y, realResults[i - 1].y, data[i - 1]) === true) {
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
            percentuale_take_profit
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