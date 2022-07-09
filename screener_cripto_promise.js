"use strict";

//TESTATO SENZA MAI AVER SBAGLIATO IL 10 GIUGNO 2022 TUTTO IL GIORNO
const dotenv = require('dotenv');
dotenv.config();

const sound = require("sound-play");

const https = require('https');

const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const RSI = require('technicalindicators').RSI;
const MACD = require('technicalindicators').MACD;
const SMA = require('technicalindicators').SMA;
const ATR = require('technicalindicators').ATR;

const Binance = require('binance-api-node').default
const Kucoin = require('kucoin-node-api');
const { raw } = require('express');

let clients = [];
process.env.BINANCE_SPOT_KEY.split(",").forEach((v, i) => {
    clients.push(Binance({
        apiKey: process.env.BINANCE_SPOT_KEY.split(",")[i],
        apiSecret: process.env.BINANCE_SPOT_SECRET.split(",")[i]
    }));
});

//client principale
const client = clients[0];


const kucoinConfig = {
    apiKey: process.env.KUCOIN_KEY,
    secretKey: process.env.KUCOIN_SECRET,
    passphrase: process.env.KUCOIN_PASS,
    environment: 'live'
}

Kucoin.init(kucoinConfig);

let sound_disabled = false;
let emails_disabled = true;
let trade_debug_enabled = false;

function roundByLotSize(value, step) {
    step || (step = 1.0);
    var inv = 1.0 / step;
    return Math.round(value * inv) / inv;
}

