/* eslint-disable array-callback-return */
/* eslint-disable n/no-callback-literal */
/* eslint-disable no-extend-native */
'use strict'

const fs = require('fs')
const util = require('util')
const path = require('path')
const logFile = fs.createWriteStream(path.join(__dirname, 'debug.log'), { flags: 'a' })

// TESTATO SENZA MAI AVER SBAGLIATO IL 10 GIUGNO 2022 TUTTO IL GIORNO
const dotenv = require('dotenv')
dotenv.config()

const sound = require('sound-play')

const RSI = require('technicalindicators').RSI
const MACD = require('technicalindicators').MACD
const SMA = require('technicalindicators').SMA

const Binance = require('binance-api-node').default

// setto i clients di binance
const clients = []

process.env.BINANCE_SPOT_KEY.split(',').forEach((v, i) => {
  clients.push(Binance({
    apiKey: process.env.BINANCE_SPOT_KEY.split(',')[i],
    apiSecret: process.env.BINANCE_SPOT_SECRET.split(',')[i]
  }))
})

// setto il client principale (il primo che è nelle keys del file .env)
const client = clients[0]

// serve ad abilitare i suoni durante il trade
// i suoni comunque sono disabilitati di notte
const soundDisabled = false

// serve ad abilitare le info di debug durante il trade
const tradeDebugEnabled = false

// serve a ricalcolare il prezzo in base alla grandezza del lotto minimo
// es. se il lotto minimo è 0.02 e il prezzo stimato è 0.13 lo ricalcola a 0.14
function roundByLotSize (value, step) {
  step || (step = 1.0)
  const inv = 1.0 / step
  return Math.round(value * inv) / inv
}

// serve per arrotondare i decimali nel modo corretto
// perchè toFixed() li arrotonda male. es. con toFixed(1) se fosse 0.59
// lo arrotonderebbe a 0.5, invece con questo a 0.6
function roundByDecimals (value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals)
}

// eslint-disable-next-line no-extend-native
// serve per contare il numero di decimali nella tickSize (partendo da una stringa numerica)
Number.prototype.countDecimals = function () {
  try {
    if (Math.floor(this.valueOf()) === this.valueOf()) return 0
    return this.toString().split('.')[1].length || 0
  } catch (exception) {
    logFile.write(util.format(exception) + '\n')
    console.log('Exception', exception, 'This', this)
  }
}

