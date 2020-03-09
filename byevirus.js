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

const fileName = config.FILE_PATH;
const fileExt = "utf8";


const updateCheck = function(time){
    const fileTime = fileRead();

    if(time == fileTime){
        return false;
    }else{
        return true;
    }
}

const fileRead = function(){
    const fileData = fs.readFileSync(fileName, fileExt);
    return fileData;
}

const jsonFileRead = function(){
    let fileData = fs.readFileSync(fileName, fileExt);
    
    if(!fileData){
        fileData = "[]";
    }

    const data = JSON.parse(fileData);

    return data;
}

const fileWrite = function(data){
    fs.writeFileSync(fileName, data, fileExt);
}

const getCoronaStatusTotal = function(callBack){
    const TARGET_ELEMENT = "ul.liveNum > li";
    const COL_ELEMENT = "strong.tit";
    const NUM_ELEMENT = "span.num";
    const COL_NUM = {
        "전체" : 0, 
        "완치" : 1, 
        "사망" : 3
    };

    request(targetTotal, function(error, response, body){

        if(response.statusCode != 200){
            console.log(logTime + "!(status 200) ");
            return;
        }
        const nowTime = new Date().toFormat("YYYY-MM-DD HH24:MI:SS");
        const logTime = "[" + nowTime + "] : ";
        
        const $ = cheerio.load(body);

        const col = [];
        const num = [];

        $(TARGET_ELEMENT).each(function(i){
            col[i] = $(this).children(COL_ELEMENT).text();
            num[i] = $(this).children(NUM_ELEMENT).text().replace(/[^0-9]/g,"");
        });

        const lastdata = jsonFileRead();

        const now_total = num[COL_NUM["전체"]];
        const now_release = num[COL_NUM["완치"]];
        const now_death = num[COL_NUM["사망"]];
        let now_increase = 0;
        
        if(lastdata.length > 0){
            now_increase = num[0] - lastdata[lastdata.length-1].count.total;
        }else{
            now_increase = 0;
        }

        const nowData = {
            "date" : nowTime,
            "count" : {
                "total"    : now_total,
                "release"  : now_release,
                "death"    : now_death,
                "increase" : now_increase
            }
        }
        
        if(lastdata.length > 0){
            const lastCount = lastdata[lastdata.length-1].count.total;
            const nowCount = nowData.count.total;
    
            if(lastCount == nowCount){
                console.log(logTime + "no update");
                return;
            }else{
                console.log(logTime + "update");
                callBack(nowData);
                lastdata.push(nowData);
                fileWrite(JSON.stringify(lastdata));
            }
        }else{
            console.log(logTime + "update");
            callBack(nowData);
            lastdata.push(nowData);
            fileWrite(JSON.stringify(lastdata));
        }
    })
}

const getCoronaStatusByLocation = function(callBack){
    request(target, function(error, response, body){
        const logTime = "[" + new Date() + "] :";
        if(response.statusCode != "200"){
            console.log(logTime + "response not 200");
            return;
        }else{
            console.log(logTime + "response not 200");
            return;
        }
        console.log(response.statusCode);
        const $ = cheerio.load(body);
        
        const time = $('.timetable .info').text().trim();
        
        if(!updateCheck(time)){
            console.log(logTile + "업뎃안됨");
            return;
        }else{
            console.log(logTile + "업뎃안됨");
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


        fileWrite({
            time : time,
            text : total_msg
        });

        // callBack(summary_msg);
    });
};

const slack = new Slack();
slack.setWebhook(webhookUri);

const send = function(json){
    const count = json.count;
    const msg = `[${json.date}] :  전체 확진 : ${count.total}, 격리 해제 : ${count.release}, 사망 : ${count.death}, 증감 : ${count.increase}`;
    slack.webhook({
        "username" : "byeVirus",
        "text" : msg,
    }, function(err, response){

    });
};

getCoronaStatusTotal(send);
// TODO :: 전체 통계 만들기
