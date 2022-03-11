module.exports = {
    //console.log(data);

    buy_condition: function(prediction, actual, last_data, indicators, sentimentAnalysis, orderBook, bool_last_prediction, trades) {

        //console.log("last_data, indicators",last_data, indicators);
        //console.log("indicators.rsi", indicators.rsi,"data[i - 1]",indicators);

        let sum = 0;
        let totale_per_media = 0;

        console.log("indicators", indicators);

        if (indicators.ema_25_trend === +1) {
            console.log("BUY", "indicators.ema_25_trend === +1", indicators.ema_25_trend === +1);
        }

        if (indicators.ema_99_trend === +1) {
            console.log("BUY", "indicators.ema_99_trend === +1", indicators.ema_99_trend === +1);
        }


        //tecnica scalping bul
        if (indicators.ema_alert === +1) {
            console.log("BUY", "indicators.ema_alert === 1", indicators.ema_alert === +1);
            sum++;
        }
        totale_per_media++;

        //se ti discosti dalle previsioni del 5% sotto è indicatore che sei ipervenduto quindi può essere da comprare

        /*let close_sum = 0;
        realResults.forEach((v) => { close_sum += v.y });
        let media = close_sum / data.length;*/

        //console.log("INDICATORS", indicators,"PREDICTION",prediction,"LAST DATA",last_data);

        /*if (parseFloat(indicators.pick_incidence) < 0.4) {
            //console.log("BUY", "parseFloat(indicators.pick_incidence) < 0.3", parseFloat(indicators.pick_incidence) < 0.3);
            sum++;
        };
        totale_per_media++;*/

        if (parseFloat(indicators.rsi) < 0.3) {
            console.log("BUY", "parseFloat(indicators.rsi) < 0.3", parseFloat(indicators.rsi) < 0.3);
            sum++;
        };
        totale_per_media++;

        /*if (parseFloat(last_data) < parseFloat(actual)) {
            console.log("BUY", "parseFloat(last_data) < parseFloat(actual)", parseFloat(last_data) < parseFloat(actual));
            sum++;
        };
        totale_per_media++;*/

        if (parseFloat(prediction) > parseFloat(actual)) {
            console.log("BUY", "parseFloat(prediction) > parseFloat(actual)", parseFloat(prediction) > parseFloat(actual));
            sum++;
        }
        totale_per_media++;

        if (bool_last_prediction === true) {
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

            if (trades.whales_buying_vol > trades.whales_selling_vol) {
                console.log("BUY", "trades.whales_buying_vol > trades.whales_selling_vol", trades.whales_buying_vol > trades.whales_selling_vol);
                sum++;
            }
            totale_per_media++;

            /*if (trades.whales_buying_num > trades.whales_selling_num) {
                console.log("BUY", "trades.whales_buying_num > trades.whales_selling_num", trades.whales_buying_num > trades.whales_selling_num);
                sum++;
            }
            totale_per_media++;*/

            if (trades.poveraccis_buying_vol > trades.poveraccis_selling_vol) {
                console.log("BUY", "trades.poveraccis_buying_vol > trades.poveraccis_selling_vol", trades.poveraccis_buying_vol > trades.poveraccis_selling_vol);
                //solo se la proporzione tra chi compra e vende è forte conta, 
                //perchè i volumi spostati sono poca roba (almeno 50%)
                //if (trades.poveraccis_buying_vol > trades.poveraccis_selling_vol + (trades.poveraccis_selling_vol / 100 * 50)) {
                sum++;
                //}
            }
            totale_per_media++;

            //nel caso dei poveracci non c'entra quanti sono, ma solo il volume spostato
            //però comunque significa che la fiducia sale
            /*if (trades.poveraccis_buying_num > trades.poveraccis_selling_num) {
                console.log("BUY", "trades.poveraccis_buying_num > trades.poveraccis_selling_num", trades.poveraccis_buying_num > trades.poveraccis_selling_num);

                //console.log("BUY", "orderBook === true", orderBook === true);
                sum++;
            }
            totale_per_media++;*/
        }



        //console.log("BUY CONDITION INFO", actual, prediction, last_data, media, (media / 100 * 95));

        let probabilita = (sum / totale_per_media * 100).toFixed(2);

        console.log("PROBABILITA DI SALITA DEL PREZZO:" + probabilita + "%", sum, totale_per_media);


        //SE LA PROBABILITA E' ALTA LA CONDIZIONE E' VERA
        return probabilita;

    },

    sell_condition: function(prediction, actual, last_data, indicators, sentimentAnalysis, orderBook, bool_last_prediction, trades) {


        let sum = 0;
        let totale_per_media = 0;

        if (indicators.ema_25_trend === -1) {
            console.log("SELL", "indicators.ema_25_trend === -1", indicators.ema_25_trend === -1);
        }

        if (indicators.ema_99_trend === -1) {
            console.log("SELL", "indicators.ema_99_trend === -1", indicators.ema_99_trend === -1);
        }

        //tecnica scalping bul
        if (indicators.ema_alert === -1) {
            console.log("SELL", "indicators.ema_alert === -1", indicators.ema_alert === -1);
            sum++;
        }
        totale_per_media++;

        //se ti discosti dalle previsioni del 5% sotto è indicatore che sei ipervenduto quindi può essere da comprare

        /*let close_sum = 0;
        realResults.forEach((v) => { close_sum += v.y });
        let media = close_sum / data.length;*/

        /*if (parseFloat(indicators.pick_incidence) > 0.6) {
            //console.log("SELL", "parseFloat(indicators.pick_incidence) > 0.7", parseFloat(indicators.pick_incidence) > 0.7);
            sum++;
        };
        totale_per_media++;*/

        if (parseFloat(indicators.rsi) > 0.7) {
            console.log("SELL", "parseFloat(indicators.rsi) > 0.7", parseFloat(indicators.rsi) > 0.7);
            sum++;
        };
        totale_per_media++;

        /* if (parseFloat(last_data) > parseFloat(actual)) {
             console.log("SELL", "parseFloat(last_data) > parseFloat(actual)", parseFloat(last_data) > parseFloat(actual));
             sum++;
         };
         totale_per_media++;*/

        if (parseFloat(prediction) < parseFloat(actual)) {
            console.log("SELL", "parseFloat(prediction) < parseFloat(actual)", parseFloat(prediction) < parseFloat(actual));
            sum++;
        }
        totale_per_media++;

        if (bool_last_prediction === true) {
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

            if (trades.whales_selling_vol > trades.whales_buying_vol) {
                console.log("SELL", "trades.whales_selling_vol > trades.whales_buying_vol", trades.whales_selling_vol > trades.whales_buying_vol);
                sum++;
            }
            totale_per_media++;

            /*if (trades.whales_selling_num > trades.whales_buying_num) {
                console.log("SELL", "trades.whales_selling_num > trades.whales_buying_num", trades.whales_selling_num > trades.whales_buying_num);
                sum++;
            }
            totale_per_media++;*/

            if (trades.poveraccis_selling_vol > trades.poveraccis_buying_vol) {
                console.log("SELL", "trades.poveraccis_selling_vol > trades.poveraccis_buying_vol", trades.poveraccis_selling_vol > trades.poveraccis_buying_vol);

                //solo se la proporzione tra chi compra e vende è forte conta, 
                //perchè i volumi spostati sono poca roba (almeno 50%)
                //if (trades.poveraccis_selling_vol > trades.poveraccis_buying_vol + (trades.poveraccis_buying_vol / 100 * 50)) {
                sum++;
                //}
            }
            totale_per_media++;

            //nel caso dei poveracci non c'entra quanti sono, ma solo il volume spostato
            /*if (trades.poveraccis_selling_num > trades.poveraccis_buying_num) {
                console.log("SELL", "trades.poveraccis_selling_num > trades.poveraccis_buying_num", trades.poveraccis_selling_num > trades.poveraccis_buying_num);

                //console.log("BUY", "orderBook === true", orderBook === true);
                sum++;
            }
            totale_per_media++;*/
        }



        //console.log("SELL CONDITION INFO", actual, prediction, last_data, media, (media / 100 * 105));
        //console.log("SELL CONDITION2?", last_data > (media / 100 * 105), parseFloat(last_data) > parseFloat(actual), parseFloat(prediction) < parseFloat(actual), sentimentAnalysis < 0.5);

        let probabilita = (sum / totale_per_media * 100).toFixed(2);

        console.log("PROBABILITA DI DISCESA DEL PREZZO:" + probabilita + "%", sum, totale_per_media);



        //SE LA PROBABILITA E' ALTA LA CONDIZIONE E' VERA
        return probabilita;

    }
}