module.exports = {
    //console.log(data);

    buy_condition: function (prediction, actual, last_data, indicators, sentimentAnalysis, orderBook, bool_last_prediction) {

        //console.log("last_data, indicators",last_data, indicators);
        //console.log("indicators.rsi", indicators.rsi,"data[i - 1]",indicators);

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
        }



        //console.log("BUY CONDITION INFO", actual, prediction, last_data, media, (media / 100 * 95));

        let probabilita = (sum / totale_per_media * 100).toFixed(2);

        console.log("PROBABILITA DI SALITA DEL PREZZO:" + probabilita + "%");

        console.log("\r\n");

        //SE LA PROBABILITA E' ALTA LA CONDIZIONE E' VERA
        return probabilita;

    },

    sell_condition: function (prediction, actual, last_data, indicators, sentimentAnalysis, orderBook, bool_last_prediction) {


        let sum = 0;
        let totale_per_media = 0;

        //se ti discosti dalle previsioni del 5% sotto è indicatore che sei ipervenduto quindi può essere da comprare

        /*let close_sum = 0;
        realResults.forEach((v) => { close_sum += v.y });
        let media = close_sum / data.length;*/

        if (parseFloat(indicators.pick_incidence) > 0.7) {
            console.log("SELL", "parseFloat(indicators.pick_incidence) > 0.7", parseFloat(indicators.pick_incidence) > 0.7);
            sum++;
        };
        totale_per_media++;

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
        }



        //console.log("SELL CONDITION INFO", actual, prediction, last_data, media, (media / 100 * 105));
        //console.log("SELL CONDITION2?", last_data > (media / 100 * 105), parseFloat(last_data) > parseFloat(actual), parseFloat(prediction) < parseFloat(actual), sentimentAnalysis < 0.5);

        let probabilita = (sum / totale_per_media * 100).toFixed(2);

        console.log("PROBABILITA DI DISCESA DEL PREZZO:" + probabilita + "%");

        console.log("\r\n");

        //SE LA PROBABILITA E' ALTA LA CONDIZIONE E' VERA
        return probabilita;

    }
}