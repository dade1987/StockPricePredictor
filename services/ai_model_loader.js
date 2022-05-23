module.exports = {

    load_model: async function(model_name, market_name, time_interval, currency_pair_1, currency_pair_2, time_steps, epochs_number, optimizer) {

        console.log("MODEL LOADING...");

        let model = await tf.loadLayersModel('file://' + process.cwd() + '/ai_models/' + model_name + market_name + time_interval + currency_pair_1 + currency_pair_2 + time_steps + epochs_number + '/model.json');

        model.summary();

        //default is linear regressor
        if (model_name === '') {

            /* compiling model with optimizer, loss and metrics */
            /* meglio con queste 2 loss assieme, oppure con meanabsolute */
            model.compile({
                optimizer: optimizer,
                loss: 'binaryCrossentropy',
                metrics: ['accuracy'] /*[tf.metrics.meanAbsoluteError, tf.losses.meanSquaredError]*/
            });
        } else if (model_name === 'multiClassClassifier') {
            model.compile({
                loss: 'categoricalCrossentropy',
                optimizer: optimizer
            });
        }

        return model;
    }
}