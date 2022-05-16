//l'accesso alle equity è disabilitato
//usare postman per fare le prove. in workspace > history già ci sono dei test
//basta cambiare il bearer token che viene generato per ogni sessione

//SE CI SONO PROBLEMI AVVIARE CON NODE_DEBUG=https node normal_markets.js
//ALTRIMENTI clear&&node normal_markets.js
const dotenv = require('dotenv');
dotenv.config();

const RSI = require('technicalindicators').RSI;
const MACD = require('technicalindicators').MACD;
const SMA = require('technicalindicators').SMA;

const igtrader = require('ig-trading-api').APIClient;
const Resolution = require('ig-trading-api').Resolution;

//cercati con ricercaMercati 
//interpump spa,saram spa,saipem spa,erg spa,hera spa

const epics = ['CS.D.CFDGOLD.CFDGC.IP', 'IX.D.DAX.IFD.IP', 'IX.D.NASDAQ.IFD.IP', 'CS.D.EURUSD.CFD.IP', 'CS.D.EURGBP.CFD.IP'];

//altro modo per chiamare la funzione in modo sincrono
async function bootstrap() {

    const client = new igtrader(igtrader.URL_DEMO, '5f54b3f28d339a0696d1ca9b4dfbdb88aeccf934');


    let session = await client.rest.login.createSession('dadeit1987', 'Enavisi0ne!');
    /*session = client.rest.login.logout();
    session = await client.rest.login.createSession('dadeit1987', 'Enavisi0ne!');*/

    console.info(`ID SESSIONE: "${session.clientId}".`);


    //SE QUESTO NON VA ALLORA L'API NON FUNZIONA
    /*
    Germany 40 Cash (25€)
    US Tech 100 Cash (100$)
    Wall Street Cash (10$)
    EU Stocks 50 Cash (10€)
    France 40 Cash (10€)
    Meta Platforms Inc (All Sessions)
    Apple Inc (All Sessions)
    STMicroelectronics NV (IT)
    Intesa Sanpaolo SpA
    */

    //MOTORE DI RICERCA DEI MERCATI
    //PER VEDERE I MERCATI PIU' LIQUIDI (I PIU' SCAMBIATI) DI OGGI
    //https: //it.investing.com/equities/most-active-stocks
    /*let ricercaMercati = await client.rest.market.searchMarkets('eurgbp');
    console.log(ricercaMercati);
    process.exit();*/

    //VEDI NOMI TUTTI MERCATI
    //console.log(await client.rest.market.getMarketCategories());

    //ESEMPIO MERCATO OLI MINI
    /*let oils = await client.rest.market.getMarketCategories('455777');

    for (let market of oils.markets) {
        if (market.streamingPricesAvailable) {
            epics.push(market.epic);
        }
    }*/

    //console.log(await client.rest.market.price.getPrices('CC.D.LCO.UME.IP', Resolution.MINUTE_30, 60));

    //A2A (TEST)
    //console.log(await client.rest.market.getMarketCategories('409715'));

    //process.exit();

    //con of è come fare il foreach ma non è racchiuso in una closure quindi gli scope delle variabili sono diversi
    for (let epic of epics) {

        console.log("LOOP", epic);

        //dettagli del mercato
        //console.log(await client.rest.market.getMarketDetails(epic));

        //questa è per vedere i prezzi (presa da https://github.com/bennycode/ig-trading-api/blob/main/src/market/prices/PriceAPI.test.ts)
        //quando non sai come fare e il software è coperto da test guardali

        //attenzione: error.public-api.exceeded-account-historical-data-allowance
        //il massimo è di 10,000 dati storici a settimana (10mila candele)
        //in sto caso o disabiliti una e crei una nuova api key o prendi i dati da un altra parte
        let price = await client.rest.market.price.getPrices(epic, Resolution.MINUTE_30, 60, 60);

        //console.log("PREZZI", price);

        //IL PREZZO DI ASK E' IL PREZZO MIGLIORE AL QUALE TI VENDONO L'AZIONE I VENDITORI
        //IL PREZZO BID E' IL PREZZO MIGLIORE AL QUALE LA COMPRANO
        //LA DIFFERENZA TRA ASK E BID E' LO SPREAD
        //console.log(getPrices.prices);

        let askClosePrices = price.prices.map((v) => { return v.closePrice.ask });

        //console.log("ASK PRICES", askClosePrices);

        //TREND MINORE SMA50 RIBASSISTA
        let smaMinore = SMA.calculate({
            period: 50,
            values: askClosePrices
        });

        let trendMinoreRibassista = smaMinore[smaMinore.length - 1] < smaMinore[smaMinore.length - 2];

        console.log("TREND MINORE RIBASSISTA", trendMinoreRibassista);

        //TREND MAGGIORE RIALZISTA
        let smaMaggiore = SMA.calculate({
            period: 200,
            values: askClosePrices
        });

        let trendMaggioreRialzista = smaMaggiore[smaMaggiore.length - 1] > smaMaggiore[smaMaggiore.length - 2];

        console.log("TREND MAGGIORE RIALZISTA", trendMaggioreRialzista);


        //CALCOLO RSI RIALZISTA (<30)
        let rsi = RSI.calculate({
            period: 14,
            values: askClosePrices
        });

        let rsiRialzista = rsi[rsi.length - 1] < 30;

        console.log("RSI RIALZISTA", rsiRialzista);


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

        console.log("SEGNALE SUPERA MACD", segnaleSuperaMACD);

        //INCROCIO MACD
        //let segnaleSuperaIncrociaMACD = macd[macd.length - 2].signal < macd[macd.length - 2].MACD && macd[macd.length - 1].signal > macd[macd.length - 1].MACD;
        //console.log("SEGNALE INCROCIA MACD", segnaleSuperaIncrociaMACD);

        if (trendMinoreRibassista === true && trendMaggioreRialzista === true && rsiRialzista === true && segnaleSuperaMACD === true) {
            console.log("COMPRA", epic, "PREZZO DI VENDITA", price.prices[price.prices.length - 1].snapshotTime, price.prices[price.prices.length - 1].closePrice.ask);

        }

        console.log('\n');
    }


    //INDICAZIONI
    console.log("ATTENZIONE: GUARDARE SUPPORTO, MARKET SENTIMENT E NEWS");
    console.log("ESEMPIO ORO: https://www.ig.com/it/marketanalysis/ig-commodities/gold");
    console.log("ESEMPIO NEWS: https://www.google.com/search?q=gold&tbm=nws");

    //esci da node
    process.exit();

}


bootstrap();