// serve per contare il numero di decimali nella tickSize (partendo da un numero)
String.prototype.countDecimals = function () {
  try {
    const splittedNum = this.split('.')
    // console.log(splittedNum);
    if (splittedNum[1] !== undefined) {
      let text = splittedNum[1]
      const length = text.length
      for (let i = length - 1; i >= 0; i--) {
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
    logFile.write(util.format(exception) + '\n')
    console.log('Exception', exception, 'This', this)
  }
}

// eslint-disable-next-line no-unused-vars
// serve per prendere il prezzo con meno ordini impostati
// vicino ai prezzi passati come parametro nell'order book
// serve a ridurre il rischio di mancato scambio a causa
// delle troppe ordinazioni presenti a quel prezzo
function analisiOrderBook (symbol, currentPrice, maxPrice, minPrice, callback) {
  client.book({ symbol }).then(response => {
    const asks2 = response.asks.reverse()
    const bids2 = response.bids

    // calcola il prezzo di take profit sotto al prezzo massimo della resistenza
    // usando il meno venduto a quella cifra precedente
    // in modo che non arrivi ancora a toccare il massimo prima di vendere
    const asks = asks2.filter((v, i, a) => {
      if (v.price <= maxPrice && v.price > currentPrice) {
        return v.price
      }
    }).slice(0, 3)

    // calcola lo stop loss sotto al muro del supporto
    // in modo da prevenire le discese per bisogno di liquidità
    // che di solito arrivano solo a toccare il supporto per pescare soldi
    const bids = bids2.filter((v, i, a) => {
      if (v.price < minPrice && v.price < currentPrice) {
        return v.price
      }
    }).slice(0, 3)

    // prende il take profit meno venduto tra i 3 sotto la resistenza
    let bestAsk = asks.sort((a, b) => {
      return a.quantity - b.quantity
    })
    if (bestAsk.length > 0) {
      bestAsk = bestAsk[0]
    } else {
      bestAsk = { price: maxPrice }
    }

    // prende lo stop loss meno venduto SOTTO il supporto
    let bestBid = bids.sort((a, b) => {
      return a.quantity - b.quantity
    })
    if (bestBid.length > 0) {
      bestBid = bestBid[0]
    } else {
      bestBid = { price: minPrice }
    }

    callback({ asks, bids, asks2, bids2, bestAsk: bestAsk.price, bestBid: bestBid.price })
  }).catch(reason => {
    logFile.write(util.format(reason) + '\n')
    console.log(reason)
  })
}

// eslint-disable-next-line no-unused-vars
// analizza i grafici, alla ricerca di patterns
function analisiGraficaGiornalieraMassimiMinimiVicini (symbol, tickSizeDecimals, callback) {
  // prende le candele delle 24 ore precedenti,
  // dato che sono intervalli di 30 minuti
  // e poi moltiplica per 7, quindi prende tutta la settimana precedente
  client.candles({ symbol, interval: '30m', limit: 48 * 7 }).then((candles30Min) => {
    const massimiVicini = []
    const minimiVicini = []
    const doppiTocchiMassimi = []
    const tripliTocchiMassimi = []
    const doppiTocchiMinimi = []
    const tripliTocchiMinimi = []
    let massimoAssoluto = 0
    let minimoAssoluto = Infinity

    // prende tutti i valori delle chiusure di candele
    const candles30MinCloses = candles30Min.map((v) => Number(v.close))
    // prende il prezzo corrente dall'ultima chiusura
    const currentPrice = candles30MinCloses[candles30MinCloses.length - 1]

    // calcola le medie mobili dei prezzi massimi e minimi
    // per poi andare a calcolare con i rapporti incrementali
    // i massimi e minimi nel grafico
    const period = 3
    const smaMin = SMA.calculate({
      period,
      values: candles30Min.map((v) => Number(v.low))
    }).map((v) => roundByDecimals(v, tickSizeDecimals))

    const smaMax = SMA.calculate({
      period,
      values: candles30Min.map((v) => Number(v.high))
    }).map((v) => roundByDecimals(v, tickSizeDecimals))

    // calcolo le resistenze nel grafico (in alto) più altri dati
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
          const price = y0
          // vedo se il massimo è assoluto nel grafico o relativo
          if (price > massimoAssoluto) {
            massimoAssoluto = price
          }

          // vedo se è un triplo tocco massimo
          const searchOtherDouble = doppiTocchiMassimi.lastIndexOf(price)
          if (searchOtherDouble !== -1 && searchOtherDouble !== doppiTocchiMassimi.length - 1) {
            tripliTocchiMassimi.push(price)
          }

          // vedo se è un doppio tocco massimo
          const searchOtherMax = massimiVicini.lastIndexOf(price)
          if (searchOtherMax !== -1 && searchOtherMax !== massimiVicini.length - 1) {
            doppiTocchiMassimi.push(price)
          }

          // lo imposto comunque come massimo
          massimiVicini.push(price)
        } else {
          // questo sarebbe un flesso quindi non mi interessa
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
          const price = y1
          // minimo relativo o assoluto
          if (y1 < minimoAssoluto) {
            minimoAssoluto = price
          }

          // vedo se è un triplo tocco minimo
          const searchOtherDouble = doppiTocchiMinimi.lastIndexOf(price)
          if (searchOtherDouble !== -1 && searchOtherDouble !== doppiTocchiMinimi.length - 1) {
            tripliTocchiMinimi.push(price)
          }

          // vedo se è un doppio tocco minimo
          const searchOtherMax = minimiVicini.lastIndexOf(price)
          if (searchOtherMax !== -1 && searchOtherMax !== minimiVicini.length - 1) {
            doppiTocchiMinimi.push(price)
          }

          // lo imposto comunque come minimo
          minimiVicini.push(price)
        } else {
          // questo sarebbe un flesso quindi non mi interessa
        }
      }
      rapportoIncrementalePrecedente = rapportoIncrementaleAttuale
    }

    const numeroDoppiTocchiMassimi = doppiTocchiMassimi.length
    const numeroDoppiTocchiMinimi = doppiTocchiMinimi.length
    const numeroTripliTocchiMassimi = tripliTocchiMassimi.length
    const numeroTripliTocchiMinimi = tripliTocchiMinimi.length

    // faccio il calcolo del massimo assoluto su tutte le candele esclusa l'ultima
    // altrimenti non potrei vedere se è stato superato in termini assoluti
    massimoAssoluto = Math.max(...smaMax.slice(0, -1))

    // faccio il calcolo del minimo assoluto su tutte le candele esclusa l'ultima
    // altrimenti non potrei vedere se è stato superato in discesa in termini assoluti
    minimoAssoluto = Math.min(...smaMin.slice(0, -1))

    // calcolo la volatilità settimanale in termini percentuali
    const vol1 = calculateAbsPercVariationArray([massimoAssoluto, minimoAssoluto])
    const vol2 = calculateAbsPercVariationArray([minimoAssoluto, massimoAssoluto])
    let volatilita = roundByDecimals((vol1[0] + vol2[0]) / 2, tickSizeDecimals)

    if (isNaN(volatilita)) {
      volatilita = 0
    }

    callback({ currentPrice, volatilita, numeroDoppiTocchiMassimi, numeroDoppiTocchiMinimi, numeroTripliTocchiMassimi, numeroTripliTocchiMinimi, massimiVicini: [...new Set(massimiVicini.sort())], minimiVicini: [...new Set(minimiVicini.sort())], massimoAssoluto, minimoAssoluto, doppiTocchiMassimi, doppiTocchiMinimi, tripliTocchiMassimi, tripliTocchiMinimi })
  }).catch((r) => {
    logFile.write(util.format(r) + '\n')
    console.log(r)
  })
}

// suona in caso di eccezioni
let lastDrinTime = 0
async function playDrin (bypass) {
  const path = require('path')
  const filePath = path.join(__dirname, 'drin.mp3')

  const ora = new Date().getHours()

  if (bypass === true) {
    if (soundDisabled === false) {
      sound.play(filePath)
    }
  } else if (ora < 22 && ora >= 9 && new Date().getTime() - lastDrinTime >= 30000) {
    if (soundDisabled === false) {
      sound.play(filePath)
      lastDrinTime = new Date().getTime()
    }
  }
}

// suona in caso di acquisto di assets
let lastBullTime = 0
async function playBullSentiment (bypass) {
  const path = require('path')
  const filePath = path.join(__dirname, 'bull_sentiment.mp3')
  const ora = new Date().getHours()

  if (bypass === true) {
    if (soundDisabled === false) {
      sound.play(filePath)
    }
  } else if (ora < 22 && ora >= 9 && new Date().getTime() - lastBullTime >= 30000) {
    if (soundDisabled === false) {
      sound.play(filePath)
      lastBullTime = new Date().getTime()
    }
  }
}

