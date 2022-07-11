/* eslint-disable array-callback-return */
/* eslint-disable n/no-callback-literal */
/* eslint-disable no-extend-native */
'use strict'

// TESTATO SENZA MAI AVER SBAGLIATO IL 10 GIUGNO 2022 TUTTO IL GIORNO
const dotenv = require('dotenv')
dotenv.config()

const sound = require('sound-play')

const RSI = require('technicalindicators').RSI
const MACD = require('technicalindicators').MACD
const SMA = require('technicalindicators').SMA

const Binance = require('binance-api-node').default
const Kucoin = require('kucoin-node-api')

const clients = []
process.env.BINANCE_SPOT_KEY.split(',').forEach((v, i) => {
  clients.push(Binance({
    apiKey: process.env.BINANCE_SPOT_KEY.split(',')[i],
    apiSecret: process.env.BINANCE_SPOT_SECRET.split(',')[i]
  }))
})

// client principale
const client = clients[0]

const kucoinConfig = {
  apiKey: process.env.KUCOIN_KEY,
  secretKey: process.env.KUCOIN_SECRET,
  passphrase: process.env.KUCOIN_PASS,
  environment: 'live'
}

Kucoin.init(kucoinConfig)

const soundDisabled = false
const tradeDebugEnabled = false

function roundByLotSize (value, step) {
  step || (step = 1.0)
  const inv = 1.0 / step
  return Math.round(value * inv) / inv
}

// per arrotondare bene invece che con toFixed che arrotonda a cavolo di cane
function roundByDecimals (value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals)
}

// per contare i decimali della tick size
// eslint-disable-next-line no-extend-native
Number.prototype.countDecimals = function () {
  try {
    if (Math.floor(this.valueOf()) === this.valueOf()) return 0
    return this.toString().split('.')[1].length || 0
  } catch (exception) {
    console.log('Exception', exception, 'This', this)
  }
}

String.prototype.countDecimals = function () {
  // calcola decimali nella tickSize
  try {
    // console.log("\n");

    const splittedNum = this.split('.')
    // console.log(splittedNum);
    if (splittedNum[1] !== undefined) {
      let text = splittedNum[1]
      const length = text.length
      for (let i = length - 1; i >= 0; i--) {
        // console.log(i, text[i]);
        if (text[i] === '0') {
          text = text.slice(0, i)
        } else {
          break
        }
      }
      return text.length
    } else {
      return 0
    }
  } catch (exception) {
    console.log('Exception', exception, 'This', this)
  }
}

// eslint-disable-next-line no-unused-vars
function analisiOrderBook (symbol, currentPrice, maxPrice, minPrice, callback) {
  client.book({ symbol }).then(response => {
    let asks = response.asks.reverse()
    let bids = response.bids

    asks = asks.filter((v, i, a) => {
      if (v.price <= maxPrice && v.price > currentPrice) {
        return v.price
      }
    }).slice(0, 3)

    bids = bids.filter((v, i, a) => {
      if (v.price >= minPrice && v.price < currentPrice) {
        return v.price
      }
    }).slice(0, 3)

    let bestAsk = asks.sort((a, b) => {
      return a.quantity - b.quantity
    })
    if (bestAsk.length > 0) {
      bestAsk = bestAsk[0]
    }

    let bestBid = bids.sort((a, b) => {
      return a.quantity - b.quantity
    })
    if (bestBid.length > 0) {
      bestBid = bestBid[0]
    }

    callback({ asks, bids, bestAsk: bestAsk.price, bestBid: bestBid.price })
  }).catch(reason => { console.log(reason) })
}