//per arrotondare bene invece che con toFixed che arrotonda a cavolo di cane
function roundByDecimals(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

//per contare i decimali della tick size
Number.prototype.countDecimals = function() {
    try {
        if (Math.floor(this.valueOf()) === this.valueOf()) return 0;
        return this.toString().split(".")[1].length || 0;
    } catch (exception) {
        console.log("Exception", exception, "This", this);
    }
}

String.prototype.countDecimals = function() {
    //calcola decimali nella tickSize
    try {
        //console.log("\n");

        let splittedNum = this.split(".");
        //console.log(splittedNum);
        if (splittedNum[1] !== undefined) {
            let text = splittedNum[1];
            let length = text.length;
            for (let i = length - 1; i >= 0; i--) {
                //console.log(i, text[i]);
                if (text[i] === "0") {
                    text = text.slice(0, i);
                } else {
                    break;
                }
            }
            return text.length;
        } else {
            return 0;
        }

    } catch (exception) {
        console.log("Exception", exception, "This", this);
    }
}


async function playBullSentiment(bypass) {
    const path = require("path");
    const filePath = path.join(__dirname, "bull_sentiment.mp3");

    //di notte non deve riprodurre suoni sennò fai un infarto
    let ora = new Date().getHours();

    //solo ai minuti 30 fa il verso del toro
    let minuti = new Date().getMinutes();

    if (bypass === true) {
        if (sound_disabled === false) {
            //console.log(filePath);
            sound.play(filePath);
        }
    } else if (ora < 22 && ora > 9) {
        //if (minuti >= 30 && minuti <= 34) {
        if (sound_disabled === false) {
            //console.log(filePath);
            sound.play(filePath);
        }
        //}
    }
}



function piazzaOrdineOco(simbolo, quantity, takeProfit, stopLossTrigger, stopLoss, ocoAttemps, single_client, callback) {
    //proviamo così a vedere se lo esegue
    /*Non sempre lo esegue giusto
        Bisogna sistemare questo errore:

        VALUTAZIONE ORDINE SALDO USDT 182.316578292 SIMBOLO BURGERUSDT QUANTITA 115.1 MEDIANA 1.1117287381878833 TAKE PROFIT 1.602 STOP LOSS 1.565 TICK SIZE 0.00100000 TICK SIZE DECIMALS 3
        
        VALUTAZIONE ORDINE 2 SL 1.562 SL Trigger 1.565 TP 1.602 DIFF TP 0.018000000000000016 DIFF SL 0.02200000000000002 DIFF SL/2 0.01100000000000001 DIFF SL*1.5 0.03300000000000003 CONDITION true

        BURGERUSDT ultimeCandele [ true, true, true, true ]

        APERTURA ORDINE SIMBOLO BURGERUSDT QUANTITA 115.1 MEDIANA 1.1117287381878833 TAKE PROFIT 1.602 STOP LOSS 1.565 TICK SIZE 0.00100000 TICK SIZE DECIMALS 3

        ORDINI APERTI PER BURGERUSDT [] 0

        no1 BURGERUSDT Error: Account has insufficient balance for requested action.
        at C:\var\www\StockPricePredictor\node_modules\binance-api-node\dist\http-client.js:100:17
        at processTicksAndRejections (node:internal/process/task_queues:96:5) {
        code: -2010,
        url: 'https://api.binance.com/api/v3/order/oco?stopLimitTimeInForce=GTC&symbol=BURGERUSDT&side=SELL&quantity=115.1&price=1.602&stopPrice=1.565&stopLimitPrice=1.562&timestamp=1657341088171&signature=9e743dfbe432fb8caae6d75accedacaaf088f6bc016393cf5f0f4a1826b1283b'
        }
    */
    console.log("trying placing OCO", simbolo, quantity);

    //c'è un errore. se il prezzo è sotto quello dello stopLoggTrigger deve chiudere a Mercato
    //se la quantità è diversa bisogna capire come fare
    single_client.orderOco({
            symbol: simbolo,
            side: 'SELL',
            quantity: quantity,
            //take profit
            //si può calcolare su askprice o lastprice
            //meglio sull'ask price altrimenti guadagni talmente poco che spesso non copri neanche le commissioni
            //meglio su lastprice dato che le mediane vengono calcolate sui prezzi di chiusura medi
            price: takeProfit,
            //stop loss trigger and limit
            stopPrice: stopLossTrigger,
            //attenzione: non è detto che sia giusto impostarli uguali. forse in caso di slippage può saltare lo stop loss.
            stopLimitPrice: stopLoss
        }).then(response2 => {
            //console.log(response2);
            ocoAttemps = 0;
            callback([true, response2])
        })
        .catch((reason) => {

            console.log("error. trying replacing OCO", arrayPrevisioni.simbolo, reason, ocoAttemps);
            if (ocoAttemps < 10) {
                ocoAttemps++;
                setTimeout(function() {
                    piazzaOrdineOco(simbolo, quantity, takeProfit, stopLossTrigger, stopLoss, single_client, callback);
                }, 1000);

            } else {
                ocoAttemps = 0;
                callback([false, "maxOCOattempts reached"])
            }

        });
}

async function autoInvestiLong(arrayPrevisioniFull) {

    try {

        for (let single_client of clients) {

            //console.log(single_client);

            for (let arrayPrevisioni of arrayPrevisioniFull) {


                //questo serve solo in caso di conferma di tutte le altre condizioni
                client.exchangeInfo().then((e) => {

                    console.log("QUI");

                    //console.log("ok1",  arrayPrevisioni.simbolo);
                    let tickSize = e.symbols.filter(v => v.symbol === arrayPrevisioni.simbolo)[0].filters.filter(v => v.filterType === 'PRICE_FILTER')[0].tickSize;

                    //anche se è già una stringa è per capire
                    let tickSizeDecimals = tickSize.toString().countDecimals();

                    //console.log("ok2", arrayPrevisioni.simbolo);



                    //qui da il seguente errore
                    /*Error: Timestamp for this request was 1000ms ahead of the server's time.
                        at C:\var\www\StockPricePredictor\node_modules\binance-api-node\dist\http-client.js:100:17
                        at processTicksAndRejections (node:internal/process/task_queues:96:5)
                        at async autoInvestiLong (C:\var\www\StockPricePredictor\screener_cripto.js:273:31)
                        at async bootstrap (C:\var\www\StockPricePredictor\screener_cripto.js:1239:21) {
                        code: -1021,
                        url: 'https://api.binance.com/api/v3/account?timestamp=1657010501523&signature=c592cb5f1cf44864b11e4960c2077c0b41ae926b81def834bb36e66598dfaf58'
                        }*/

                    single_client.accountInfo().then(accountInfo => {

                        //console.log(accountInfo);
                        //meglio investire un po meno altrimenti si rischia che il prezzo cambi nel frattempo e il bilancio non basta più a fine ciclo
                        //meglio differenziare perchè almeno se perdi su una magari su un altra sale
                        //quindi meglio settare un importo che sia 1/3 del totale che si possiede


                        let UsdtAmount = accountInfo.balances.filter(v => v.asset === 'USDT')[0].free / 100 * 90;
                        //console.log("USDT Amount", UsdtAmount);
                        single_client.dailyStats({ symbol: arrayPrevisioni.simbolo }).then(symbolPrice => {

                            //segno di inversione rialzista
                            single_client.candles({ symbol: arrayPrevisioni.simbolo, interval: '1m', limit: 5 }).then((ultimeCandele) => {

                                //segno di inversione rialzista a 1 minuto
                                let ultimeCandeleArray = ultimeCandele.map((v) => { return Number(v.close) > Number(v.open) });


                                ultimeCandeleArray = ultimeCandeleArray.filter((v, i, a) => {

                                    return i > 0 && a[i] === true && a[i - 1] === true;

                                });

                                //TEST
                                //ultimeCandeleArray = [true];
                                console.log(arrayPrevisioni.simbolo, "ultimeCandele", ultimeCandeleArray);

                                if (ultimeCandeleArray.length > 0) {


                                    //console.log("Symbol Price", symbolPrice.askPrice, symbolPrice);
                                    let maxQty = UsdtAmount / Number(symbolPrice.askPrice);
                                    //console.log("Max Qty", maxQty);

                                    maxQty = roundByDecimals(roundByLotSize(maxQty, arrayPrevisioni.lotSize), arrayPrevisioni.baseAssetPrecision);

                                    //console.log('USDT AMOUNT', UsdtAmount, 'ARRAY PREVISIONI', arrayPrevisioni, 'SYMBOL PRICE', symbolPrice, 'ASK PRICE', symbolPrice.askPrice);
                                    console.log('VALUTAZIONE ORDINE', 'SALDO USDT', UsdtAmount, 'SIMBOLO', arrayPrevisioni.simbolo, 'QUANTITA', maxQty, 'MEDIANA', arrayPrevisioni.median, 'TAKE PROFIT', roundByDecimals((symbolPrice.askPrice / 100 * (100 + arrayPrevisioni.median)), tickSizeDecimals), 'STOP LOSS', roundByDecimals((symbolPrice.bidPrice / 100 * (100 - 1)), tickSizeDecimals), 'TICK SIZE', tickSize, 'TICK SIZE DECIMALS', tickSizeDecimals);
                                    //L'ask price è il prezzo minore a cui ti vendono la moneta
                                    //in realtà dovresti testare anche la quantità ma siccome per ora metto poco non serve

                                    //stop loss perc è -1.2% massimo. meglio seguire la regola del 2%
                                    //ovvero mai mettere a rischio più del 2% del capitale investito, per ogni operazione

                                    //rif. https://www.cmegroup.com/education/courses/trade-and-risk-management/the-2-percent-rule.html
                                    //rif. One popular method is the 2% Rule, which means you never put more than 2% of your account equity at risk (Table 1). For example, if you are trading a $50,000 account, and you choose a risk management stop loss of 2%, you could risk up to $1,000 on any given trade.
                                    let stop_loss_trigger_perc = 1;
                                    let stop_loss_perc = 1.2;
                                    //dato che la commissione è lo 0.1% basta che la mediana sia superiore alla commissione
                                    //APRO SOLO SE ALMENO LA PREVISIONE E' MAGGIORE DEL RISCHIO
                                    //COME SI SUOL DIRE: CHE ALMENO IL RISCHIO VALGA LA CANDELA
                                    //E' GIUSTO MAGGIORE PERCHE' DEVE SUPERARE NECESSARIAMENTE LA MEDIANA, NON SOLO EGUAGLIARLA IN CASO DI GUADAGNO



                                    let takeProfit = roundByDecimals((symbolPrice.askPrice / 100 * (100 + arrayPrevisioni.median)), tickSizeDecimals);

                                    let stopLossTrigger = roundByDecimals((symbolPrice.bidPrice / 100 * (100 - stop_loss_trigger_perc)), tickSizeDecimals);
                                    let stopLoss = roundByDecimals((symbolPrice.bidPrice / 100 * (100 - stop_loss_perc)), tickSizeDecimals);

                                    //per evitare rischi dovuti alla troppa volatilità. comunque proviamo /3 altrimenti non trova mai una condizione favorevole
                                    let condition = (takeProfit - symbolPrice.askPrice) >= ((symbolPrice.askPrice - stopLoss) / 3) && (takeProfit - symbolPrice.askPrice) <= ((symbolPrice.askPrice - stopLoss) * 1.5);

                                    console.log('VALUTAZIONE ORDINE 2', "SL", stopLoss, "SL Trigger", stopLossTrigger, "TP", takeProfit, "DIFF TP", (takeProfit - symbolPrice.askPrice), "DIFF SL", (symbolPrice.askPrice - stopLoss), "DIFF SL/2", ((symbolPrice.askPrice - stopLoss) / 2), "DIFF SL*1.5", ((symbolPrice.askPrice - stopLoss) * 1.5), "CONDITION", condition);

                                    if (UsdtAmount >= 25 && condition === true) {

                                        single_client.openOrders({ symbol: arrayPrevisioni.simbolo }).then(openOrders => {

                                            console.log("ORDINI APERTI PER " + arrayPrevisioni.simbolo, openOrders, openOrders.length);

                                            if (openOrders.length === 0) {

                                                console.log('APERTURA ORDINE', 'SIMBOLO', arrayPrevisioni.simbolo, 'QUANTITA', maxQty, 'MEDIANA', arrayPrevisioni.median, 'TAKE PROFIT', roundByDecimals((symbolPrice.askPrice / 100 * (100 + arrayPrevisioni.median)), tickSizeDecimals), 'STOP LOSS', roundByDecimals((symbolPrice.bidPrice / 100 * (100 - 1)), tickSizeDecimals), 'TICK SIZE', tickSize, 'TICK SIZE DECIMALS', tickSizeDecimals);
                                                playBullSentiment();

                                                single_client.order({
                                                    symbol: arrayPrevisioni.simbolo,
                                                    side: 'BUY',
                                                    type: 'MARKET',
                                                    quantity: maxQty
                                                }).then(response => {
                                                    //console.log(response)
                                                    piazzaOrdineOco(piazzaOrdineOco(arrayPrevisioni.simbolo, maxQty, takeProfit, stopLossTrigger, stopLoss, 0, single_client, function(cb) {
                                                        if (cb[0] === true) {
                                                            console.log("ORDINE OCO PIAZZATO");
                                                        } else {
                                                            console.log("no1", cb[1]);
                                                        }
                                                    }));
                                                }).catch((reason) => {
                                                    console.log("no2", arrayPrevisioni.simbolo, reason);
                                                });
                                            }
                                        }).catch((reason) => {
                                            console.log("no3", arrayPrevisioni.simbolo, reason);
                                        });
                                    }
                                }
                            }).catch(reason => {
                                console.log("no4", arrayPrevisioni.simbolo, reason);
                            });
                        }).catch((reason) => {
                            console.log("no5", arrayPrevisioni.simbolo, reason);
                        });
                    }).catch((reason) => {
                        //SINCRONIZZARE OROLOGIO SE DICE CHE E' 1000ms avanti rispetto al server di binance
                        console.log("no6", arrayPrevisioni.simbolo, reason);
                    });
                }).catch((reason) => {
                    console.log("no7", arrayPrevisioni.simbolo, reason);
                });
            };

        };
    } catch (reason) {
        console.log(reason);
    }

}


//client.time().then(time => console.log(time));
function sendEmails(arrayPrevisioni) {

    if (emails_disabled === false) {

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
                //html += 'Variazione Oggi: ' + v.var_perc + '%<br>'
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



function getPercentageChange(newNumber, oldNumber) {
    var decreaseValue = oldNumber - newNumber;

    return Math.abs((decreaseValue / oldNumber) * 100);
}

function calculateAbsPercVariationArray(values, period) {

    if (values.length < 2) throw new Error("No sufficient inputs");

    values = values.slice(period * -1);

    let percentageArray = [];

    for (let i = 1; i < values.length; i++) {
        percentageArray.push(getPercentageChange(values[i], values[i - 1]));
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

                    //NVT = NVTArray[NVTArray.length - 1];

                    //console.log("NVT", NVT);

                    //di solito si calcola in 14 giorni come RSI
                    let smaNVT = SMA.calculate({
                        period: 14,
                        values: NVTArray
                    });

                    if (!isNaN(smaNVT[smaNVT.length - 1]) && isFinite(smaNVT[smaNVT.length - 1])) {
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
                            NVT = -1;
                        } else if (smaNVT[smaNVT.length - 1] - smaNVT[smaNVT.length - 2] < 0) {
                            //se è downtrend è true
                            NVT = 1;
                        } else {
                            //sennò è equilibrato (null)
                            NVT = 0;
                        }
                        /*}*/
                    }

                }

                resolve(NVT);
            });
        });
    });
}