function piazzaOrdineOco (simbolo, quantity, takeProfit, stopLossTrigger, stopLoss, baseAssetPrecision, lotSize, ocoAttemps, singleClient, callback) {
  // per piazzare l'ordine OCO (One Cancel Other) di chiusura

  console.log('trying placing OCO', simbolo, quantity)

  // legge il bilancio di quel simbolo nel wallet
  singleClient.accountInfo().then(accountInfo => {
    quantity = accountInfo.balances.filter(v => v.asset === simbolo.slice(0, -4))[0].free
    // in caso di ritentativo per bilancio insufficiente, ricalcola la quantità di vendita
    if (ocoAttemps > 0) {
      quantity = quantity / 100 * (100 - (0.075 * (ocoAttemps - 1)))
    }
    quantity = roundByDecimals(roundByLotSize(quantity, lotSize), baseAssetPrecision)

    singleClient.dailyStats({ symbol: simbolo }).then(dailyStats => {
      // se rileva che il prezzo di vendita sia più basso del prezzo di bid
      // vende a mercato subito
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
            logFile.write(util.format(reason) + '\n')
            playDrin()
            callback([false, 'single_client.order SELL'])
          }
        })
      } else {
        // piazza l'ordine OCO con quantità da vendere, take profit, stop loss trigger e stop los
        singleClient.orderOco({
          symbol: simbolo,
          side: 'SELL',
          quantity,
          price: takeProfit,
          stopPrice: stopLossTrigger,
          stopLimitPrice: stopLoss
        }).then(response => {
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
              logFile.write(util.format(reason) + '\n')
              playDrin()
              callback([false, 'maxOCOattempts reached'])
            }
          })
      }
    }).catch((reason) => {
      console.log('dailyStats', simbolo, reason)
      if (ocoAttemps < 10) {
        ocoAttemps++
        setTimeout(function () {
          piazzaOrdineOco(simbolo, quantity, takeProfit, stopLossTrigger, stopLoss, baseAssetPrecision, lotSize, ocoAttemps, singleClient, callback)
        }, 1000)
      } else {
        ocoAttemps = 0
        console.log('maxAttemps reached', simbolo)
        logFile.write(util.format(reason) + '\n')
        playDrin()
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
      logFile.write(util.format(reason) + '\n')
      ocoAttemps = 0
      playDrin()
      callback([false, 'maxOCOattempts reached'])
    }
  })
}

async function autoInvestiLongOrderbook (arrayPrevisioniFull) {
  // istruzione di acquisto di un asset, dopo aver passato i primi filtri
  try {
    client.exchangeInfo().then((e) => {
      const tickSize = e.symbols.filter(v => v.symbol === arrayPrevisioniFull[0].simbolo)[0].filters.filter(v => v.filterType === 'PRICE_FILTER')[0].tickSize
      const tickSizeDecimals = tickSize.toString().countDecimals()

      analisiGraficoOrderbook(arrayPrevisioniFull[0].simbolo, client, tickSizeDecimals, (analisiGraficoBook) => {
        console.log(analisiGraficoBook)
        const condition = analisiGraficoBook.convenienza
        if (analisiGraficoBook !== false && condition === true) {
          console.log('CONDIZIONE VERA', arrayPrevisioniFull[0].simbolo, analisiGraficoBook)

          for (const singleClient of clients) {
            for (const arrayPrevisioni of arrayPrevisioniFull) {
              singleClient.accountInfo().then(accountInfo => {
                // calcolo della liquidità in USDT disponibile nel wallet
                const UsdtAmount = accountInfo.balances.filter(v => v.asset === 'USDT')[0].free / 100 * 97.5
                singleClient.dailyStats({ symbol: arrayPrevisioni.simbolo }).then(symbolPrice => {
                  // calcolo della quantità aquistabile con gli USDT disponibili, arrotondata per LotSize
                  let maxQty = UsdtAmount / Number(analisiGraficoBook.currentAskPrice)
                  maxQty = roundByDecimals(roundByLotSize(maxQty, arrayPrevisioni.lotSize), arrayPrevisioni.baseAssetPrecision)
                  console.log('VALUTAZIONE ORDINE', 'SIMBOLO', arrayPrevisioni.simbolo, 'SALDO USDT', UsdtAmount, 'QUANTITA', maxQty, 'TICK SIZE', tickSize, 'TICK SIZE DECIMALS', tickSizeDecimals)

                  const takeProfit = analisiGraficoBook.bestAsk
                  const stopLossTrigger = roundByDecimals(analisiGraficoBook.bestBid, tickSizeDecimals)
                  // calcolo dello stop loss effettivo (più basso del trigger per evitare problemi di slippage)
                  const stopLoss = roundByDecimals(analisiGraficoBook.bestBid / 100 * 99.5, tickSizeDecimals)

                  // filtro di liquidità in 24 ore, per non investire su mercati fermi o comunque poco scambiati
                  if (symbolPrice.quoteVolume > 4000000) {
                    console.log('TEST LIQUIDITA SUPERATO', 'SIMBOLO', arrayPrevisioni.simbolo, 'SL', stopLoss, 'SL Trigger', stopLossTrigger, 'TP', takeProfit)

                    // filtro di minima quantità di USDT da investire impostato a 25 USDT
                    if (UsdtAmount >= 25) {
                      singleClient.openOrders({ symbol: arrayPrevisioni.simbolo }).then(openOrders => {
                        // se non ci sono ordini già aperti in questo simbolo, compra a mercato
                        if (openOrders.length === 0) {
                          console.log('APERTURA ORDINE MERCATO', 'SIMBOLO', arrayPrevisioni.simbolo, 'QUANTITA', maxQty, 'TICK SIZE', tickSize, 'TICK SIZE DECIMALS', tickSizeDecimals)
                          playBullSentiment()

                          singleClient.order({
                            symbol: arrayPrevisioni.simbolo,
                            side: 'BUY',
                            type: 'MARKET',
                            quantity: maxQty,
                            newClientOrderId: 'BUY'
                          }).then(() => {
                            // imposta l'ordine OCO
                            piazzaOrdineOco(arrayPrevisioni.simbolo, maxQty, takeProfit, stopLossTrigger, stopLoss, arrayPrevisioni.baseAssetPrecision, arrayPrevisioni.lotSize, 0, singleClient, function (cb) {
                              if (cb[0] === true) {
                                console.log('ORDINE OCO PIAZZATO', arrayPrevisioni.simbolo)
                              } else {
                                console.log('piazzaOrdineOco internal', cb[1])
                              }
                            })
                          }).catch((reason) => {
                            logFile.write(util.format(reason) + '\n')
                            playDrin()
                            console.log('single_client.order BUY', arrayPrevisioni.simbolo, reason)
                          })
                        }
                      }).catch((reason) => {
                        logFile.write(util.format(reason) + '\n')
                        playDrin()
                        console.log('single_client.openOrders', arrayPrevisioni.simbolo, reason)
                      })
                    }
                  }
                }).catch((reason) => {
                  logFile.write(util.format(reason) + '\n')
                  playDrin()
                  console.log('single_client.dailyStats', arrayPrevisioni.simbolo, reason)
                })
              }).catch((reason) => {
                logFile.write(util.format(reason) + '\n')
                playDrin()
                console.log('single_client.accountInfo', arrayPrevisioni.simbolo, reason)
              })
            };
          };
        }
      })
    }).catch((reason) => {
      logFile.write(util.format(reason) + '\n')
      playDrin()
      console.log('single_client.exchangeInfo', arrayPrevisioniFull[0].simbolo, reason)
    })
  } catch (reason) {
    logFile.write(util.format(reason) + '\n')
    playDrin()
    console.log(reason)
  }
}

