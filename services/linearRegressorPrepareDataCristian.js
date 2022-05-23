module.exports = {
    prepareInputDatas: function(data, time_steps, b_test, market_name, time_interval) {

        let test = 0;
        if (b_test === true) {
            test = 1;
        }

        //console.log(data);
        //return false;

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

                        case "CRYPTO_FUTURES":
                            return [].concat(Object.values(d).slice(0, 9));
                            break;

                        case "CRYPTO":

                            /* le crypto hanno anche il volume */
                            /* le daily hanno anche il market cap */
                            /* solo close, volume per le cripto e stocastico. prima facevo invece open high low close vol e stocastici (crescita 9 il 19/05/2021) */
                            /* meglio tenerli cosi. facendo come prima mi da crescita a -3 e aderiscono peggio */
                            /*aggiunto indicatore RSI (molto meglio:Crescita: 9 Giusti: 47 Errori: 38 Pari: 0)*/
                            //con RSI e Stoch solamente
                            //return [].concat(Object.values(d).slice(0, 5), Object.values(d).slice(6, 7), Object.values(d).slice(7, 9));

                            /*if(time_interval==="DAILY"){
                                return [].concat(Object.values(d).slice(0, 6));    
                            }*/
                            return [].concat(Object.values(d).slice(0, 5) /*, Object.values(d).slice(6, 7)*/ /*, Object.values(d).slice(12, 13)*/ );
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
            console.log("TROPPO POCHI DATI PER ADDESTRARE IL MODELLO");
            console.log("RICARICA LA PAGINA HTML");
            console.log("LISTENING...");
            return false;
        }

    },

    prepareOutputDatas: function(data, time_steps) {

        if (data.length > time_steps) {

            let arr = new Array();

            /* create output training set (or testing values) (y values) */
            for (let i = time_steps; i < data.length; i++) {

                if (data[i - 1].close < data[i].close) {
                    arr.push(1);
                } else
                if (data[i - 1].close > data[i].close) {
                    arr.push(0);
                } else {
                    arr.push(0.5);
                }


            }

            console.log("ARR", arr);
            return arr;

        } else {
            return false;
        }
    },
    prepareOutputSpecs: function(data, time_steps) {

        if (data.length > time_steps) {

            let arr = new Array();

            /* create output training set (or testing values) (y values) */
            for (let i = time_steps; i < data.length; i++) {

                arr.push(data[i]);

            }

            return arr;

        } else {
            return false;
        }
    }
}