let simultaneousConnections = 0;
let prevSeconds = 0;
let connectionLimit = 0;
let time = 1000;

function promessa(market, exchangeName, callback) {


    let condizioneVerificata;
    if (exchangeName === "binance") {
        //inserire qui le coin da escludere (magari per notizie poco promettenti ecc)
        //ad esempio nel caso di MTL è stata esclusa perchè l'export dimetalli era molto in calo
        //escludo i BNB perchè mi servono per pagare le fees (commissioni)
        condizioneVerificata = /*symbols_whitelist.indexOf(market.symbol) !== -1 &&*/ market.symbol.slice(0, 3) !== "BNB" && market.symbol.slice(-4) === "USDT" && market.status === "TRADING" && market.isSpotTradingAllowed === true;

    }

    if (condizioneVerificata === true) {
        //console.log("simultaneousConnections", simultaneousConnections, market.symbol);
        //per raddoppiare la velocità
        //se metti + di 2 connessioni simultanee rischi di superare 
        //le 1200 richieste al minuto (all'8 luglio 2022 con la quantità di cripto che c'è)
        if (new Date().getSeconds() !== prevSeconds) {
            prevSeconds = new Date().getSeconds();
            connectionLimit = 0;
        }

        //console.log('connectionLimit', connectionLimit, 'simultaneousConnections', simultaneousConnections);

        //connectionLimit è il limite di connessioni al secondo
        //con la mia connessione (30mbps down 15mbps up) ce la fa, altrimenti va regolato per non fare troppe richieste
        if (simultaneousConnections < 3 && connectionLimit < 4) {

            //console.log('connectionLimit', 'passed', connectionLimit);
            //meglio mettere 210 nel reale altrimenti ci mette una vita a fare il ciclo

            let askClosePrices;
            let lotSize;

            //SE CHIEDI LE CANDELE A KUCOIN TOO MANY REQUESTS
            //SE LE CHIEDI A BINANCE A VOLTE MANCANO DEI SIMBOLI DI KUCOIN
            //BISOGNEREBBE VEDERE QUELLI IN COMUNE TRA I DUE
            //E COMUNQUE NON E' DETTO CHE SIANO IDENTICI
            if (exchangeName === "binance") {

                simultaneousConnections++;

                //una connessione è per le candele e un altra connessioone è per exchangeInfo
                connectionLimit += 1;

                //console.log(market.symbol);

                client.candles({ symbol: market.symbol, interval: '30m', limit: 210 }).then((rawPrices) => {

                    askClosePrices = rawPrices.map((v) => { return Number(v.close) });
                    lotSize = market.filters.filter(v => v.filterType === 'LOT_SIZE')[0].stepSize;

                    simultaneousConnections--;
                    callback([true, { 'symbol': market.symbol, 'baseAsset': market.baseAsset, 'baseAssetPrecision': market.baseAssetPrecision, 'rawPrices': rawPrices, 'askClosePrices': askClosePrices, 'lotSize': lotSize }]);
                    //console.log(market.symbol, "qui");
                }).catch((reason) => {
                    console.log("no1", market.symbol, reason);
                    simultaneousConnections--;
                    callback([false, reason]);
                });

            }
        } else {
            //time += 10;
            //console.log("ricorsione", market.symbol, typeof callback === 'function');
            setTimeout(function() { promessa(market, exchangeName, callback) }, time);
        }

    } else {
        callback([false, "non verificata"]);
    }


}

