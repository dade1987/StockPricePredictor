//test
const dotenv = require('dotenv');
dotenv.config();

const https = require('https');

const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const RSI = require('technicalindicators').RSI;
const MACD = require('technicalindicators').MACD;
const SMA = require('technicalindicators').SMA;
const ATR = require('technicalindicators').ATR;

const Binance = require('binance-api-node').default

const client = Binance({
    apiKey: process.env.BINANCE_SPOT_KEY,
    apiSecret: process.env.BINANCE_SPOT_SECRET
});


//per avviare
//NODE_TLS_REJECT_UNAUTHORIZED='0' node screener_cripto.js

//altro sito per sentiment
//https://lunarcrush.com/coins/hard/hard-protocol
//https://www.bittsanalytics.com/sentiment-index/ETC
//https://it.investing.com/indices/investing.com-etc-usd-scoreboard

async function accountLongInSalita(pair, period) {
    let url = "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=" + pair + "&period=" + period;
    //console.log(url);

    return new Promise((resolve, reject) => {

        let request = https.get(url, function(res) {
            let data = '';
            let json_data;
            let longSentiment = null;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                //console.log(data);
                json_data = JSON.parse(data);
                //console.log(url);
                if (json_data.length > 0) {
                    //il sentiment dev'essere positivo (se è maggiore di 1 vuol dire che è long sentiment perchè la ratio è long% / short%)
                    if (json_data[json_data.length - 1].longShortRatio > 1) {
                        longSentiment = true;
                    } else if (json_data[json_data.length - 1].longShortRatio < 1) {
                        longSentiment = false;
                    }
                    //dev'essere in discesa la long short ratio (più è bassa e più stanno comprando)
                    /*if (json_data[json_data.length - 1].longShortRatio < json_data[json_data.length - 2].longShortRatio) {
                        longSentiment = true;
                    }*/
                }
                resolve(longSentiment);
            });
        });
    });
}

/*async function takerBuyInSalita(pair, period) {
    let url = "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=" + pair + "&period=" + period;
    //console.log(url);

    return new Promise((resolve, reject) => {

        let request = https.get(url, function(res) {
            let data = '';
            let json_data;
            let longSentiment = null;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {
                //console.log(data);
                json_data = JSON.parse(data);
                //console.log(url);
                if (json_data.length > 0) {
                    //dev'essere in salita il volume comprato dai taker
                    
                    if (json_data[json_data.length - 1].buyVol > json_data[json_data.length - 2].buyVol) {
                        longSentiment = true;
                    } else if (json_data[json_data.length - 1].buyVol < json_data[json_data.length - 2].buyVol) {
                        longSentiment = false;
                    }
                }
                resolve(longSentiment);
            });
        });
    });
}*/

