# weather-api-promise-async-await
------
这是一个天气查询api，数据库使用postgresql:

> * node7.6以上（因为可以直接用async-await）
> * postgresql数据库
> * 安装必要的模块npm install request log4js pg restify
> * node weather
## 功能用途
###1.当输入一个中国城市名存在，会根据所输入的城市名返回今天的这个城市的天气情况
###2.当输入的城市名存在分两种情况，首先根据城市名+当天日期查询数据库是否有今天的城市信息，有从数据库中返回，
无调用天气接口，返回今天天气信息并存入数据库中，当再次查询这个城市时，直接从数据库调用，减少天气接口的调用
###3.当输入的城市名不存在，提示城市不存在
###**结合了使用了promise,async-await--------练手**