async function bootstrap() {

    let arrayPrevisioni = [];

    console.log("---------------------------------------------------------------------------");
    let binanceDate = new Date().toLocaleString();
    console.log("DATA", binanceDate);

    let exchangeName = "binance";

    let info, symbols;

    if (exchangeName === "binance") {
        //https://www.binance.com/en/markets/spot-USDT top volume and > 50 MILLIONS MARKET CAP AND INCREMENT 24 HOURS > 1 E < 5

        info = await client.exchangeInfo();
        symbols = info.symbols;
    } else if (exchangeName === "kucoin") {

        info = await Kucoin.getSymbols();
        symbols = info.data;
    }

    //console.log(info);
    //process.exit();


    for (let market of symbols) {

        //sono 2 richieste per ciclo e puoi farne massimo 1200
        //per sicurezza mettiamone un po in meno per lasciare spazio all'apertura ordini ecc

        //per provare a velocizzare le richieste
        new Promise((resolve, reject) => {

            promessa(market, exchangeName, function(result) {

                if (result[0] === true) {
                    //console.log(result);
                    resolve(result[1]);
                } else {
                    /*if (result[1] !== "non verificata") {
                        console.log(result[1]);
                    }*/
                    reject(result[1]);
                }
            });

        }).then(result => {

            let promiseModel = { value: result };


            //console.log(promiseModel.value);

            //process.env.exit();
            //allSettled vuol dire che aspetta anche tutti i rejects,
            //a differenza di Promise.all() che invece al primo reject si ferma
            //Promise.allSettled(arrayPromise).
            //then((results) => {

            //results = results.filter((v) => v.status !== 'rejected');

            //console.log("Promise Risolte: ", results.length);


            //results.forEach((promiseModel) => {

            //'symbol': market.symbol, 'baseAsset': market.baseAsset, 
            //'baseAssetPrecision': market.baseAssetPrecision, 
            //'rawPrices': rawPrices, 'askClosePrices': askClosePrices, 
            //'lotSize': lotSize

            //console.log(promiseModel.value);

            let symbol = promiseModel.value.symbol;
            let rawPrices = promiseModel.value.rawPrices;
            let askClosePrices = promiseModel.value.askClosePrices;
            let baseAsset = promiseModel.value.baseAsset;
            let baseAssetPrecision = promiseModel.value.baseAssetPrecision;
            let lotSize = promiseModel.value.lotSize;


            if (trade_debug_enabled === true) {
                console.log("\n", symbol);
            }

            /*console.log("ASSET SOTTOSTANTE", baseAsset);*/

            /*console.log("LOT_SIZE", lotSize);*/

            //console.log("PRICES LENGTH", askClosePrices.length);

            //se ci sono abbastanza prezzi da fare i calcoli, altrimenti si blocca l'esecuzione del programma
            if (askClosePrices.length > 201) {

                let medianPercDifference = calculateMedian(calculateAbsPercVariationArray(askClosePrices, 14));

                //attenzione. nel caso cripto i mercati devono essere liquidi quindi devono avere volumi scambiati alti
                //altrimenti si rischia che lo spread tra ask e bid sia troppo alto

                //TREND MINORE SMA50 RIBASSISTA
                let smaMinore = SMA.calculate({
                    period: 50,
                    values: askClosePrices
                });

                let trendMinoreRibassista = smaMinore[smaMinore.length - 1] < smaMinore[smaMinore.length - 2];
                let trendMinoreRialzista = smaMinore[smaMinore.length - 1] > smaMinore[smaMinore.length - 2];
                if (trade_debug_enabled === true) {
                    console.log("TREND MINORE RIBASSISTA", trendMinoreRibassista);
                }
                /*console.log("TREND MINORE RIALZISTA", trendMinoreRialzista);*/

                //TREND MAGGIORE RIALZISTA
                let smaMaggiore = SMA.calculate({
                    period: 200,
                    values: askClosePrices
                });

                let trendMaggioreRialzista = smaMaggiore[smaMaggiore.length - 1] > smaMaggiore[smaMaggiore.length - 2];
                let trendMaggioreRibassista = smaMaggiore[smaMaggiore.length - 1] < smaMaggiore[smaMaggiore.length - 2];

                if (trade_debug_enabled === true) {
                    console.log("TREND MAGGIORE RIALZISTA", trendMaggioreRialzista);
                }
                /*console.log("TREND MAGGIORE RIBASSISTA", trendMaggioreRibassista);*/

                //CALCOLO RSI RIALZISTA (<30)
                let rsi = RSI.calculate({
                    period: 14,
                    values: askClosePrices
                });

                let rsiRialzista = rsi[rsi.length - 1] < 30;
                let rsiRibassista = rsi[rsi.length - 1] > 70;

                if (trade_debug_enabled === true) {
                    console.log("RSI", rsi[rsi.length - 1]);
                    console.log("RSI RIALZISTA", rsiRialzista);
                }
                /*console.log("RSI RIBASSISTA", rsiRibassista);*/


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

                if (trade_debug_enabled === true) {
                    console.log("SEGNALE SUPERA MACD", segnaleSuperaMACD);
                }
                /*console.log("SEGNALE SUPERA MACD BASSO", segnaleSuperaMACDBasso);*/

                //è giusto trend minore ribassista e maggiore rialzista secondo Alyssa
                if (trendMinoreRibassista === true && trendMaggioreRialzista === true && rsiRialzista === true && segnaleSuperaMACD === true) {


                    let closeTime = new Date(rawPrices[rawPrices.length - 1].closeTime);
                    //console.log(closeTime, rawPrices[rawPrices.length - 1].closeTime);

                    //non avrebbe senso investire in qualcosa che promette meno dello stop loss in termini percentuali
                    let stopLoss = 1;
                    //if (medianPercDifference > stopLoss) {
                    let arrayInvestimento = [];

                    console.log("AZIONE LONG", symbol, "PREZZO", rawPrices[rawPrices.length - 1].close, "SIMBOLO", symbol);


                    //stop loss -1 %. take profit teorico sulla mediana, ma si può lasciare libero e chiudere dopo mezz'ora e basta
                    arrayPrevisioni.push({ azione: "LONG", simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 - stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision: baseAssetPrecision, lotSize: lotSize });
                    arrayInvestimento.push({ azione: "LONG", simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 - stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision: baseAssetPrecision, lotSize: lotSize, median: medianPercDifference });
                    //meglio così perchè è più veloce a piazzare l'ordine, altrimenti si rischia cambio prezzo
                    //provo a togliere l'await dato che è dentro una Promise e speriamo bene
                    autoInvestiLong(arrayInvestimento);
                    //}



                } else if (trendMinoreRialzista === true && trendMaggioreRibassista === true && rsiRibassista === true && segnaleSuperaMACDBasso === true) {

                    let closeTime = new Date(rawPrices[rawPrices.length - 1].closeTime);
                    console.log("AZIONE SHORT", symbol, "PREZZO", rawPrices[rawPrices.length - 1].close, "SIMBOLO", symbol);
                    let stopLoss = 1;
                    let arrayInvestimento = [];
                    arrayPrevisioni.push({ azione: "SHORT", simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 - medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 + stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision: baseAssetPrecision, lotSize: lotSize });
                    arrayInvestimento.push({ azione: "SHORT", simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 - medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 + stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision: baseAssetPrecision, lotSize: lotSize, median: medianPercDifference });



                }
            }
        }).catch(reason => {
            //niente
        });

    }

    //});

    //sendEmails(arrayPrevisioni);
    //console.log("Fine del Giro");
    //});

}



