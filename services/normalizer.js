module.exports = {

    normalizza_dati: function(data) {

        //console.log("DATA", data[0]);

        //prima deve calcolare massimi e minimi
        prices_min = Math.min.apply(null, data.map(function(d) {
            return Math.min.apply(null, [d.open, d.high, d.low, d.close]);
        }));
        prices_max = Math.max.apply(null, data.map(function(d) {
            return Math.max.apply(null, [d.open, d.high, d.low, d.close]);
        }));

        let volume_min = Math.min.apply(null, data.map(function(d) {
            return d.volume;
        }));

        let volume_max = Math.max.apply(null, data.map(function(d) {
            return d.volume;
        }));


        let sma_min = Math.min.apply(null, data.map(function(d) {
            return d.sma;
        }));

        let sma_max = Math.max.apply(null, data.map(function(d) {
            return d.sma;
        }));


        let rsi_min = Math.min.apply(null, data.map(function(d) {
            return d.rsi;
        }));

        let rsi_max = Math.max.apply(null, data.map(function(d) {
            return d.rsi;
        }));

        let stochastic_min = Math.min.apply(null, data.map(function(d) {
            return Math.min.apply(null, [d.stochastic_k, d.stochastic_d]);
        }));

        let stochastic_max = Math.max.apply(null, data.map(function(d) {
            return Math.max.apply(null, [d.stochastic_k, d.stochastic_d]);
        }));

        let macd_min = Math.min.apply(null, data.map(function(d) {
            return Math.min.apply(null, [d.macd_macd, d.macd_signal, d.macd_histogram]);
        }));

        let macd_max = Math.max.apply(null, data.map(function(d) {
            return Math.max.apply(null, [d.macd_macd, d.macd_signal, d.macd_histogram]);
        }));

        let pick_incidence_min = Math.min.apply(null, data.map(function(d) {
            return Math.min.apply(null, [d.pick_incidence]);
        }));

        let pick_incidence_max = Math.max.apply(null, data.map(function(d) {
            return Math.max.apply(null, [d.pick_incidence]);
        }));

        let ema_min = Math.min.apply(null, data.map(function(d) {
            return Math.min.apply(null, [d.ema]);
        }));

        let ema_max = Math.max.apply(null, data.map(function(d) {
            return Math.max.apply(null, [d.ema]);
        }));


        /*let macd_macd_max = 0;
         let macd_macd_min = 0;
         
         let macd_signal_max = 0;        
         let macd_signal_min = 0;
         
         let macd_histogram_max = 0;
         let macd_histogram_min = 0;*/



        let finale = data.map(function(d) {
            let volumeTemp = (d.volume - volume_min) / (volume_max - volume_min);
            if (isNaN(volumeTemp)) {
                volumeTemp = 0;
            }
            return {
                open: (d.open - prices_min) / (prices_max - prices_min),
                high: (d.high - prices_min) / (prices_max - prices_min),
                low: (d.low - prices_min) / (prices_max - prices_min),
                close: (d.close - prices_min) / (prices_max - prices_min),
                volume: volumeTemp,
                sma: (d.sma - sma_min) / (sma_max - sma_min),
                rsi: (d.rsi - rsi_min) / (rsi_max - rsi_min),
                stochastic_k: (d.stochastic_k - stochastic_min) / (stochastic_max - stochastic_min),
                stochastic_d: (d.stochastic_d - stochastic_min) / (stochastic_max - stochastic_min),
                macd_macd: (d.macd_macd - macd_min) / (macd_max - macd_min),
                macd_signal: (d.macd_signal - macd_min) / (macd_max - macd_min),
                macd_histogram: (d.macd_histogram - macd_min) / (macd_max - macd_min),
                pick_incidence: (d.pick_incidence - pick_incidence_min) / (pick_incidence_max - pick_incidence_min),
                ema: (d.ema - ema_min) / (ema_max - ema_min),
                ema_alert: d.ema_alert,
            };
        });

        //console.log("FINALE", finale);

        return finale;

    }
}