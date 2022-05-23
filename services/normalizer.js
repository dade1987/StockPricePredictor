module.exports = {

    normalizza_dati: function(data) {

        //normalizzazioni da fare
        /* open: parseFloat(d[1]),
         high: parseFloat(d[2]),
         low: parseFloat(d[3]),
         close: parseFloat(d[4]),
         volume: parseFloat(d[5]),
         quote_asset_volume: parseFloat(d[7]),
         number_trades: parseFloat(d[8]),
         taker_buy_base_asset_volume: parseFloat(d[9]),
         taker_buy_quote_asset_volume: parseFloat(d[10])*/

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

        let quote_asset_volume_min = Math.min.apply(null, data.map(function(d) {
            return d.quote_asset_volume;
        }));

        let quote_asset_volume_max = Math.max.apply(null, data.map(function(d) {
            return d.quote_asset_volume;
        }));

        let number_trades_min = Math.min.apply(null, data.map(function(d) {
            return d.number_trades;
        }));

        let number_trades_max = Math.max.apply(null, data.map(function(d) {
            return d.number_trades;
        }));

        let taker_buy_base_asset_volume_min = Math.min.apply(null, data.map(function(d) {
            return d.taker_buy_base_asset_volume;
        }));

        let taker_buy_base_asset_volume_max = Math.max.apply(null, data.map(function(d) {
            return d.taker_buy_base_asset_volume;
        }));

        let taker_buy_quote_asset_volume_min = Math.min.apply(null, data.map(function(d) {
            return d.taker_buy_quote_asset_volume;
        }));

        let taker_buy_quote_asset_volume_max = Math.max.apply(null, data.map(function(d) {
            return d.taker_buy_quote_asset_volume;
        }));

        let rsi_min = Math.min.apply(null, data.map(function(d) {
            return d.rsi;
        }));

        let rsi_max = Math.max.apply(null, data.map(function(d) {
            return d.rsi;
        }));




        let finale = data.map(function(d) {

            return {
                open: (d.open - prices_min) / (prices_max - prices_min),
                high: (d.high - prices_min) / (prices_max - prices_min),
                low: (d.low - prices_min) / (prices_max - prices_min),
                close: (d.close - prices_min) / (prices_max - prices_min),
                volume: (d.volume - volume_min) / (volume_max - volume_min),
                quote_asset_volume: (d.quote_asset_volume - quote_asset_volume_min) / (quote_asset_volume_max - quote_asset_volume_min),
                number_trades: (d.number_trades - number_trades_min) / (number_trades_max - number_trades_min),
                taker_buy_base_asset_volume: (d.taker_buy_base_asset_volume - taker_buy_base_asset_volume_min) / (taker_buy_base_asset_volume_max - taker_buy_base_asset_volume_min),
                taker_buy_quote_asset_volume: (d.taker_buy_quote_asset_volume - taker_buy_quote_asset_volume_min) / (taker_buy_quote_asset_volume_max - taker_buy_quote_asset_volume_min),
                rsi: (d.rsi - rsi_min) / (rsi_max - rsi_min),
                //gli ema vanno normalizzati per prezzo minimo e massimo, perchè sono prezzi comunque
                ema: (d.ema - prices_min) / (prices_max - prices_min),
                ema_25: (d.ema_25 - prices_min) / (prices_max - prices_min),
                ema_99: (d.ema_99 - prices_min) / (prices_max - prices_min),
                hour_trend: d.hour_trend,
                ema_alert: d.ema_alert,
                rsi_alert: d.rsi_alert,
            };
        });

        return finale;

    },
    normalizza_dati_bak: function(data) {

        //normalizzazioni da fare
        /* open: parseFloat(d[1]),
         high: parseFloat(d[2]),
         low: parseFloat(d[3]),
         close: parseFloat(d[4]),
         volume: parseFloat(d[5]),
         quote_asset_volume: parseFloat(d[7]),
         number_trades: parseFloat(d[8]),
         taker_buy_base_asset_volume: parseFloat(d[9]),
         taker_buy_quote_asset_volume: parseFloat(d[10])*/

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

        let quote_asset_volume_min = Math.min.apply(null, data.map(function(d) {
            return d.quote_asset_volume;
        }));

        let quote_asset_volume_max = Math.max.apply(null, data.map(function(d) {
            return d.quote_asset_volume;
        }));

        let number_trades_min = Math.min.apply(null, data.map(function(d) {
            return d.number_trades;
        }));

        let number_trades_max = Math.max.apply(null, data.map(function(d) {
            return d.number_trades;
        }));

        let taker_buy_base_asset_volume_min = Math.min.apply(null, data.map(function(d) {
            return d.taker_buy_base_asset_volume;
        }));

        let taker_buy_base_asset_volume_max = Math.max.apply(null, data.map(function(d) {
            return d.taker_buy_base_asset_volume;
        }));

        let taker_buy_quote_asset_volume_min = Math.min.apply(null, data.map(function(d) {
            return d.taker_buy_quote_asset_volume;
        }));

        let taker_buy_quote_asset_volume_max = Math.max.apply(null, data.map(function(d) {
            return d.taker_buy_quote_asset_volume;
        }));

        let rsi_min = Math.min.apply(null, data.map(function(d) {
            return d.rsi;
        }));

        let rsi_max = Math.max.apply(null, data.map(function(d) {
            return d.rsi;
        }));




        let finale = data.map(function(d) {

            return {
                open: (d.open - prices_min) / (prices_max - prices_min),
                high: (d.high - prices_min) / (prices_max - prices_min),
                low: (d.low - prices_min) / (prices_max - prices_min),
                close: (d.close - prices_min) / (prices_max - prices_min),
                volume: (d.volume - volume_min) / (volume_max - volume_min),
                quote_asset_volume: (d.quote_asset_volume - quote_asset_volume_min) / (quote_asset_volume_max - quote_asset_volume_min),
                number_trades: (d.number_trades - number_trades_min) / (number_trades_max - number_trades_min),
                taker_buy_base_asset_volume: (d.taker_buy_base_asset_volume - taker_buy_base_asset_volume_min) / (taker_buy_base_asset_volume_max - taker_buy_base_asset_volume_min),
                taker_buy_quote_asset_volume: (d.taker_buy_quote_asset_volume - taker_buy_quote_asset_volume_min) / (taker_buy_quote_asset_volume_max - taker_buy_quote_asset_volume_min),
                rsi: (d.rsi - rsi_min) / (rsi_max - rsi_min),
                //gli ema vanno normalizzati per prezzo minimo e massimo, perchè sono prezzi comunque
                ema: (d.ema - prices_min) / (prices_max - prices_min),
                ema_25: (d.ema_25 - prices_min) / (prices_max - prices_min),
                ema_99: (d.ema_99 - prices_min) / (prices_max - prices_min),
                hour_trend: d.hour_trend,
            };
        });

        return finale;

    },

    normalizza_dati_backup: function(data) {


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

        let ema_25_min = Math.min.apply(null, data.map(function(d) {
            return Math.min.apply(null, [d.ema_25]);
        }));

        let ema_25_max = Math.max.apply(null, data.map(function(d) {
            return Math.max.apply(null, [d.ema_25]);
        }));

        let ema_99_min = Math.min.apply(null, data.map(function(d) {
            return Math.min.apply(null, [d.ema_99]);
        }));

        let ema_99_max = Math.max.apply(null, data.map(function(d) {
            return Math.max.apply(null, [d.ema_99]);
        }));



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
                ema_25: (d.ema_25 - ema_25_min) / (ema_25_max - ema_25_min),
                ema_99: (d.ema_99 - ema_99_min) / (ema_99_max - ema_99_min),
                ema_alert: d.ema_alert,
                ema_25_trend: d.ema_25_trend,
                ema_99_trend: d.ema_99_trend,
            };
        });

        //console.log("FINALE", finale);

        return finale;

    }
}