// eslint-disable-next-line no-unused-vars
// Appartenente alla versione precedente. Non documentato
async function autoInvestiLong (arrayPrevisioniFull) {
  try {
    for (const singleClient of clients) {
      for (const arrayPrevisioni of arrayPrevisioniFull) {
        client.exchangeInfo().then((e) => {
          const tickSize = e.symbols.filter(v => v.symbol === arrayPrevisioni.simbolo)[0].filters.filter(v => v.filterType === 'PRICE_FILTER')[0].tickSize
          const tickSizeDecimals = tickSize.toString().countDecimals()

          singleClient.accountInfo().then(accountInfo => {
            const UsdtAmount = accountInfo.balances.filter(v => v.asset === 'USDT')[0].free / 100 * 90
            singleClient.dailyStats({ symbol: arrayPrevisioni.simbolo }).then(symbolPrice => {
              singleClient.candles({ symbol: arrayPrevisioni.simbolo, interval: '1m', limit: 5 }).then((ultimeCandele) => {
                let ultimeCandeleArray = ultimeCandele.map((v) => { return Number(v.close) > Number(v.open) })

                ultimeCandeleArray = ultimeCandeleArray.filter((v, i, a) => {
                  return i > 0 && a[i] === true && a[i - 1] === true
                })

                console.log(arrayPrevisioni.simbolo, 'ultimeCandele', ultimeCandeleArray)

                if (ultimeCandeleArray.length > 0) {
                  let maxQty = UsdtAmount / Number(symbolPrice.askPrice)
                  maxQty = roundByDecimals(roundByLotSize(maxQty, arrayPrevisioni.lotSize), arrayPrevisioni.baseAssetPrecision)
                  console.log('VALUTAZIONE ORDINE', 'SALDO USDT', UsdtAmount, 'SIMBOLO', arrayPrevisioni.simbolo, 'QUANTITA', maxQty, 'MEDIANA', arrayPrevisioni.median, 'TAKE PROFIT', roundByDecimals((symbolPrice.askPrice / 100 * (100 + arrayPrevisioni.median)), tickSizeDecimals), 'STOP LOSS', roundByDecimals((symbolPrice.bidPrice / 100 * (100 - 1)), tickSizeDecimals), 'TICK SIZE', tickSize, 'TICK SIZE DECIMALS', tickSizeDecimals)

                  const stopLossTriggerPerc = 1
                  const stopLossPerc = 1.2
                  const takeProfit = roundByDecimals((symbolPrice.askPrice / 100 * (100 + arrayPrevisioni.median)), tickSizeDecimals)

                  const stopLossTrigger = roundByDecimals((symbolPrice.bidPrice / 100 * (100 - stopLossTriggerPerc)), tickSizeDecimals)
                  const stopLoss = roundByDecimals((symbolPrice.bidPrice / 100 * (100 - stopLossPerc)), tickSizeDecimals)

                  console.log(arrayPrevisioni.simbolo, 'QuoteVolume', symbolPrice.quoteVolume)

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
                          piazzaOrdineOco(arrayPrevisioni.simbolo, maxQty, takeProfit, stopLossTrigger, stopLoss, arrayPrevisioni.baseAssetPrecision, arrayPrevisioni.lotSize, 0, singleClient, function (cb) {
                            if (cb[0] === true) {
                              console.log('ORDINE OCO PIAZZATO', arrayPrevisioni.simbolo)
                            } else {
                              console.log('piazzaOrdineOco internal', cb[1])
                            }
                          })
                        }).catch((reason) => {
                          logFile.write(util.format(reason) + '\n')
                          console.log('single_client.order BUY', arrayPrevisioni.simbolo, reason)
                        })
                      }
                    }).catch((reason) => {
                      logFile.write(util.format(reason) + '\n')
                      console.log('single_client.openOrders', arrayPrevisioni.simbolo, reason)
                    })
                  }
                }
              }).catch(reason => {
                logFile.write(util.format(reason) + '\n')
                console.log('single_client.candles', arrayPrevisioni.simbolo, reason)
              })
            }).catch((reason) => {
              logFile.write(util.format(reason) + '\n')
              console.log('single_client.dailyStats', arrayPrevisioni.simbolo, reason)
            })
          }).catch((reason) => {
            logFile.write(util.format(reason) + '\n')
            console.log('single_client.accountInfo', arrayPrevisioni.simbolo, reason)
          })
        }).catch((reason) => {
          logFile.write(util.format(reason) + '\n')
          console.log('single_client.exchangeInfo', arrayPrevisioni.simbolo, reason)
        })
      };
    };
  } catch (reason) {
    logFile.write(util.format(reason) + '\n')
    console.log(reason)
  }
}

// funzione che serve a vedere la data nel server di binance
// client.time().then(time => console.log(time));

// vede la differenza di percentuale tra il vecchio e il nuovo numero
function calculatePercDiff (finalValue, initialValue) {
  return ((finalValue - initialValue) / initialValue) * 100
}

// legge la differenza percentuale tra tutti i valori dell'array
function calculateAbsPercVariationArray (values, period) {
  if (values.length < 2) throw new Error('No sufficient inputs')

  values = values.slice(period * -1)

  const percentageArray = []

  for (let i = 1; i < values.length; i++) {
    percentageArray.push(calculatePercDiff(values[i], values[i - 1]))
  }

  return percentageArray
}

// vede l'angolazione della curva basandosi sulla percentuale nell'angolo da 0 a 90 gradi
function percentTo0until90Angle (percent) {
  return roundByDecimals(90 / 100 * percent, 2)
}

// calcola la mediana in un array
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