//client.time().then(time => console.log(time));
function sendEmails(arrayPrevisioni) {

    if (arrayPrevisioni.length >= 1) {
        //https://accounts.google.com/b/0/DisplayUnlockCaptcha
        //https://myaccount.google.com/lesssecureapps?pli=1&rapt=AEjHL4NYr5y8RROZO7eLBzjF2f8PGfg126pf9yTndhB2KH-wTgTt78naKJmbWEKuwOr87fBT4CafM8fnOTL1OJYgv5MqVShOWQ

        //li metterò in MySql in futuro, se ci sarà un futuro
        let emails = process.env.EMAIL_LIST.split(',');

        var transporter = nodemailer.createTransport(smtpTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        }));


        let html = '<h1>Previsioni:</h1>';
        html += '<ul>';
        arrayPrevisioni.forEach(v => {
            //arrayPrevisioni.push({ azione: "COMPRA", simbolo: market.symbol, tp: AverageTrueRange[AverageTrueRange.length - 1] + 1.5, sl: AverageTrueRange[AverageTrueRange.length - 1] - 1.5 });

            html += '<li>';
            html += 'Azione:' + v.azione + '<br>';
            html += 'Coppia:' + v.simbolo + '<br>';
            html += 'Base Asset: ' + v.base_asset + '<br>'
            html += 'Prezzo Attuale:' + v.price + '<br>';
            html += 'Prezzo Take Profit:' + v.tp + '<br>';
            html += 'Prezzo Stop Loss: ' + v.sl + ' <br> ';
            html += 'Variazione Oggi: ' + v.var_perc + '%<br>'
            html += 'RSI: ' + v.RSI + '<br>';
            html += '</li><br>';

        });
        html += '</ul><br>';

        html += '<h3>Cosa guardare per Analisi fondamentale:</h3>'
        html += '<ul>';
        html += '<li>INDICATORI DI ANALISI FONDAMENTALE</li>'
        html += '<li>Rapporto NVT (> 150 O TREND IN CRESCITA IPERCOMPRATO, < 45 O TREND DIMINUZIONE IPERVENDUTO</li>';
        html += '<li>Rapporto MVRV (> 3.5 LONG,< 1.0 SHORT):</li>'
        html += '<li>Modello Stock To Flow (VEDERE COLORI)</li>';
        html += '<br>';
        html += '<li>ALTRE COSE POSSIBILI DA GUARDARE</li>';
        html += '<li>Indicatori on-chain: Coinmarketcap (https://coinmarketcap.com/currencies/bitcoin/onchain-analysis/)</li>';
        html += '<li>Numero  di trades da unico trader in un certo periodo</li>';
        html += '<li>Valore totale dei trades in un certo periodo</li>'
        html += '<li>Indirizzi attivi</li>';
        html += '<li>Commissioni pagate (anche ai miners)</li>';
        html += '<li>Hash rate che dev\'essere alto</li>';
        html += '<li>Quatità di moneta in staking</li>';
        html += '<li>Whitepaper e punti critici del progetto</li>';
        html += '<li>Team, incluso il loro passato nel settore, esperienza, truffe, competenze</li>';
        html += '<li>Capire se ci sono progetti concorrenti simili ma migliori</li>';
        html += '<li>Distribuzione iniziale dei token, per capire se è troppo centralizzato il mercato</li>';
        html += '<li>Vedere se vengono generati tokens inutilmente</li>';
        html += '<li>Capitalizzazione di mercato stimata</li>';
        html += '<li>Liquidità e relativo spread bid-ask</li>';
        html += '<li>Offerta massima, offerta in circolazione e il tasso di inflazione</li>';

        html += '</ul>';
        html += '<br>';
        html += '<h3>E\' sempre consigliato guardare le notizie, l\'order book, le resistenze/supporti, e fare le proprie valutazioni prima di investire.</h3>'
        html += '<h2>Se questo servizio ti piace, consiglialo a un tuo amico, e comunicaci la sua email.<br>Il servizio è esclusivo ed è accessibile solo tramite invito personale.</h2>';

        emails.forEach(email => {
            let mailOptions = {
                from: process.env.EMAIL_FROM,
                to: email,
                subject: 'Previsioni di Mercato da Davide Cavallini',
                html: html
            }

            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email Inviata: ' + info.response);
                }
            });
        });

    }

}

function testEmail() {


    //https://accounts.google.com/b/0/DisplayUnlockCaptcha
    //https://myaccount.google.com/lesssecureapps?pli=1&rapt=AEjHL4NYr5y8RROZO7eLBzjF2f8PGfg126pf9yTndhB2KH-wTgTt78naKJmbWEKuwOr87fBT4CafM8fnOTL1OJYgv5MqVShOWQ

    let emails = process.env.EMAIL_FROM.split(',');

    var transporter = nodemailer.createTransport(smtpTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    }));


    let html = '<h1>TEST</h1>';

    emails.forEach(email => {
        let mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Test Email da Davide Cavallini',
            html: html
        }

        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email Inviata: ' + info.response);
            }
        });
    });


}

function calculateAbsPercVariation(values, period) {

    if (values.length < 2) throw new Error("No sufficient inputs");

    values = values.slice(period * -1);

    let percentageArray = [];

    for (let i = 1; i < values.length; i++) {
        percentageArray.push(100 * Math.abs((values[i] - values[i - 1]) / ((values[i] + values[i - 1]) / 2)));
    }

    return percentageArray;

}

