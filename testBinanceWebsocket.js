// documentazione: https://github.com/binance-exchange/binance-api-node#candles-1

'use strict'

const dotenv = require('dotenv')
dotenv.config()

const Binance = require('binance-api-node').default

const clients = []
process.env.BINANCE_SPOT_KEY.split(',').forEach((v, i) => {
  clients.push(Binance({
    apiKey: process.env.BINANCE_SPOT_KEY.split(',')[i],
    apiSecret: process.env.BINANCE_SPOT_SECRET.split(',')[i]
  }))
})

const client = clients[0]

/* client.ws.candles('SOLUSDT', '1m', candle => {
  console.log(candle)
}) */

let buy = 0
let sell = 0

client.ws.trades(['SOLUSDT'], trade => {
  console.log('\ndata operazione:', new Date(trade.tradeTime))
  // console.log(trade)
  // console.log('soldi spesi:', trade.quantity * trade.price)
  // solo i taker muovono il mercato
  // i maker sono quelli che mettono gli ordini limit
  // console.log('compra?', trade.isBuyerMaker === true)

  if (trade.isBuyerMaker === true) {
    buy += trade.quantity * trade.price
  } else {
    sell += trade.quantity * trade.price
  }

  // console.log('buy', buy)
  // console.log('sell', sell)

  console.log('buy', buy, 'sell', sell, 'buy % difference', ((buy - sell) / buy * 100).toFixed(2))
})
