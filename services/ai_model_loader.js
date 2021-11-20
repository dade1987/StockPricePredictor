module.exports = {

    load_model: async function (market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, optimizer) {

        let model = await tf.loadLayersModel('file://' + process.cwd() + '/' + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '/model.json')

        console.log("LOAD MODEL", 'file://' + process.cwd() + '/' + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '/model.json');

        model.summary();

        /* compiling model with optimizer, loss and metrics */
        /* meglio con queste 2 loss assieme, oppure con meanabsolute */
        model.compile({

            optimizer: optimizer,
            loss: tf.losses.meanSquaredError,
            metrics: [tf.losses.meanSquaredError] /*[tf.metrics.meanAbsoluteError, tf.losses.meanSquaredError]*/

        });

        return model;
    }
}