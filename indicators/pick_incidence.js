module.exports = {

    pickIncidence: function(close, sma) {
        let return_value = 0.5

        /*if (close - macd >= macd / 100 * 10) {
            return_value = 0;
        } else if (close - macd >= macd / 100 * 5) {
            return_value = 0.25;
        } else if (close - macd <= (macd / 100 * 5) * -1) {
            return_value = 0.75;
        } else if (close - macd <= (macd / 100 * 10) * -1) {
            return_value = 1;
        }*/

        return_value = close - sma;

        return return_value;
    },


    emaAlert: function(previous_ema, previous_open, current_ema, current_open) {
        //se l'apertura corrente è più alta dell'ema, mentre l'apertura precedente è minore o uguale dell'ema precedente
        //è indice di long (+1)

        //se l'apertura corrente è più bassa dell'ema, mentre l'apertura precedente è maggiore o uguale dell'ema precedente
        //è indice di short (-1)

        //negli altri casi non è indice di un cazzo

        if (previous_open <= previous_ema && current_open > current_ema) {
            return +1;
        } else if (previous_open >= previous_ema && current_open < current_ema) {
            return -1;
        } else {
            return 0;
        }

    }

}