// eslint-disable-next-line no-unused-vars
function analisiGraficaGiornalieraMassimiMinimiVicini (symbol, callback) {
  // 48 vuol dire 24 ore dato che sono intervalli di 30 minuti, quindi  x 3 fa 3 giorni
  client.candles({ symbol, interval: '30m', limit: 48 }).then((candles30Min) => {
    const massimiVicini = []
    const minimiVicini = []
    const doppiTocchiMassimi = []
    const tripliTocchiMassimi = []
    const doppiTocchiMinimi = []
    const tripliTocchiMinimi = []
    let massimoAssoluto = 0
    let minimoAssoluto = Infinity

    const candles30MinCloses = candles30Min.map((v) => Number(v.close))
    const currentPrice = candles30MinCloses[candles30MinCloses.length - 1]

    /* const smaClose = SMA.calculate({
      period: 3,
      values: candles30Min.map((v) => Number(v.close))
    }).map((v) => roundByDecimals(v, 2)) */

    const period = 1
    const smaMin = SMA.calculate({
      period,
      values: candles30Min.map((v) => Number(v.low))
    }).map((v) => roundByDecimals(v, 2))

    const smaMax = SMA.calculate({
      period,
      values: candles30Min.map((v) => Number(v.high))
    }).map((v) => roundByDecimals(v, 2))

    // per calcolare le resistenze (in alto)
    let c = smaMax.length
    let rapportoIncrementalePrecedente = 0
    for (let i = 1; i < c; i++) {
      const x0 = i - 1
      const x1 = i
      const y0 = smaMax[x0]
      const y1 = smaMax[x1]
      const rapportoIncrementaleAttuale = (y1 - y0) / (x1 - x0)
      if (i > 1) {
        if (rapportoIncrementalePrecedente > 0 && rapportoIncrementaleAttuale < 0) {
          const price = /* roundByDecimals((y0 + y1) / 2, 2) */ y0
          // massimo relativo o assoluto
          if (price > massimoAssoluto) {
            massimoAssoluto = price
          }
          const searchOtherDouble = doppiTocchiMassimi.lastIndexOf(price)
          // non deve essere l'ultimo indice perchè se è piatto non vale come massimo
          if (searchOtherDouble !== -1 && searchOtherDouble !== doppiTocchiMassimi.length - 1) {
            tripliTocchiMassimi.push(price)
          }
          const searchOtherMax = massimiVicini.lastIndexOf(price)
          if (searchOtherMax !== -1 && searchOtherMax !== massimiVicini.length - 1) {
            doppiTocchiMassimi.push(price)
          }
          massimiVicini.push(price)
        } else {
        // flesso quindi non mi interessa per ora
        }
      }
      rapportoIncrementalePrecedente = rapportoIncrementaleAttuale
    }

    // per calcolare i supporti (in basso)
    c = smaMin.length
    rapportoIncrementalePrecedente = 0
    for (let i = 1; i < c; i++) {
      const x0 = i - 1
      const x1 = i
      const y0 = smaMin[x0]
      const y1 = smaMin[x1]
      const rapportoIncrementaleAttuale = (y1 - y0) / (x1 - x0)
      if (i > 1) {
        if (rapportoIncrementalePrecedente < 0 && rapportoIncrementaleAttuale > 0) {
          const price = /* roundByDecimals((y0 + y1) / 2, 2) */ y1
          // minimo relativo o assoluto
          if (y1 < minimoAssoluto) {
            minimoAssoluto = price
          }
          const searchOtherDouble = doppiTocchiMinimi.lastIndexOf(price)
          // non deve essere l'ultimo indice perchè se è piatto non vale come massimo
          if (searchOtherDouble !== -1 && searchOtherDouble !== doppiTocchiMinimi.length - 1) {
            tripliTocchiMinimi.push(price)
          }
          const searchOtherMax = minimiVicini.lastIndexOf(price)
          if (searchOtherMax !== -1 && searchOtherMax !== minimiVicini.length - 1) {
            doppiTocchiMinimi.push(price)
          }
          minimiVicini.push(price)
        } else {
        // flesso quindi non mi interessa per ora
        }
      }
      rapportoIncrementalePrecedente = rapportoIncrementaleAttuale
    }

    const vol1 = calculateAbsPercVariationArray([massimoAssoluto, minimoAssoluto])
    const vol2 = calculateAbsPercVariationArray([minimoAssoluto, massimoAssoluto])
    const volatilitaGiornaliera = roundByDecimals((vol1[0] + vol2[0]) / 2, 2)
    const numeroDoppiTocchiMassimi = doppiTocchiMassimi.length
    const numeroDoppiTocchiMinimi = doppiTocchiMinimi.length
    const numeroTripliTocchiMassimi = tripliTocchiMassimi.length
    const numeroTripliTocchiMinimi = tripliTocchiMinimi.length
    callback({ currentPrice, volatilitaGiornaliera, numeroDoppiTocchiMassimi, numeroDoppiTocchiMinimi, numeroTripliTocchiMassimi, numeroTripliTocchiMinimi, massimiVicini: massimiVicini.sort(), minimiVicini: minimiVicini.sort(), massimoAssoluto, minimoAssoluto, doppiTocchiMassimi, doppiTocchiMinimi, tripliTocchiMassimi, tripliTocchiMinimi })
  }).catch((r) => console.log(r))
}

async function playBullSentiment (bypass) {
  const path = require('path')
  const filePath = path.join(__dirname, 'bull_sentiment.mp3')

  // di notte non deve riprodurre suoni sennò fai un infarto
  const ora = new Date().getHours()

  // solo ai minuti 30 fa il verso del toro
  // let minuti = new Date().getMinutes();

  if (bypass === true) {
    if (soundDisabled === false) {
      // console.log(filePath);
      sound.play(filePath)
    }
  } else if (ora < 22 && ora > 9) {
    // if (minuti >= 30 && minuti <= 34) {
    if (soundDisabled === false) {
      // console.log(filePath);
      sound.play(filePath)
    }
    // }
  }
}

