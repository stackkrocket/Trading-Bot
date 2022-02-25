require('dotenv').config()
const ccxt = require('ccxt')
const axios = require('axios')

//run the core of the script
const core = async () =>  {
  const { asset, base, allocation, spread} = config;
  const market = `${asset}/${base}`

  //cancel previous in a situation where the market has moved
  const orders = await binanceClient.fetchOpenOrders(market)
  orders.forEach(async order => {
    await binanceClient.cancelOrder(order.id);
  })

  const result = await Promise.all([
    axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
    axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
  ])

  //get market price of bitcoin
  const marketPrice = result[0].data.bitcoin.usd / result[1].data.tether.usd;

  //parameters for the new order - Sell Order
  const sellPrice =  marketPrice * (1 + spread);
  const buyPrice = marketPrice * (1 - spread);
  const balance = await binanceClient.fetchBalance();
  const assetBalance = balance.free[asset];
  const baseBalance = balance.free[base];
  const sellVolume = assetBalance * allocation;
  const buyVolume = (baseBalance * allocation) / marketPrice;

  //send the order to binance
  await Promise.all(
    binanceClient.createLimitSellOrder(market, sellVolume, sellPrice), 
    binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice)
    );

    console.log(
      `
      New tick for ${market}...
      Created limit sell order for ${sellVolume} @ ${sellPrice}
      Created limit buy order for ${buyVolume} @ ${buyPrice}
      `
    )
}

const init = () =>{

  const config = {

    //allocation for each transaction against a profile - For seceurity reason, it is made relatively small....
    asset: 'BTC',
    base: 'USDT',
    allocation: 0.1,
    spread: 0.2,
    tickInterval: 2000
  }

  //Instantiate Binance Client
  const binanceClient = new ccxt.binance({
    apiKey: process.env.API_KEY,
    secretKey: process.env.API_SECRET
  })

  core(config, binanceClient)
  //execute the core script
  setInterval(core, config.tickInterval, config, binanceClient)
}

init();