// va a leggere velocemente in parallelo tutti i simboli
// con un numero massimo di connessioni simultanee al secondo
function promessa (market, exchangeName, callback) {
  let condizioneVerificata
  if (exchangeName === 'binance') {
    condizioneVerificata = market.symbol.slice(0, 3) !== 'BNB' && market.symbol.slice(-4) === 'USDT' && market.status === 'TRADING' && market.isSpotTradingAllowed === true
  }

  if (condizioneVerificata === true) {
    if (new Date().getSeconds() !== prevSeconds) {
      prevSeconds = new Date().getSeconds()
      connectionLimit = 0
    }

    // limite di connessioni in contemporanea, e di connessioni al secondo
    if (simultaneousConnections < 3 && connectionLimit < 3) {
      let askClosePrices = []
      let lotSize = []

      if (exchangeName === 'binance') {
        simultaneousConnections++

        connectionLimit += 1

        client.candles({ symbol: market.symbol, interval: '30m', limit: 340 }).then((rawPrices) => {
          askClosePrices = rawPrices.map((v) => { return Number(v.close) })
          lotSize = market.filters.filter(v => v.filterType === 'LOT_SIZE')[0].stepSize

          simultaneousConnections--
          callback([true, { symbol: market.symbol, baseAsset: market.baseAsset, baseAssetPrecision: market.baseAssetPrecision, rawPrices, askClosePrices, lotSize }])
        }).catch((reason) => {
          logFile.write(util.format(reason) + '\n')
          console.log('no1', market.symbol, reason)
          simultaneousConnections--
          callback([false, reason])
        })
      }
    } else {
      setTimeout(function () { promessa(market, exchangeName, callback) }, time)
    }
  } else {
    callback([false, 'non verificata'])
  }
}

// appartenente alla versione vecchia e non documentato
async function bootstrap () {
  const arrayPrevisioni = []

  console.log('---------------------------------------------------------------------------')
  const binanceDate = new Date().toLocaleString()
  console.log('DATA', binanceDate)

  const exchangeName = 'binance'

  let info, symbols

  if (exchangeName === 'binance') {
    info = await client.exchangeInfo()
    symbols = info.symbols
  }

  for (const market of symbols) {
    new Promise((resolve, reject) => {
      promessa(market, exchangeName, function (result) {
        if (result[0] === true) {
          // console.log(result);
          resolve(result[1])
        } else {
          reject(result[1])
        }
      })
    }).then(result => {
      const promiseModel = { value: result }

      const symbol = promiseModel.value.symbol
      const rawPrices = promiseModel.value.rawPrices
      const askClosePrices = promiseModel.value.askClosePrices
      const baseAsset = promiseModel.value.baseAsset
      const baseAssetPrecision = promiseModel.value.baseAssetPrecision
      const lotSize = promiseModel.value.lotSize

      if (tradeDebugEnabled === true) {
        console.log('\n', symbol)
      }

      if (askClosePrices.length > 201) {
        const medianPercDifference = calculateMedian(calculateAbsPercVariationArray(askClosePrices, 14))

        const smaMinore = SMA.calculate({
          period: 50,
          values: askClosePrices
        })

        const trendMinoreRibassista = smaMinore[smaMinore.length - 1] < smaMinore[smaMinore.length - 2]

        // eslint-disable-next-line no-unused-vars
        const trendMinoreRialzista = smaMinore[smaMinore.length - 1] > smaMinore[smaMinore.length - 2]
        if (tradeDebugEnabled === true) {
          console.log('TREND MINORE RIBASSISTA', trendMinoreRibassista)
        }

        const smaMaggiore = SMA.calculate({
          period: 200,
          values: askClosePrices
        })

        const trendMaggioreRialzista = smaMaggiore[smaMaggiore.length - 1] > smaMaggiore[smaMaggiore.length - 2]

        // eslint-disable-next-line no-unused-vars
        const trendMaggioreRibassista = smaMaggiore[smaMaggiore.length - 1] < smaMaggiore[smaMaggiore.length - 2]

        if (tradeDebugEnabled === true) {
          console.log('TREND MAGGIORE RIALZISTA', trendMaggioreRialzista)
        }

        const rsi = RSI.calculate({
          period: 14,
          values: askClosePrices
        })

        const rsiRialzista = rsi[rsi.length - 1] < 30

        // eslint-disable-next-line no-unused-vars
        const rsiRibassista = rsi[rsi.length - 1] > 70

        if (tradeDebugEnabled === true) {
          console.log('RSI', rsi[rsi.length - 1])
          console.log('RSI RIALZISTA', rsiRialzista)
        }

        const macdInput = {
          values: askClosePrices,
          fastPeriod: 8,
          slowPeriod: 21,
          signalPeriod: 5,
          SimpleMAOscillator: false,
          SimpleMASignal: false
        }

        const macd = MACD.calculate(macdInput)

        const segnaleSuperaMACD = macd[macd.length - 1].signal > macd[macd.length - 1].MACD4

        // eslint-disable-next-line no-unused-vars
        const segnaleSuperaMACDBasso = macd[macd.length - 1].signal < macd[macd.length - 1].MACD

        if (tradeDebugEnabled === true) {
          console.log('SEGNALE SUPERA MACD', segnaleSuperaMACD)
        }

        if (trendMinoreRibassista === true && trendMaggioreRialzista === true && rsiRialzista === true && segnaleSuperaMACD === true) {
          const closeTime = new Date(rawPrices[rawPrices.length - 1].closeTime)
          const stopLoss = 1
          const arrayInvestimento = []

          console.log('TEST LONG', symbol, 'PREZZO', rawPrices[rawPrices.length - 1].close)

          arrayPrevisioni.push({ azione: 'LONG', simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 - stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision, lotSize })
          arrayInvestimento.push({ azione: 'LONG', simbolo: symbol, price: rawPrices[rawPrices.length - 1].close, tp: rawPrices[rawPrices.length - 1].close / 100 * (100 + medianPercDifference), sl: rawPrices[rawPrices.length - 1].close / 100 * (100 - stopLoss), base_asset: baseAsset, RSI: rsi[rsi.length - 1], date: closeTime, baseAssetPrecision, lotSize, median: medianPercDifference })
          autoInvestiLong(arrayInvestimento)
        }
      }
    }).catch(() => {
    })
  }
}