function piazzaOrdineOco (simbolo, quantity, takeProfit, stopLossTrigger, stopLoss, baseAssetPrecision, lotSize, ocoAttemps, singleClient, callback) {
  // proviamo così a vedere se lo esegue
  /* Non sempre lo esegue giusto
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
  console.log('trying placing OCO', simbolo, quantity)

  // non va bene vedere l'eseguito dell'ordine precedente
  // bisogna vedere il bilancio di quel simbolo in conto
  singleClient.accountInfo().then(accountInfo => {
    quantity = accountInfo.balances.filter(v => v.asset === simbolo.slice(0, -4))[0].free
    // per tentare di sistemare in caso di bilancio insufficiente
    if (ocoAttemps > 0) {
      quantity = quantity / 100 * (100 - (0.075 * (ocoAttemps - 1)))
    }
    quantity = roundByDecimals(roundByLotSize(quantity, lotSize), baseAssetPrecision)

    singleClient.dailyStats({ symbol: simbolo }).then(dailyStats => {
      if (dailyStats.bidPrice < stopLossTrigger) {
        singleClient.order({
          symbol: simbolo,
          side: 'SELL',
          type: 'MARKET',
          quantity,
          newClientOrderId: 'SELL'
        }).then(response => {
          console.log(response)
          callback([true, response])
        }).catch((reason) => {
          console.log('single_client.order SELL', simbolo, reason)

          if (ocoAttemps < 10) {
            ocoAttemps++
            setTimeout(function () {
              piazzaOrdineOco(simbolo, quantity, takeProfit, stopLossTrigger, stopLoss, baseAssetPrecision, lotSize, ocoAttemps, singleClient, callback)
            }, 1000)
          } else {
            ocoAttemps = 0
            console.log('maxAttemps reached', simbolo)
            callback([false, 'single_client.order SELL'])
          }
        })
      } else {
        // c'è un errore. se il prezzo è sotto quello dello stopLoggTrigger deve chiudere a Mercato
        // se la quantità è diversa bisogna capire come fare
        singleClient.orderOco({
          symbol: simbolo,
          side: 'SELL',
          quantity,
          // take profit
          // si può calcolare su askprice o lastprice
          // meglio sull'ask price altrimenti guadagni talmente poco che spesso non copri neanche le commissioni
          // meglio su lastprice dato che le mediane vengono calcolate sui prezzi di chiusura medi
          price: takeProfit,
          // stop loss trigger and limit
          stopPrice: stopLossTrigger,
          // attenzione: non è detto che sia giusto impostarli uguali. forse in caso di slippage può saltare lo stop loss.
          stopLimitPrice: stopLoss
        }).then(response => {
          // console.log(response);
          ocoAttemps = 0
          callback([true, response])
        })
          .catch((reason) => {
            console.log('single_client.orderOco', simbolo, reason, ocoAttemps)
            console.log('ATTENZIONE. SE NON HAI BNB SCEGLIERE COMMISSIONI IN USDT')
            if (ocoAttemps < 10) {
              ocoAttemps++
              setTimeout(function () {
                piazzaOrdineOco(simbolo, quantity, takeProfit, stopLossTrigger, stopLoss, baseAssetPrecision, lotSize, ocoAttemps, singleClient, callback)
              }, 1000)
            } else {
              ocoAttemps = 0
              console.log('maxAttemps reached', simbolo)
              callback([false, 'maxOCOattempts reached'])
            }
          })
      }
    }).catch((reason) => {
      console.log('dailyStats', simbolo, reason)
      console.log('maxAttemps reached', simbolo)
      if (ocoAttemps < 10) {
        ocoAttemps++
        setTimeout(function () {
          piazzaOrdineOco(simbolo, quantity, takeProfit, stopLossTrigger, stopLoss, baseAssetPrecision, lotSize, ocoAttemps, singleClient, callback)
        }, 1000)
      } else {
        ocoAttemps = 0
        callback([false, 'dailyStats'])
      }
    })
  }).catch((reason) => {
    console.log('accountInfo', simbolo, reason)

    if (ocoAttemps < 10) {
      ocoAttemps++
      setTimeout(function () {
        piazzaOrdineOco(simbolo, quantity, takeProfit, stopLossTrigger, stopLoss, baseAssetPrecision, lotSize, ocoAttemps, singleClient, callback)
      }, 1000)
    } else {
      console.log('maxAttemps reached', simbolo)
      ocoAttemps = 0
      callback([false, 'maxOCOattempts reached'])
    }
  })
}

async function autoInvestiLong (arrayPrevisioniFull) {
  try {
    for (const singleClient of clients) {
      // console.log(single_client);

      for (const arrayPrevisioni of arrayPrevisioniFull) {
        // questo serve solo in caso di conferma di tutte le altre condizioni
        client.exchangeInfo().then((e) => {
          // console.log("ok1",  arrayPrevisioni.simbolo);
          const tickSize = e.symbols.filter(v => v.symbol === arrayPrevisioni.simbolo)[0].filters.filter(v => v.filterType === 'PRICE_FILTER')[0].tickSize

          // anche se è già una stringa è per capire
          const tickSizeDecimals = tickSize.toString().countDecimals()

          // console.log("ok2", arrayPrevisioni.simbolo);

          // qui da il seguente errore
          /* Error: Timestamp for this request was 1000ms ahead of the server's time.
                                                                                              at C:\var\www\StockPricePredictor\node_modules\binance-api-node\dist\http-client.js:100:17
                                                                                              at processTicksAndRejections (node:internal/process/task_queues:96:5)
                                                                                              at async autoInvestiLong (C:\var\www\StockPricePredictor\screener_cripto.js:273:31)
                                                                                              at async bootstrap (C:\var\www\StockPricePredictor\screener_cripto.js:1239:21) {
                                                                                              code: -1021,
                                                                                              url: 'https://api.binance.com/api/v3/account?timestamp=1657010501523&signature=c592cb5f1cf44864b11e4960c2077c0b41ae926b81def834bb36e66598dfaf58'
                                                                                              } */

          singleClient.accountInfo().then(accountInfo => {
            // console.log(accountInfo);
            // meglio investire un po meno altrimenti si rischia che il prezzo cambi nel frattempo e il bilancio non basta più a fine ciclo
            // meglio differenziare perchè almeno se perdi su una magari su un altra sale
            // quindi meglio settare un importo che sia 1/3 del totale che si possiede

            const UsdtAmount = accountInfo.balances.filter(v => v.asset === 'USDT')[0].free / 100 * 90
            // console.log("USDT Amount", UsdtAmount);
            singleClient.dailyStats({ symbol: arrayPrevisioni.simbolo }).then(symbolPrice => {
              // verificare se la criptovaluta ha gli ultimi 48 volumi alti (in dollari) o se è senza liquidità
              // altrimenti lasciar perdere l'investimento

              // segno di inversione rialzista
              singleClient.candles({ symbol: arrayPrevisioni.simbolo, interval: '1m', limit: 5 }).then((ultimeCandele) => {
                // segno di inversione rialzista a 1 minuto
                let ultimeCandeleArray = ultimeCandele.map((v) => { return Number(v.close) > Number(v.open) })

                ultimeCandeleArray = ultimeCandeleArray.filter((v, i, a) => {
                  return i > 0 && a[i] === true && a[i - 1] === true
                })

                // TEST
                // ultimeCandeleArray = [true];
                console.log(arrayPrevisioni.simbolo, 'ultimeCandele', ultimeCandeleArray)

                if (ultimeCandeleArray.length > 0) {
                  // console.log("Symbol Price", symbolPrice.askPrice, symbolPrice);
                  let maxQty = UsdtAmount / Number(symbolPrice.askPrice)
                  // console.log("Max Qty", maxQty);

                  maxQty = roundByDecimals(roundByLotSize(maxQty, arrayPrevisioni.lotSize), arrayPrevisioni.baseAssetPrecision)

                  // console.log('USDT AMOUNT', UsdtAmount, 'ARRAY PREVISIONI', arrayPrevisioni, 'SYMBOL PRICE', symbolPrice, 'ASK PRICE', symbolPrice.askPrice);
                  console.log('VALUTAZIONE ORDINE', 'SALDO USDT', UsdtAmount, 'SIMBOLO', arrayPrevisioni.simbolo, 'QUANTITA', maxQty, 'MEDIANA', arrayPrevisioni.median, 'TAKE PROFIT', roundByDecimals((symbolPrice.askPrice / 100 * (100 + arrayPrevisioni.median)), tickSizeDecimals), 'STOP LOSS', roundByDecimals((symbolPrice.bidPrice / 100 * (100 - 1)), tickSizeDecimals), 'TICK SIZE', tickSize, 'TICK SIZE DECIMALS', tickSizeDecimals)
                  // L'ask price è il prezzo minore a cui ti vendono la moneta
                  // in realtà dovresti testare anche la quantità ma siccome per ora metto poco non serve

                  // stop loss perc è -1.2% massimo. meglio seguire la regola del 2%
                  // ovvero mai mettere a rischio più del 2% del capitale investito, per ogni operazione

                  // rif. https://www.cmegroup.com/education/courses/trade-and-risk-management/the-2-percent-rule.html
                  // rif. One popular method is the 2% Rule, which means you never put more than 2% of your account equity at risk (Table 1). For example, if you are trading a $50,000 account, and you choose a risk management stop loss of 2%, you could risk up to $1,000 on any given trade.
                  const stopLossTriggerPerc = 1
                  const stopLossPerc = 1.2
                  // dato che la commissione è lo 0.1% basta che la mediana sia superiore alla commissione
                  // APRO SOLO SE ALMENO LA PREVISIONE E' MAGGIORE DEL RISCHIO
                  // COME SI SUOL DIRE: CHE ALMENO IL RISCHIO VALGA LA CANDELA
                  // E' GIUSTO MAGGIORE PERCHE' DEVE SUPERARE NECESSARIAMENTE LA MEDIANA, NON SOLO EGUAGLIARLA IN CASO DI GUADAGNO

                  const takeProfit = roundByDecimals((symbolPrice.askPrice / 100 * (100 + arrayPrevisioni.median)), tickSizeDecimals)

                  const stopLossTrigger = roundByDecimals((symbolPrice.bidPrice / 100 * (100 - stopLossTriggerPerc)), tickSizeDecimals)
                  const stopLoss = roundByDecimals((symbolPrice.bidPrice / 100 * (100 - stopLossPerc)), tickSizeDecimals)

                  console.log(arrayPrevisioni.simbolo, 'QuoteVolume', symbolPrice.quoteVolume)
                  // per evitare rischi dovuti alla troppa volatilità. comunque proviamo /3 altrimenti non trova mai una condizione favorevole
                  // lo stopLossTrigger (quello che lancia lo stop loss effettivo) si riferisce al bidPrice (prezzo vendita cioè più basso), mentre il take profit all'ask price (prezzo d'acquisto cioè più alto)
                  const condition = symbolPrice.quoteVolume > 4500000 && (takeProfit - symbolPrice.askPrice) >= ((symbolPrice.bidPrice - stopLossTrigger) * 0.6) && (takeProfit - symbolPrice.askPrice) <= ((symbolPrice.bidPrice - stopLossTrigger) * 1.2)

                  console.log('VALUTAZIONE ORDINE 2', 'SL', stopLoss, 'SL Trigger', stopLossTrigger, 'TP', takeProfit, 'DIFF TP', (takeProfit - symbolPrice.askPrice), 'DIFF SL', (symbolPrice.bidPrice - stopLossTrigger), 'DIFF SL/2', ((symbolPrice.bidPrice - stopLossTrigger) / 2), 'DIFF SL*1.5', ((symbolPrice.bidPrice - stopLossTrigger) * 1.5), 'CONDITION', condition)

                  if (UsdtAmount >= 25 && condition === true) {
                    singleClient.openOrders({ symbol: arrayPrevisioni.simbolo }).then(openOrders => {
                      console.log('ORDINI APERTI PER ' + arrayPrevisioni.simbolo, openOrders, openOrders.length)

                      if (openOrders.length === 0) {
                        console.log('APERTURA ORDINE', 'SIMBOLO', arrayPrevisioni.simbolo, 'QUANTITA', maxQty, 'MEDIANA', arrayPrevisioni.median, 'TAKE PROFIT', roundByDecimals((symbolPrice.askPrice / 100 * (100 + arrayPrevisioni.median)), tickSizeDecimals), 'STOP LOSS', roundByDecimals((symbolPrice.bidPrice / 100 * (100 - 1)), tickSizeDecimals), 'TICK SIZE', tickSize, 'TICK SIZE DECIMALS', tickSizeDecimals)
                        playBullSentiment()

                        singleClient.order({
                          symbol: arrayPrevisioni.simbolo,
                          side: 'BUY',
                          type: 'MARKET',
                          quantity: maxQty,
                          newClientOrderId: 'BUY'
                        }).then(() => {
                          // console.log(response)
                          piazzaOrdineOco(arrayPrevisioni.simbolo, maxQty, takeProfit, stopLossTrigger, stopLoss, arrayPrevisioni.baseAssetPrecision, arrayPrevisioni.lotSize, 0, singleClient, function (cb) {
                            if (cb[0] === true) {
                              console.log('ORDINE OCO PIAZZATO', arrayPrevisioni.simbolo)
                            } else {
                              console.log('piazzaOrdineOco internal', cb[1])
                            }
                          })
                        }).catch((reason) => {
                          console.log('single_client.order BUY', arrayPrevisioni.simbolo, reason)
                        })
                      }
                    }).catch((reason) => {
                      console.log('single_client.openOrders', arrayPrevisioni.simbolo, reason)
                    })
                  }
                }
              }).catch(reason => {
                console.log('single_client.candles', arrayPrevisioni.simbolo, reason)
              })
            }).catch((reason) => {
              console.log('single_client.dailyStats', arrayPrevisioni.simbolo, reason)
            })
          }).catch((reason) => {
            // SINCRONIZZARE OROLOGIO SE DICE CHE E' 1000ms avanti rispetto al server di binance
            console.log('single_client.accountInfo', arrayPrevisioni.simbolo, reason)
          })
        }).catch((reason) => {
          console.log('single_client.exchangeInfo', arrayPrevisioni.simbolo, reason)
        })
      };
    };
  } catch (reason) {
    console.log(reason)
  }
}

