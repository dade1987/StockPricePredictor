module.exports = {

    pickIncidence: function (close, macd) {
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

        return_value = close - macd;

        return return_value;
    }

}