// metodo iniziale per il primo filtraggio degli asset "interessanti" da acquistare
async function bootstrapModalitaOrderbook () {
  console.log('---------------------------------------------------------------------------')
  const binanceDate = new Date().toLocaleString()
  console.log('DATA', binanceDate)
  console.log('SINCRONIZZA OROLOGIO DI WINDOWS')
  console.log('https://answers.microsoft.com/it-it/windows/forum/all/modificare-la-frequenza-di-aggiornamento/56ff20dd-1901-41f4-8799-efe767d96886')

  const exchangeName = 'binance'

  // leggo tutti i simboli disponibili per lo scambio da binance
  let info, symbols
  if (exchangeName === 'binance') {
    info = await client.exchangeInfo()
    symbols = info.symbols
  }

  // va a leggere con le promise asincrone i dati di ogni simbolo che scambia in USDT
  for (const market of symbols) {
    new Promise((resolve, reject) => {
      promessa(market, exchangeName, function (result) {
        if (result[0] === true) {
          resolve(result[1])
        } else {
          reject(result[1])
        }
      })
    }).then(result => {
      const promiseModel = { value: result }

      const symbol = promiseModel.value.symbol
      const askClosePrices = promiseModel.value.askClosePrices
      const baseAssetPrecision = promiseModel.value.baseAssetPrecision
      const lotSize = promiseModel.value.lotSize

      if (tradeDebugEnabled === true) {
        console.log('\n', symbol)
      }

      if (askClosePrices.length > 338) {
        // trend di 2 ore
        const sma4 = SMA.calculate({
          period: 4,
          values: askClosePrices
        })

        // trend di 8 ore (lavorativa)
        const sma16 = SMA.calculate({
          period: 16,
          values: askClosePrices
        })

        // trend della settimana
        const sma336 = SMA.calculate({
          period: 336,
          values: askClosePrices
        })

        const forzaSmaCorta = percentTo0until90Angle(calculatePercDiff(sma4[sma4.length - 1], sma4[sma4.length - 2]))
        const forzaSmaLunga = percentTo0until90Angle(calculatePercDiff(sma16[sma16.length - 1], sma16[sma16.length - 2]))
        const forzaSmaSettimana = percentTo0until90Angle(calculatePercDiff(sma336[sma336.length - 1], sma336[sma336.length - 2]))
        // rapporto tra SmaCorta e SmaLunga
        const rapportoIncrocioSma = forzaSmaCorta / forzaSmaLunga

        // ho calcolato la mediana dell'angolo di apertura dell'SMA4 quando poi ha fatto +5%:
        // 0.22 di angolo solo se sma > 0
        // la SMA16 mediamente ha 0.26 gradi di angolo
        if (forzaSmaSettimana > 0 && forzaSmaLunga > 0.25 && forzaSmaCorta > 0.25 && sma4[sma4.length - 1] > sma16[sma16.length - 1]) {
          console.log(
            symbol,
            'data', new Date().toLocaleString(),
            'forzaSmaSettimana', forzaSmaSettimana.toFixed(2),
            'forzaSmaLunga', forzaSmaLunga.toFixed(2),
            'sma4 - 1', sma4[sma4.length - 1].toFixed(5),
            'sma4 - 2', sma4[sma4.length - 2].toFixed(5),
            'sma16 - 1', sma16[sma16.length - 1].toFixed(5),
            'sma16 - 2', sma16[sma16.length - 2].toFixed(5),
            'forzaSmaCorta', forzaSmaCorta.toFixed(2),
            'rapportoIncrocioSma', rapportoIncrocioSma.toFixed(2))

          const arrayInvestimento = []

          arrayInvestimento.push({ azione: 'LONG', simbolo: symbol, baseAssetPrecision, lotSize })

          autoInvestiLongOrderbook(arrayInvestimento)
        }
      }
    }).catch(() => {
    })
  }
}

