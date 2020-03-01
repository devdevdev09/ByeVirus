const cheerio = require('cheerio');
const request = require('request');
const Slack   = require("slack-node");
const config  = require("./config.json");
require("date-utils");
const fs = require("fs");

const target  = config.URL;
const webhookUri = config.WEBHOOKURL;

const targetTotal = config.URL_TOTAL;

const column = ["증감", "계", "사망"];

const summary = ["합계", "서울", "대구", "경남", "경북"];


const updateCheck = function(time){
    const fileTime = fileRead();

    if(time == fileTime){
        return false;
    }else{
        return true;
    }
}

const fileRead = function(){
    const fileData = fs.readFileSync("file.txt", "utf8");
    return fileData;
}

const fileWrite = function(time){
    fs.appendFileSync("file.txt", time, "utf8");
}

const getCoronaStatusByLocation = function(callBack){
    request(target, function(error, response, body){
        const $ = cheerio.load(body);
        
        const time = $('.timetable .info').text().trim();
        
        if(!updateCheck(time)){
            console.log("업뎃안됨");
            return;
        }

        let total_msg = "\n";
        // total_msg += time +"\n"
    
        let summary_msg = "";
        summary_msg += time +"\n"
    
        $("table.num>tbody>tr").each(function(){
            const location = $(this).children("th").text();
            const data = [];
            
            $(this).children("td").each(function(i){
                data[i] = Number($(this).text().replace(",",""));
            });
            
            const incre_number = String(data[0]).padStart(3,"0");
            const total_number = String(data[1]).padStart(5,"0");
            const death_number = String(data[4]).padStart(3,"0");

            const msg = `[${location}] 확진 : ${total_number}명\t 사망 : ${death_number}명\t 증감 : ${incre_number}명\n`
    
            total_msg += msg;
    
            if(summary.includes(location)){
                summary_msg += msg;
            }
        });

        fileWrite(time);

        callBack(summary_msg);
    });
};

const slack = new Slack();
slack.setWebhook(webhookUri);

const send = function(msg){
    slack.webhook({
        "username":"byeVirus",
        "text" : msg,
    }, function(err, response){

    });
};

getCoronaStatusByLocation(send);