// client.time().then(time => console.log(time));

function getPercentageChange (newNumber, oldNumber) {
  const decreaseValue = oldNumber - newNumber

  return Math.abs((decreaseValue / oldNumber) * 100)
}

function calculateAbsPercVariationArray (values, period) {
  if (values.length < 2) throw new Error('No sufficient inputs')

  values = values.slice(period * -1)

  const percentageArray = []

  for (let i = 1; i < values.length; i++) {
    percentageArray.push(getPercentageChange(values[i], values[i - 1]))
  }

  return percentageArray
}

function calculateMedian (values) {
  if (values.length === 0) throw new Error('No inputs')

  values.sort(function (a, b) {
    return a - b
  })

  const half = Math.floor(values.length / 2)

  if (values.length % 2) { return values[half] }

  return (values[half - 1] + values[half]) / 2.0
}

let simultaneousConnections = 0
let prevSeconds = 0
let connectionLimit = 0
const time = 1000

function promessa (market, exchangeName, callback) {
  let condizioneVerificata
  if (exchangeName === 'binance') {
    // inserire qui le coin da escludere (magari per notizie poco promettenti ecc)
    // ad esempio nel caso di MTL è stata esclusa perchè l'export dimetalli era molto in calo
    // escludo i BNB perchè mi servono per pagare le fees (commissioni)
    condizioneVerificata = /* symbols_whitelist.indexOf(market.symbol) !== -1 && */ market.symbol.slice(0, 3) !== 'BNB' && market.symbol.slice(-4) === 'USDT' && market.status === 'TRADING' && market.isSpotTradingAllowed === true
  }

  if (condizioneVerificata === true) {
    // console.log("simultaneousConnections", simultaneousConnections, market.symbol);
    // per raddoppiare la velocità
    // se metti + di 2 connessioni simultanee rischi di superare
    // le 1200 richieste al minuto (all'8 luglio 2022 con la quantità di cripto che c'è)
    if (new Date().getSeconds() !== prevSeconds) {
      prevSeconds = new Date().getSeconds()
      connectionLimit = 0
    }

    // console.log('connectionLimit', connectionLimit, 'simultaneousConnections', simultaneousConnections);

    // connectionLimit è il limite di connessioni al secondo
    // con la mia connessione (30mbps down 15mbps up) ce la fa, altrimenti va regolato per non fare troppe richieste
    // < 3 e < 3 è l'ideale adesso che l'oco fa tante richieste alle API
    if (simultaneousConnections < 3 && connectionLimit < 3) {
      // console.log('connectionLimit', 'passed', connectionLimit);
      // meglio mettere 210 nel reale altrimenti ci mette una vita a fare il ciclo

      let askClosePrices
      let lotSize

      // SE CHIEDI LE CANDELE A KUCOIN TOO MANY REQUESTS
      // SE LE CHIEDI A BINANCE A VOLTE MANCANO DEI SIMBOLI DI KUCOIN
      // BISOGNEREBBE VEDERE QUELLI IN COMUNE TRA I DUE
      // E COMUNQUE NON E' DETTO CHE SIANO IDENTICI
      if (exchangeName === 'binance') {
        simultaneousConnections++

        // una connessione è per le candele e un altra connessioone è per exchangeInfo
        connectionLimit += 1

        // console.log(market.symbol);

        client.candles({ symbol: market.symbol, interval: '30m', limit: 210 }).then((rawPrices) => {
          askClosePrices = rawPrices.map((v) => { return Number(v.close) })
          lotSize = market.filters.filter(v => v.filterType === 'LOT_SIZE')[0].stepSize

          simultaneousConnections--
          callback([true, { symbol: market.symbol, baseAsset: market.baseAsset, baseAssetPrecision: market.baseAssetPrecision, rawPrices, askClosePrices, lotSize }])
          // console.log(market.symbol, "qui");
        }).catch((reason) => {
          console.log('no1', market.symbol, reason)
          simultaneousConnections--
          callback([false, reason])
        })
      }
    } else {
      // time += 10;
      // console.log("ricorsione", market.symbol, typeof callback === 'function');
      setTimeout(function () { promessa(market, exchangeName, callback) }, time)
    }
  } else {
    callback([false, 'non verificata'])
  }
}