function calculateMedian(values) {

    if (values.length === 0) throw new Error("No inputs");

    values.sort(function(a, b) {
        return a - b;
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;

}

function isEmptyJson(obj) {
    for (var prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            return false;
        }
    }

    return JSON.stringify(obj) === JSON.stringify({});
}

async function calculateNVTRatio(symbol) {
    //Dato fondamentale On Chain per criptovalute

    //NVT SIGNAL (DA FARE)
    //se sopra 150 ipercomprato
    //se sotto 45 ipervenduto
    //se intermedio bilanciato

    //CALCOLO NVT DOC=https://blog.cryptocompare.com/how-to-calculate-nvt-ratios-with-the-cryptocompare-api-870d6d6b3c86
    //https://steemit.com/ita/@grendelorr/nvt-ratio-e-nvt-signal-indicatori-per-la-blockchain-per-individuare-le-bolle-speculative-e-gli-alti-bassi
    //https://min-api.cryptocompare.com/documentation?key=Blockchain&cat=blockchainDay

    let url = "https://min-api.cryptocompare.com/data/blockchain/histo/day?api_key=" + process.env.CRYPTO_COMPARE_API + "&limit=200&fsym=" + symbol.replace('USDT', '');
    //console.log(url);

    return new Promise((resolve, reject) => {

        let request = https.get(url, function(res) {
            let data = '';
            let json_data;
            let NVT = null;

            res.on('data', function(stream) {
                data += stream;
            });
            res.on('end', function() {

                json_data = JSON.parse(data);

                //console.log(url);
                if (isEmptyJson(json_data) === false && isEmptyJson(json_data.Data) === false && isEmptyJson(json_data.Data.Data) === false && json_data.Data.Data.length > 30) {

                    let NVTArray = json_data.Data.Data.map(v => Number(v.current_supply) / Number(v.transaction_count) / Number(v.average_transaction_value));

                    //console.log("NVTArray", NVTArray);

                    NVT = NVTArray[NVTArray.length - 1];

                    //console.log("NVT", NVT);

                    //di solito si calcola in 90 giorni
                    let smaNVT = SMA.calculate({
                        period: 90,
                        values: NVTArray
                    });

                    if (!isNaN(NVT) && isFinite(NVT)) {
                        //console.log("NVT", NVT, "SMA", smaNVT[smaNVT.length - 1], "SMA TREND", smaNVT[smaNVT.length - 1] - smaNVT[smaNVT.length - 2]);

                        /*if (NVT > 150) {
                            //vai short
                            NVT = false;
                        } else if (NVT < 45) {
                            //vai long
                            NVT = true;
                        } else {*/
                        //equilibrato cioè null (vale per entrambe)
                        //si può guardare il trend però del mese

                        if (smaNVT[smaNVT.length - 1] - smaNVT[smaNVT.length - 2] > 0) {
                            //se è uptrend è false
                            NVT = false;
                        } else if (smaNVT[smaNVT.length - 1] - smaNVT[smaNVT.length - 2] < 0) {
                            //se è downtrend è true
                            NVT = true;
                        } else {
                            //sennò è equilibrato (null)
                        }
                        /*}*/
                    }

                }

                resolve(NVT);
            });
        });
    });




}

async function bootstrap() {

    let arrayPrevisioni = [];

    console.log("---------------------------------------------------------------------------");
    console.log(new Date());

    let info = await client.exchangeInfo();

    let symbols = info.symbols;

    for (let market of symbols) {

        if (market.symbol.slice(-4) === "USDT" && market.status === "TRADING" && market.isSpotTradingAllowed === true) {

            let market_actual_stats;
            //console.log("\n\n", market);
            //per diversificare gli investimenti

            console.log("\nSIMBOLO", market.symbol);

            //let NVT_status = await calculateNVTRatio(market.symbol);


            console.log("ASSET SOTTOSTANTE", market.baseAsset);
            //vedo se il sentiment degli ultimi 5 minuti è in long
            //valutare se è meglio un trend in salita nei 15 minuti o il fatto che sia in long in sentiment, o entrambe
            //che però diminuiscono le probabilità di condizione vera
            //messa dopo l'if delle condizioni calcolate
            let marketLongSentiment = false;
            //let takerBuySentiment = await takerBuyInSalita(market.symbol, "30m");



            //dev'essere almeno 200 altrimenti è impossibile calcolare la SMA200
            //senza limite sono 500 dati
            let rawPrices = await client.candles({ symbol: market.symbol, interval: '30m' /*, limit: 300 */ });
            // console.log("TEST", rawPrices.slice(-1), rawPrices.slice(-1), new Date(rawPrices.slice(-1)[0].closeTime));
            /* market_actual_stats = await client.dailyStats({ symbol: market.symbol });
             console.log(market_actual_stats);*/
            //è giusto. prende l'orario che ancora deve chiudere
            //testato col sito https://24timezones.com/fuso-orario/gmt
            //console.log("TEST", new Date(rawPrices.slice(-1)[0].openTime), new Date(rawPrices.slice(-1)[0].closeTime));



            let askClosePrices = rawPrices.map((v) => { return Number(v.close) });

            console.log("PRICES LENGTH", askClosePrices.length);

            //se ci sono abbastanza prezzi da fare i calcoli, altrimenti si blocca l'esecuzione del programma
            if (askClosePrices.length > 201) {
                let medianPercDifference = calculateMedian(calculateAbsPercVariation(askClosePrices, 14));
                //console.log("MEDIAN", medianPercDifference);

                /*let askHighPrices = rawPrices.map((v) => { return Number(v.high) });
                let askLowPrices = rawPrices.map((v) => { return Number(v.low) });*/
                //console.log(askClosePrices);

                /*var period = 14

                var input = {
                    high: askHighPrices,
                    low: askLowPrices,
                    close: askClosePrices,
                    period: period
                }*/

                //average true range per mettere stop loss e take profit
                //let AverageTrueRange = ATR.calculate(input);

                //console.log("ATR", AverageTrueRange[AverageTrueRange.length - 1], askClosePrices[askClosePrices.length - 1], ATR.reverseInputs());


                //attenzione. nel caso cripto i mercati devono essere liquidi quindi devono avere volumi scambiati alti
                //altrimenti si rischia che lo spread tra ask e bid sia troppo alto

                //TREND MINORE SMA50 RIBASSISTA
                let smaMinore = SMA.calculate({
                    period: 50,
                    values: askClosePrices
                });

                let trendMinoreRibassista = smaMinore[smaMinore.length - 1] < smaMinore[smaMinore.length - 2];
                let trendMinoreRialzista = smaMinore[smaMinore.length - 1] > smaMinore[smaMinore.length - 2];
                console.log("TREND MINORE RIBASSISTA", trendMinoreRibassista);
                console.log("TREND MINORE RIALZISTA", trendMinoreRialzista);

                //TREND MAGGIORE RIALZISTA
                let smaMaggiore = SMA.calculate({
                    period: 200,
                    values: askClosePrices
                });

                let trendMaggioreRialzista = smaMaggiore[smaMaggiore.length - 1] > smaMaggiore[smaMaggiore.length - 2];
                let trendMaggioreRibassista = smaMaggiore[smaMaggiore.length - 1] < smaMaggiore[smaMaggiore.length - 2];

                console.log("TREND MAGGIORE RIALZISTA", trendMaggioreRialzista);
                //console.log("TREND MAGGIORE RIBASSISTA", trendMaggioreRibassista);


                //CALCOLO RSI RIALZISTA (<30)
                let rsi = RSI.calculate({
                    period: 14,
                    values: askClosePrices
                });

                let rsiRialzista = rsi[rsi.length - 1] < 30;
                let rsiRibassista = rsi[rsi.length - 1] > 70;

                console.log("RSI", rsi[rsi.length - 1]);
                console.log("RSI RIALZISTA", rsiRialzista);
                console.log("RSI RIBASSISTA", rsiRibassista);


                var macdInput = {
                    values: askClosePrices,
                    fastPeriod: 8,
                    slowPeriod: 21,
                    signalPeriod: 5,
                    //è giusto così
                    SimpleMAOscillator: false,
                    SimpleMASignal: false
                }

                let macd = MACD.calculate(macdInput);

                //SUPERAMENTO MACD
                let segnaleSuperaMACD = macd[macd.length - 1].signal > macd[macd.length - 1].MACD;
                let segnaleSuperaMACDBasso = macd[macd.length - 1].signal < macd[macd.length - 1].MACD;

                console.log("SEGNALE SUPERA MACD", segnaleSuperaMACD);
                //console.log("SEGNALE SUPERA MACD BASSO", segnaleSuperaMACDBasso);

                //INCROCIO MACD
                //let segnaleSuperaIncrociaMACD = macd[macd.length - 2].signal < macd[macd.length - 2].MACD && macd[macd.length - 1].signal > macd[macd.length - 1].MACD;
                //console.log("SEGNALE INCROCIA MACD", segnaleSuperaIncrociaMACD);

                //è giusto trend minore ribassista e maggiore rialzista secondo Alyssa
                let marketSentimentPeriod = '30m';
                if (trendMinoreRibassista === true && trendMaggioreRialzista === true && rsiRialzista === true && segnaleSuperaMACD === true) {

                    //solo se si verificano le altre condizioni, altrimenti è troppo dispendioso di tempo
                    //fare una richiesta https
                    marketLongSentiment = await accountLongInSalita(market.symbol, marketSentimentPeriod);

                    console.log("MARKET SENTIMENT LONG", marketLongSentiment);

                    if (marketLongSentiment === true) {

                        let NVT_status = await calculateNVTRatio(market.symbol);

                        console.log("NVT_status", NVT_status);

                        if (NVT_status === true || NVT_status === null) {

                            market_actual_stats = await client.dailyStats({ symbol: market.symbol });
                            console.log("ULTIMO PREZZO", market_actual_stats.lastPrice, "VARIAZIONE PERCENTUALE OGGI", market_actual_stats.priceChangePercent);

                            console.log("TYPEOF", typeof(market_actual_stats.priceChangePercent));

                            //if (market_actual_stats.priceChangePercent > 0) {
                            //console.log(market.symbol);
                            let closeTime = new Date(rawPrices[rawPrices.length - 1].closeTime);
                            console.log(closeTime, rawPrices[rawPrices.length - 1].closeTime);
                            console.log("AZIONE LONG", market.symbol, "PREZZO", rawPrices[rawPrices.length - 1].close);

                            arrayPrevisioni.push({ azione: "LONG", simbolo: market.symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 - medianPercDifference), base_asset: market.baseAsset, var_perc: market_actual_stats.priceChangePercent, RSI: rsi[rsi.length - 1] });
                            //}
                        }
                    } //else if (marketLongSentiment === null) {

                    /*let closeTime = new Date(rawPrices[rawPrices.length - 1].closeTime);
                    console.log(closeTime, rawPrices[rawPrices.length - 1].closeTime);
                    console.log("AZIONE LONG", market.symbol, "PREZZO", rawPrices[rawPrices.length - 1].close);

                    arrayPrevisioni.push({ azione: "POSSIBILE LONG", simbolo: market.symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 - medianPercDifference), base_asset: market.baseAsset, var_perc: market_actual_stats.priceChangePercent, RSI: rsi[rsi.length - 1] });*/
                    //}
                    //console.log("\n");
                } else if (trendMinoreRialzista === true && trendMaggioreRibassista === true && rsiRibassista === true && segnaleSuperaMACDBasso === true) {
                    //console.log(market.symbol);

                    marketLongSentiment = await accountLongInSalita(market.symbol, marketSentimentPeriod);

                    console.log("MARKET SENTIMENT SHORT", marketLongSentiment);

                    if (marketLongSentiment === false) {

                        let NVT_status = await calculateNVTRatio(market.symbol);

                        console.log("NVT_status", NVT_status);

                        if (NVT_status === false || NVT_status === null) {

                            market_actual_stats = await client.dailyStats({ symbol: market.symbol });
                            console.log("ULTIMO PREZZO", market_actual_stats.lastPrice, "VARIAZIONE PERCENTUALE OGGI", market_actual_stats.priceChangePercent);
                            console.log("TYPEOF", typeof(market_actual_stats.priceChangePercent));

                            //if (market_actual_stats.priceChangePercent < 0) {
                            let closeTime = new Date(rawPrices[rawPrices.length - 1].closeTime);
                            console.log(closeTime, rawPrices[rawPrices.length - 1].closeTime);
                            console.log("AZIONE SHORT", market.symbol, "PREZZO", rawPrices[rawPrices.length - 1].close);
                            arrayPrevisioni.push({ azione: "SHORT", simbolo: market.symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 - medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), base_asset: market.baseAsset, var_perc: market_actual_stats.priceChangePercent, RSI: rsi[rsi.length - 1] });
                            //}
                        }
                    } //else if (marketLongSentiment === null) {
                    /*let closeTime = new Date(rawPrices[rawPrices.length - 1].closeTime);
                    console.log(closeTime, rawPrices[rawPrices.length - 1].closeTime);
                    console.log("AZIONE SHORT", market.symbol, "PREZZO", rawPrices[rawPrices.length - 1].close);
                    arrayPrevisioni.push({ azione: "POSSIBILE SHORT", simbolo: market.symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 - medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), base_asset: market.baseAsset, var_perc: market_actual_stats.priceChangePercent, RSI: rsi[rsi.length - 1] });*/
                    //}
                } else {
                    //console.log(market.symbol);
                }
            }
        }

    }

    sendEmails(arrayPrevisioni);

    console.log("Fine del Giro");

    //process.exit();
}


//ogni mezz'ora
const roundTo = roundTo => x => Math.round(x / roundTo) * roundTo;
const roundUpTo = roundTo => x => Math.ceil(x / roundTo) * roundTo;
const roundUpTo30Minutes = roundUpTo(1000 * 60 * 30);
let next_minute_date = roundUpTo30Minutes(new Date()) + 1000;

let current_date = Date.now();
let wait_fist_time = next_minute_date - current_date;

testEmail();

//ABILITARE SOLO PER TEST
//bootstrap();

let timeout = setTimeout(function() {
    bootstrap();
    interval = setInterval(function() {
        bootstrap();
    }, 1800000);
}, wait_fist_time);