// eslint-disable-next-line no-unused-vars
// fa un analisi del grafico e successivamente adatta i valori all'order book in automatico
function analisiGraficoOrderbook (simbolo, singleClient, tickSizeDecimals, callback) {
  analisiGraficaGiornalieraMassimiMinimiVicini(simbolo, tickSizeDecimals, (grafica) => {
    const data = new Date().toLocaleString()
    const currentPrice = grafica.currentPrice

    // blocco il massimo guadagno a +2.5% per non farmi male
    const maxGuadagnoPerc = 2.5

    // eslint-disable-next-line array-callback-return
    let boolReimpostazioneNextMaxPrice = false

    // legge il prossimo prezzo massimo
    let nextMaxPrice = grafica.massimiVicini.sort().filter((v) => {
      // il prossimo prezzo massimo deve essere maggiore del prezzo attuale
      if (v > currentPrice) {
        return v
      }
    })
    // se ha trovato prezzi massimi imposta il prossimo
    if (nextMaxPrice.length > 0) {
      nextMaxPrice = nextMaxPrice[0]
    } else {
      // altrimenti lo imposta a 0
      nextMaxPrice = Infinity
      boolReimpostazioneNextMaxPrice = true
    }

    // eslint-disable-next-line no-unused-vars, array-callback-return
    // imposta il prossimo prezzo minimo trovato, se è dall'1 a 1.3% in meno di adesso
    // perchè fa da trigger per lo stop loss, che però è il minprice * 1.5
    // quindi per contenere la perdita al massimo al 2% è meglio fare così
    let nextMinPrice = grafica.minimiVicini.sort().reverse().filter((v) => {
      if (v < currentPrice * 0.99 && v > currentPrice * 0.987) {
        return v
      }
    })

    let boolReimpostazioneStopLoss = false
    if (nextMinPrice.length > 0) {
      nextMinPrice = nextMinPrice[0]
    } else {
      // se non ha trovato niente di poco minore, imposta lo stop loss trigger a -1%
      nextMinPrice = currentPrice * 0.99
      boolReimpostazioneStopLoss = true
    }

    // vede se siamo sotto ai minimi assoluti
    let boolSottoMinimiGiornalieri = false
    if (currentPrice < grafica.minimoAssoluto) {
      boolSottoMinimiGiornalieri = true
    }

    // vede la differenza percentuale tra prezzo corrente e prossimo massimo
    let diffMaxPerc = ((nextMaxPrice - currentPrice) / currentPrice) * 100

    // se il prezzo massimo successivo è troppo alto, imposta il take profit a maxGuadagnoPerc
    if (diffMaxPerc >= maxGuadagnoPerc) {
      nextMaxPrice = roundByDecimals(currentPrice / 100 * (100 + maxGuadagnoPerc), tickSizeDecimals)
      diffMaxPerc = ((nextMaxPrice - currentPrice) / currentPrice) * 100
    }

    // setta la differenza tra prezzo corrente e prezzo minimo più vicino
    const diffMinPerc = ((nextMinPrice - currentPrice) / currentPrice) * 100

    const boolDoppioMassimo = grafica.doppiTocchiMassimi.indexOf(nextMaxPrice) !== -1
    const boolDoppioMinimo = grafica.doppiTocchiMinimi.indexOf(nextMinPrice) !== -1
    const boolTriploMassimo = grafica.tripliTocchiMassimi.indexOf(nextMaxPrice) !== -1
    const boolTriploMinimo = grafica.tripliTocchiMinimi.indexOf(nextMinPrice) !== -1

    analisiOrderBook(simbolo, currentPrice, nextMaxPrice, nextMinPrice, (book) => {
      const currentAskPrice = book.asks2[book.asks2.length - 1].price
      const diffAskPerc = ((book.bestAsk - currentAskPrice) / currentAskPrice) * 100
      const diffBidPerc = ((book.bestBid - currentAskPrice) / currentAskPrice) * 100

      // vede se nella candela corrente e le 2 precedenti, i volumi e prezzi stanno salendo
      // nella candela corrente fa il calcolo in proporzione ai secondi
      // passati dall'apertura della candela corrente, confrontati ai volumi di quei secondi nella candela prima
      // e lo stesso fa per i prezzi
      const candlesPeriod = 3
      singleClient.candles({ symbol: simbolo, interval: '1m', limit: candlesPeriod }).then((ultimeCandele) => {
        const priceTrend = ultimeCandele.filter((v, i, a) => {
          if (i > 0) {
            if (i < candlesPeriod - 1) {
              return Number(v.close) > Number(v.open) && Number(a[i - 1].close) > Number(a[i - 1].open) &&
              Number(v.close) > Number(a[i - 1].close) && Number(v.volume) > Number(a[i - 1].volume)
            } else {
              const seconds = new Date().getSeconds()
              const volumeDivSeconds = Number(a[i - 1].volume) / 60 * seconds
              const closeDivSeconds = Number(a[i - 1].close) / 60 * seconds

              return Number(v.close) > Number(v.open) && Number(a[i - 1].close) > Number(a[i - 1].open) &&
              Number(v.close) > closeDivSeconds && Number(v.volume) > volumeDivSeconds
            }
          }
        }
        )

        console.log('priceTrend', priceTrend.length, 'periodo', candlesPeriod - 1, 'soglia', (candlesPeriod - 1) / 10 * 6)
        // vede se i prezzi sono in salita in pratica
        const gradiForzaPrezzo = priceTrend.length >= (candlesPeriod - 1) / 10 * 6

        let vicinoDoppioMassimo = false
        let vicinoTriploMassimo = false
        let superaDoppioMassimo = false
        let superaTriploMassimo = false
        let superaMassimoVicino = false
        let superaMassimoAssoluto = false
        let superaMinimoAssoluto = false

        // se sei sotto al massimo dell'1% rispetto al doppio tocco massimo
        grafica.doppiTocchiMassimi.forEach((massimo) => {
          if (currentAskPrice < massimo && currentAskPrice > massimo * 0.99) {
            vicinoDoppioMassimo = true
            // console.log(simbolo, 'close vicino doppio tocco massimo', massimo)
          }
        })

        // se sei sotto al massimo dell'1% rispetto al triplo tocco massimo
        grafica.tripliTocchiMassimi.forEach((massimo) => {
          if (currentAskPrice < massimo && currentAskPrice > massimo * 0.99) {
            vicinoTriploMassimo = true
            // console.log(simbolo, 'close vicino triplo tocco massimo', massimo)
          }
        })

        // se sei hai superato al massimo dell'1% il doppio tocco massimo
        grafica.doppiTocchiMassimi.forEach((massimo) => {
          if (currentAskPrice > massimo && currentAskPrice < massimo * 1.01) {
            superaDoppioMassimo = true
            // console.log(simbolo, 'close supera doppio tocco massimo', massimo)
          }
        })

        // se sei hai superato al massimo dell'1% il triplo tocco massimo
        grafica.tripliTocchiMassimi.forEach((massimo) => {
          if (currentAskPrice > massimo && currentAskPrice < massimo * 1.01) {
            superaTriploMassimo = true
            // console.log(simbolo, 'close supera triplo tocco massimo', massimo)
          }
        })

        // se sei hai superato al massimo dell'1% un massimo singolo
        grafica.massimiVicini.forEach((massimo) => {
          if (currentAskPrice > massimo && currentAskPrice < massimo * 1.01) {
            superaMassimoVicino = true
            // console.log(simbolo, 'close supera triplo tocco massimo', massimo)
          }
        })

        // se sei hai superato il massimo assoluto
        if (currentAskPrice > grafica.massimoAssoluto * 1.01) {
          superaMassimoAssoluto = true
        }

        // se sei hai superato il massimo assoluto il minimo assoluto
        if (currentAskPrice < grafica.minimoAssoluto) {
          superaMinimoAssoluto = true
        }

        let convenienza = false
        let puntiConvenienza = 0

        // facciamo finta che abbiamo comprato per un prezzo ask di 100 USDT
        // posso perdere da 1.50 a 2 euro (media 1.75) e guadagnare da 1.50 a 2.50 USDT ( media 2)
        // il calcolo va fatto però non sullo stop trigger ma sullo stop loss effettivo,
        // che sarebbe il trigger % * 1.5
        // quindi il rapporto più conveniente tra askperc / stoplossperc è da >=1 a <=1.67
        // perchè 1.5 / 1.5 che è il rapporto peggiore è 1
        // e 2.5 / 1.5 che è il migliore fa 1.67
        // 2.5 / 2 che è il valore medio fa 1.25
        if (Math.abs(diffAskPerc) / Math.abs(diffBidPerc * 1.5) >= 1 && Math.abs(diffAskPerc) / Math.abs(diffBidPerc * 1.5) <= 1.67) {
          puntiConvenienza++
        }

        // è da 3 punti perchè considere assieme volumi e prezzi in salita, e chiusure maggiori delle precedenti
        if (gradiForzaPrezzo === true) {
          console.log(gradiForzaPrezzo)
          puntiConvenienza += 3
        }

        if (superaMassimoVicino === true) {
          puntiConvenienza++
        }

        // rottura della resistenza su doppio massimo o massimo assoluto da poco tempo
        if (superaDoppioMassimo === true || superaMassimoAssoluto === true) {
          puntiConvenienza += 2
        }

        // rottura della resistenza su triplo massimo da poco tempo
        if (superaTriploMassimo === true) {
          puntiConvenienza += 3
        }

        // deve superare i 6 punti su 10 (la sufficienza)
        if (puntiConvenienza >= 6) {
          convenienza = true
        }

        // condizioni di esclusione obbligatoria
        // posso tollerare solo la reimpostazione stop loss dato che viene reimpostato a -1%
        if (book.bestAsk === undefined || book.bestBid === undefined || superaMinimoAssoluto === true || grafica.minimoAssoluto === Infinity || grafica.massimoAssoluto === 0 || grafica.volatilitaGiornaliera === 0 || boolSottoMinimiGiornalieri === true) {
          convenienza = false
        }

        callback({
          convenienza,
          puntiConvenienza,
          data,

          massimoAssoluto: grafica.massimoAssoluto,
          minimoAssoluto: grafica.minimoAssoluto,

          superaMassimoAssoluto,
          superaMinimoAssoluto,

          massimiVicini: grafica.massimiVicini,
          minimiVicini: grafica.minimiVicini,
          boolSottoMinimiGiornalieri,

          doppiTocchiMassimi: grafica.doppiTocchiMassimi,
          tripliTocchiMassimi: grafica.tripliTocchiMassimi,

          boolDoppioMassimo,
          boolDoppioMinimo,
          boolTriploMassimo,
          boolTriploMinimo,

          vicinoDoppioMassimo,
          vicinoTriploMassimo,
          superaMassimoVicino,
          superaDoppioMassimo,
          superaTriploMassimo,

          doppiTocchiMinimi: grafica.doppiTocchiMinimi,
          tripliTocchiMinimi: grafica.tripliTocchiMinimi,

          currentPrice,
          currentAskPrice,

          nextMaxPrice,
          nextMinPrice,
          boolReimpostazioneNextMaxPrice,
          boolReimpostazioneStopLoss,
          diffMaxPerc,
          diffMinPerc,

          bestAsk: book.bestAsk,
          bestBid: book.bestBid,
          diffAskPerc,
          diffBidPerc
        })
      }).catch(reason => {
        logFile.write(util.format(reason) + '\n')
        console.log(reason)
        callback(false)
      })
    })
  })
}