async function bootstrap () {
  const arrayPrevisioni = []

  console.log('---------------------------------------------------------------------------')
  const binanceDate = new Date().toLocaleString()
  console.log('DATA', binanceDate)

  const exchangeName = 'binance'

  let info, symbols

  if (exchangeName === 'binance') {
    // https://www.binance.com/en/markets/spot-USDT top volume and > 50 MILLIONS MARKET CAP AND INCREMENT 24 HOURS > 1 E < 5

    info = await client.exchangeInfo()
    symbols = info.symbols
  } else if (exchangeName === 'kucoin') {
    info = await Kucoin.getSymbols()
    symbols = info.data
  }

  // console.log(info);
  // process.exit();

  for (const market of symbols) {
    // sono 2 richieste per ciclo e puoi farne massimo 1200
    // per sicurezza mettiamone un po in meno per lasciare spazio all'apertura ordini ecc

    // per provare a velocizzare le richieste
    new Promise((resolve, reject) => {
      promessa(market, exchangeName, function (result) {
        if (result[0] === true) {
          // console.log(result);
          resolve(result[1])
        } else {
          /* if (result[1] !== "non verificata") {
                                                                                              console.log(result[1]);
                                                                                          } */
          reject(result[1])
        }
      })
    }).then(result => {
      const promiseModel = { value: result }

      // console.log(promiseModel.value);

      // process.env.exit();
      // allSettled vuol dire che aspetta anche tutti i rejects,
      // a differenza di Promise.all() che invece al primo reject si ferma
      // Promise.allSettled(arrayPromise).
      // then((results) => {

      // results = results.filter((v) => v.status !== 'rejected');

      // console.log("Promise Risolte: ", results.length);

      // results.forEach((promiseModel) => {

      // 'symbol': market.symbol, 'baseAsset': market.baseAsset,
      // 'baseAssetPrecision': market.baseAssetPrecision,
      // 'rawPrices': rawPrices, 'askClosePrices': askClosePrices,
      // 'lotSize': lotSize

      // console.log(promiseModel.value);

      const symbol = promiseModel.value.symbol
      const rawPrices = promiseModel.value.rawPrices
      const askClosePrices = promiseModel.value.askClosePrices
      const baseAsset = promiseModel.value.baseAsset
      const baseAssetPrecision = promiseModel.value.baseAssetPrecision
      const lotSize = promiseModel.value.lotSize

      if (tradeDebugEnabled === true) {
        console.log('\n', symbol)
      }

      /* console.log("ASSET SOTTOSTANTE", baseAsset); */

      /* console.log("LOT_SIZE", lotSize); */

      // console.log("PRICES LENGTH", askClosePrices.length);

      // se ci sono abbastanza prezzi da fare i calcoli, altrimenti si blocca l'esecuzione del programma
      if (askClosePrices.length > 201) {
        const medianPercDifference = calculateMedian(calculateAbsPercVariationArray(askClosePrices, 14))

        // attenzione. nel caso cripto i mercati devono essere liquidi quindi devono avere volumi scambiati alti
        // altrimenti si rischia che lo spread tra ask e bid sia troppo alto

        // TREND MINORE SMA50 RIBASSISTA
        const smaMinore = SMA.calculate({
          period: 50,
          values: askClosePrices
        })

        const trendMinoreRibassista = smaMinore[smaMinore.length - 1] < smaMinore[smaMinore.length - 2]
        const trendMinoreRialzista = smaMinore[smaMinore.length - 1] > smaMinore[smaMinore.length - 2]
        if (tradeDebugEnabled === true) {
          console.log('TREND MINORE RIBASSISTA', trendMinoreRibassista)
        }
        /* console.log("TREND MINORE RIALZISTA", trendMinoreRialzista); */

        // TREND MAGGIORE RIALZISTA
        const smaMaggiore = SMA.calculate({
          period: 200,
          values: askClosePrices
        })

        const trendMaggioreRialzista = smaMaggiore[smaMaggiore.length - 1] > smaMaggiore[smaMaggiore.length - 2]
        const trendMaggioreRibassista = smaMaggiore[smaMaggiore.length - 1] < smaMaggiore[smaMaggiore.length - 2]

        if (tradeDebugEnabled === true) {
          console.log('TREND MAGGIORE RIALZISTA', trendMaggioreRialzista)
        }
        /* console.log("TREND MAGGIORE RIBASSISTA", trendMaggioreRibassista); */

        // CALCOLO RSI RIALZISTA (<30)
        const rsi = RSI.calculate({
          period: 14,
          values: askClosePrices
        })

        const rsiRialzista = rsi[rsi.length - 1] < 30
        const rsiRibassista = rsi[rsi.length - 1] > 70

        if (tradeDebugEnabled === true) {
          console.log('RSI', rsi[rsi.length - 1])
          console.log('RSI RIALZISTA', rsiRialzista)
        }
        /* console.log("RSI RIBASSISTA", rsiRibassista); */

        const macdInput = {
          values: askClosePrices,
          fastPeriod: 8,
          slowPeriod: 21,
          signalPeriod: 5,
          // è giusto così
          SimpleMAOscillator: false,
          SimpleMASignal: false
        }

        const macd = MACD.calculate(macdInput)

        // SUPERAMENTO MACD
        const segnaleSuperaMACD = macd[macd.length - 1].signal > macd[macd.length - 1].MACD
        const segnaleSuperaMACDBasso = macd[macd.length - 1].signal < macd[macd.length - 1].MACD

        if (tradeDebugEnabled === true) {
          console.log('SEGNALE SUPERA MACD', segnaleSuperaMACD)
        }
        /* console.log("SEGNALE SUPERA MACD BASSO", segnaleSuperaMACDBasso); */

        // è giusto trend minore ribassista e maggiore rialzista secondo Alyssa
        if (trendMinoreRibassista === true && trendMaggioreRialzista === true && rsiRialzista === true && segnaleSuperaMACD === true) {
          const closeTime = new Date(rawPrices[rawPrices.length - 1].closeTime)
          // console.log(closeTime, rawPrices[rawPrices.length - 1].closeTime);

          // non avrebbe senso investire in qualcosa che promette meno dello stop loss in termini percentuali
          const stopLoss = 1
          // if (medianPercDifference > stopLoss) {
          const arrayInvestimento = []

          console.log('AZIONE LONG', symbol, 'PREZZO', rawPrices[rawPrices.length - 1].close, 'SIMBOLO', symbol)

          // stop loss -1 %. take profit teorico sulla mediana, ma si può lasciare libero e chiudere dopo mezz'ora e basta
          arrayPrevisioni.push({ azione: 'LONG', simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 - stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision, lotSize })
          arrayInvestimento.push({ azione: 'LONG', simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 - stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision, lotSize, median: medianPercDifference })
          // meglio così perchè è più veloce a piazzare l'ordine, altrimenti si rischia cambio prezzo
          // provo a togliere l'await dato che è dentro una Promise e speriamo bene
          autoInvestiLong(arrayInvestimento)
          // }
        } else if (trendMinoreRialzista === true && trendMaggioreRibassista === true && rsiRibassista === true && segnaleSuperaMACDBasso === true) {
          const closeTime = new Date(rawPrices[rawPrices.length - 1].closeTime)
          console.log('AZIONE SHORT', symbol, 'PREZZO', rawPrices[rawPrices.length - 1].close, 'SIMBOLO', symbol)
          const stopLoss = 1
          // let arrayInvestimento = [];
          arrayPrevisioni.push({ azione: 'SHORT', simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 - medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 + stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision, lotSize })
          // arrayInvestimento.push({ azione: "SHORT", simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 - medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 + stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision: baseAssetPrecision, lotSize: lotSize, median: medianPercDifference });
        }
      }
    }).catch(() => {
      // niente
    })
  }

  // });

  // sendEmails(arrayPrevisioni);
  // console.log("Fine del Giro");
  // });
}