//ogni mezz'ora
const roundTo = roundTo => x => Math.round(x / roundTo) * roundTo;
const roundUpTo = roundTo => x => Math.ceil(x / roundTo) * roundTo;
const roundUpTo5Minutes = roundUpTo(1000 * 60 * 5);
const roundUpTo10Minutes = roundUpTo(1000 * 60 * 10);
const roundUpTo30Minutes = roundUpTo(1000 * 60 * 30);
//let next_minute_date = roundUpTo30Minutes(new Date()) + 1000;
//let next_minute_date = roundUpTo5Minutes(new Date()) + 1000;
let next_minute_date = roundUpTo5Minutes(new Date()) + 1000;


let current_date = Date.now();
let wait_fist_time = next_minute_date - current_date;

playBullSentiment(true)

let interval;

//testing
/*setTimeout(function() {
    let arrayInvestimento = [];
    arrayInvestimento.push({ azione: "LONG", simbolo: 'SOLUSDT', price: 38.7, tp: 40, sl: 35, base_asset: 'SOL', RSI: 25, date: new Date().getTime(), baseAssetPrecision: '2', lotSize: '0.1', median: 1 });
    autoInvestiLong(arrayInvestimento);
}, 5000)*/

bootstrap();
let timeout = setTimeout(function() {
    bootstrap();
    interval = setInterval(function() {
        bootstrap();
    }, 300000);
}, wait_fist_time);