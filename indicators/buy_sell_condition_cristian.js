module.exports = {
    //console.log(data);

    buy_condition: function(prediction, orderBook, bool_last_prediction) {

        console.log("PREDICTION", prediction);


        let sum = 0;
        let totale_per_media = 2;


        if (bool_last_prediction === true) {


            //se c'è una resistenza forte sotto e un buco sopra
            if (orderBook === true) {
                console.log("BUY", "orderBook === true", orderBook === true);
                sum++;
            }

        }



        //console.log("BUY CONDITION INFO", actual, prediction, last_data, media, (media / 100 * 95));

        let probabilita = (sum / totale_per_media * 100).toFixed(2);

        console.log("PROBABILITA DI SALITA DEL PREZZO:" + probabilita + "%", sum, totale_per_media);


        //SE LA PROBABILITA E' ALTA LA CONDIZIONE E' VERA
        return probabilita;

    },

    sell_condition: function(prediction, orderBook, bool_last_prediction) {


        let sum = 0;
        let totale_per_media = 2;




        if (bool_last_prediction === true) {

            //se c'è una resistenza forte sopra e un buco sotto
            if (orderBook === false) {
                console.log("SELL", "orderBook === false", orderBook === false);
                sum++;
            }


        }



        let probabilita = (sum / totale_per_media * 100).toFixed(2);

        console.log("PROBABILITA DI DISCESA DEL PREZZO:" + probabilita + "%", sum, totale_per_media);



        //SE LA PROBABILITA E' ALTA LA CONDIZIONE E' VERA
        return probabilita;

    }
}