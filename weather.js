'use strict';
const request = require('request');
const dbhost = "127.0.0.1";
const dbport = 5432;
const dbname = "wether";
const dbuser = "postgres";
const dbpwd = "******";//数据库密码
const restport = 8088;
// Log4JS
const log4js = require('log4js');
log4js.configure({
    appenders: [{
        type: 'console'
    },
        {
            type: 'file',
            filename: 'runTime_weatherService.log',
            maxLogSize: 10 * 1024 * 1024,
            backups: 99
        }],
    "levels": {
        "logInfo": "DEBUG"
    }
});
const logger = log4js.getLogger('mapservice');

// Database
const pg = require('pg');
const conStr = "tcp://" + dbuser + ":" + dbpwd + "@" + dbhost + ":" + dbport + "/" + dbname;
const dbClient = new pg.Client(conStr);
dbClient.connect();

// Restify
const restify = require('restify');
const restifyServer = restify.createServer();
restifyServer.use(restify.acceptParser(restifyServer.acceptable));
restifyServer.use(restify.authorizationParser());
restifyServer.use(restify.dateParser());
restifyServer.use(restify.queryParser());
restifyServer.use(restify.jsonp());
restifyServer.use(restify.gzipResponse());
restifyServer.use(restify.bodyParser());

restifyServer.listen(restport, () => {
    logger.info("Weather server started!");
});




/**
 * 输入城市，查询天气
 * @param req
 * @param res
 */
restifyServer.get('/v1/weather/name', ( req, res) => {
    logger.info("/v1/weather/name request received!");
    let weather_conditions = {
        status: 200,
        message: "ok",
        data: []
    };
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    let cityname = req.params.cityname;
    let seperator1 = "-";
    let nowdate = new Date();
    let nowyear = nowdate.getFullYear();
    let nowmonth = nowdate.getMonth()+1;
    let nowdata = nowdate.getDate();
    if (nowmonth >= 1 && nowmonth <= 9) {
        nowmonth = "0" + nowmonth;
    }
    if (nowdata >= 0 && nowdata <= 9) {
        nowdata = "0" + nowdata;
    }
    let nowtime = nowyear+seperator1+nowmonth+seperator1+nowdata;
    let p = /[a-z]/i;
    if(p.test(cityname)){
        weather_conditions.status = 0;
        weather_conditions.message = "你查询的城市不能含有字母";
        res.send( weather_conditions );
        return;
    }
    let createSql = "select * from weather where cityname='" + cityname + "' and citydate='"+nowtime+"'";
    logger.debug(createSql);
    function cityNameSql (cityName) {
        return new Promise((resolve, reject)=>{
            dbClient.query(createSql, (err, rst) => {
                if (err) {
                    logger.error("Database access error while retrieve operator!");
                    weather_conditions.result = 0;
                    weather_conditions.message = "Internal Error!";
                    reject(err);
                } else {
                    if(rst.rows.length == 0){
                        resolve(weather_conditions);
                    } else {
                        weather_conditions.data.push(rst.rows[0]);
                        resolve(weather_conditions);
                    }
                }
            });
        });
    }
    function returnValue(cityVal) {
        return new Promise((resolve, reject)=>{
            let url = "https://api.thinkpage.cn/v3/weather/daily.json?key=vroi1osfgoldcwf1&location="+encodeURIComponent(cityVal)+"&language=zh-Hans&unit=c&start=0&days=1";
            request(url, function (err, response, body) {
                if(err){
                    reject(err);
                } else if (!err && response.statusCode == 200) {
                    resolve(body);
                } else {
                    resolve(body);
                }
            })
        });
    }
    function insertSqlValue(insertVal) {
        return new Promise((resolve, reject)=>{
            let situation = JSON.parse(insertVal);
            let cityname = situation.results[0].location.name;
            let daytimeweather = situation.results[0].daily[0].text_day;
            let nightweather = situation.results[0].daily[0].text_night;
            let daytimetemperature = situation.results[0].daily[0].high;
            let nighttemperature = situation.results[0].daily[0].low;
            let citydate = situation.results[0].daily[0].date;
            let createSql = "insert into weather (cityname,daytimetemperature,nighttemperature,daytimeweather,nightweather,citydate) values ('"+cityname+"',"+daytimetemperature+","+nighttemperature+",'"+daytimeweather+"','"+nightweather+"','"+citydate+"')";
            logger.debug(createSql);
            dbClient.query(createSql, (err, rst) => {
                if (err) {
                    logger.error("Database access error while retrieve operator!");
                    weather_conditions.result = 0;
                    weather_conditions.message = "Internal Error!";
                    reject(err);
                } else {
                    resolve(cityname+":天气"+citydate+"数据插入成功");
                }
            });
        });
    }
    let start = async () => {
        try{
            let cityNameSqlVal = await cityNameSql(cityname);
            logger.info('cityNameSql:'+JSON.stringify(cityNameSqlVal));
            if(cityNameSqlVal.data.length == 0){
                let returnVal =  await returnValue(cityname);
                logger.info('returnVal:'+returnVal);
                if(JSON.parse(returnVal).status_code){
                    weather_conditions.status = 0;
                    weather_conditions.message = "你查询的城市不存在";
                    res.send( weather_conditions );
                } else {
                    let situationList = {};
                    let situationWeather = JSON.parse(returnVal);
                    situationList.cityname = situationWeather.results[0].location.name;
                    situationList.daytimeweather = situationWeather.results[0].daily[0].text_day;
                    situationList.nightweather = situationWeather.results[0].daily[0].text_night;
                    situationList.daytimetemperature = situationWeather.results[0].daily[0].high;
                    situationList.nighttemperature = situationWeather.results[0].daily[0].low;
                    situationList.citydate = situationWeather.results[0].daily[0].date;
                    weather_conditions.data.push(situationList);
                    res.send( weather_conditions );
                    let insertSql = await insertSqlValue(returnVal);
                    logger.info(insertSql);
                }
            } else {
                res.send( cityNameSqlVal );
            }
        }
        catch(err){
            logger.info('程序出错了:'+err);
        }
    };

    start();

});