// ogni mezz'ora

const roundUpTo = roundTo => x => Math.ceil(x / roundTo) * roundTo
const roundUpTo5Minutes = roundUpTo(1000 * 60 * 5)

const nextMinuteDate = roundUpTo5Minutes(new Date()) + 1000

const currentDate = Date.now()
const waitFistTime = nextMinuteDate - currentDate

playBullSentiment(true)

// testing
/* setTimeout(function () {
  const arrayInvestimento = []
  arrayInvestimento.push({ azione: 'LONG', simbolo: 'SOLUSDT', price: 38.07, tp: 40, sl: 36, base_asset: 'SOL', RSI: 25, date: new Date().getTime(), baseAssetPrecision: '2', lotSize: '0.1', median: 1 })
  autoInvestiLong(arrayInvestimento)
}, 5000) */

// eslint-disable-next-line no-unused-vars
function testAnalisiOrderBook (simbolo, callback) {
  analisiGraficaGiornalieraMassimiMinimiVicini(simbolo, (grafica) => {
    console.log(grafica)
    const currentPrice = grafica.currentPrice
    // eslint-disable-next-line array-callback-return
    let nextMaxPrice = grafica.massimiVicini.sort().filter((v) => {
      // se torna più dello 0.5% rispetto al prezzo attuale
      if (v > currentPrice * 1.01 && v < currentPrice * 1.05) {
        return v
      }
    })
    if (nextMaxPrice.length > 0) {
      nextMaxPrice = nextMaxPrice[0]
    } else {
      console.log('massimo non presente in questa condizione')
    }

    // eslint-disable-next-line no-unused-vars, array-callback-return
    let nextMinPrice = grafica.minimiVicini.sort().reverse().filter((v) => {
      // se torna più dello 0.5% rispetto al prezzo attuale
      // può essere anche che non ci siano minimi con queste condizioni
      if (v < currentPrice * 0.99 && v > currentPrice * 0.98) {
        return v
      }
    })
    if (nextMinPrice.length > 0) {
      nextMinPrice = nextMinPrice[0]
    } else {
      nextMinPrice = currentPrice * 0.988
      console.log('minimo non presente in questa condizione. settato a -1.2%')
    }

    if (currentPrice < grafica.minimoAssoluto) {
      console.log('sotto i minimi giornalieri. non è possibile procedere')
    }

    const diffMaxPerc = ((nextMaxPrice - currentPrice) / currentPrice) * 100
    const diffMinPerc = ((nextMinPrice - currentPrice) / currentPrice) * 100

    const boolDoppioMassimo = grafica.doppiTocchiMassimi.indexOf(nextMaxPrice) !== -1
    const boolDoppioMinimo = grafica.doppiTocchiMinimi.indexOf(nextMinPrice) !== -1
    const boolTriploMassimo = grafica.tripliTocchiMassimi.indexOf(nextMaxPrice) !== -1
    const boolTriploMinimo = grafica.tripliTocchiMinimi.indexOf(nextMinPrice) !== -1

    analisiOrderBook(simbolo, currentPrice, nextMaxPrice, nextMinPrice, (book) => {
      /* console.log('\ncurrentPrice', currentPrice, 'nextMaxPrice', nextMaxPrice, 'nextMinPrice', nextMinPrice)
      console.log('diffMaxPerc', diffMaxPerc, 'diffMinPerc', diffMinPerc)
      console.log( 'bestAsk', book.bestAsk, 'bestBid', book.bestBid)
      console.log('boolDoppioMassimo', boolDoppioMassimo, 'boolDoppioMinimo', boolDoppioMinimo, 'boolTriploMassimo', boolTriploMassimo, 'boolTriploMinimo', boolTriploMinimo)
      process.exit() */

      callback({ currentPrice, nextMaxPrice, nextMinPrice, diffMaxPerc, diffMinPerc, bestAsk: book.bestAsk, bestBid: book.bestBid, boolDoppioMassimo, boolDoppioMinimo, boolTriploMassimo, boolTriploMinimo })
    })
  })
}

testAnalisiOrderBook()

bootstrap()
setTimeout(function () {
  bootstrap()
  setInterval(function () {
    bootstrap()
  }, 300000)
}, waitFistTime)