const roundUpTo = roundTo => x => Math.ceil(x / roundTo) * roundTo
const roundUpTo5Minutes = roundUpTo(1000 * 60 * 5)
const roundUpTo2Minutes = roundUpTo(1000 * 60 * 2)

let nextMinuteDate = 0

playBullSentiment(true)

const modalita = 2
if (modalita === 6) {
  client.exchangeInfo().then((e) => { console.log(e) }).catch(r => console.log(r))
} else if (modalita === 5) {
  logFile.write(util.format('test1') + '\n')
  logFile.write(util.format('test2') + '\n')
  logFile.write(util.format('test3') + '\n')
} else if (modalita === 4) {
  const data = [
    {
      openTime: 1657808520000,
      open: '2.61500000',
      high: '2.62000000',
      low: '2.61400000',
      close: '2.62000000',
      volume: '835.60000000',
      closeTime: 1657808579999,
      quoteVolume: '2186.24290000',
      trades: 25,
      baseAssetVolume: '596.30000000',
      quoteAssetVolume: '1560.05240000'
    },
    {
      openTime: 1657808580000,
      open: '2.62000000',
      high: '2.62200000',
      low: '2.61700000',
      close: '2.62200000',
      volume: '3947.40000000',
      closeTime: 1657808639999,
      quoteVolume: '10341.94100000',
      trades: 50,
      baseAssetVolume: '1563.30000000',
      quoteAssetVolume: '4096.34900000'
    },
    {
      openTime: 1657808640000,
      open: '2.62200000',
      high: '2.62800000',
      low: '2.62200000',
      close: '2.62800000',
      volume: '3995.70000000',
      closeTime: 1657808699999,
      quoteVolume: '10488.80050000',
      trades: 30,
      baseAssetVolume: '2069.70000000',
      quoteAssetVolume: '5433.07330000'
    }
  ]

  const dataFiltered = data.filter((v, i, a) => {
    return i > 0 && Number(v.close) > Number(a[i - 1].close) && Number(v.volume) > Number(a[i - 1].volume)
  })
  console.log(dataFiltered.length, dataFiltered.length >= (3 - 1) / 10 * 6)
  process.exit()
} else if (modalita === 3) {
  analisiOrderBook('TRBUSDT', 15.46, 15.62, 15.33, function (data) {
    console.log(data)
  })
} else if (modalita === 2) {
  // ai secondi 10 così almeno fa ora a valutare i volumi e prezzi dell'inizio dell'ultima candela
  nextMinuteDate = roundUpTo2Minutes(new Date()) + (1000 * 10)
  const currentDate = Date.now()
  const waitFistTime = nextMinuteDate - currentDate

  bootstrapModalitaOrderbook()
  setTimeout(function () {
    bootstrapModalitaOrderbook()
    setInterval(function () {
      bootstrapModalitaOrderbook()
    }, 2 * 60 * 1000)
  }, waitFistTime)
} else {
  nextMinuteDate = roundUpTo5Minutes(new Date()) + 1000
  const currentDate = Date.now()
  const waitFistTime = nextMinuteDate - currentDate

  bootstrap()
  setTimeout(function () {
    bootstrap()
    setInterval(function () {
      bootstrap()
    }, 5 * 60 * 1000)
  }, waitFistTime)
}
