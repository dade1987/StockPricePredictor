import io from 'socket.io-client';

const socket =
        io('http://localhost:9157',
                {reconnectionDelay: 300, reconnectionDelayMax: 300});

const predictButton = document.getElementById('predict-button');

predictButton.onclick = () => {
    predictButton.disabled = true;
    socket.emit('predict');
};

socket.on('predictResult', ([result]) => {
    grafico(result[0], result[1]);
});

function grafico(realResults, predictions)
{
    tfvis.render.linechart(
            {name: 'Real Predictions'},
            {values: [realResults, predictions], series: ['original', 'predicted']},
            {
                xLabel: 'contatore',
                yLabel: 'prezzo',
                height: 300,
                zoomToFit: true
            }
    );
}