var request = require('request');

//var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzY29wZXMiOlsiKiJdLCJpc3MiOiJmcm9udCIsInN1YiI6InRlc3RzdGFydCJ9.CYE4PZ7JMS1FAKDgBwnfi52nfen2CJeZVuRx7z-TFS0";

//Secrets&Whispers token
var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzY29wZXMiOlsiKiJdLCJpc3MiOiJmcm9udCIsInN1YiI6ImlzdGhpc2V2ZW5yZWFsMyJ9.JOoIWqEfwII13dzCrmlowqZILB4wZZN9Bv3jpX5RNTE";


//And chill token
//var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzY29wZXMiOlsiKiJdLCJpc3MiOiJmcm9udCIsInN1YiI6ImFuZGNoaWxsX2lvIn0.mlpoMLQSuCBw49ZwZY4fqcgqwTAUPZhwKYs98Tj0FPw";

exports.tagConversationById = function (id, tags) {
    var promise = new Promise(function(resolve, reject) {
        request.get("https://api2.frontapp.com/contacts/alt:smooch:"+id+"/conversations", function(err, resp, body){
            if (err) {
                reject(err);
            }
            var json = JSON.parse(body);
            //console.log(body);
            var convo_to_move;
            try{
                convo_to_move = json._results[0]._links.self;
                var obj = {
                    tags:tags,
                    status: "open"
                };
                var str = JSON.stringify(obj);
                request({
                    url: convo_to_move,
                    method: "PATCH",
                    headers:{
                        "Content-Type":"application/json",
                        "Authorization": "Bearer " + token,
                        "Accept": "application/json"
                    },
                    body: str
                }, function(er, re, bo){
                    if (er) {
                        reject(er);
                        console.log("error");
                    }
                    resolve(bo);
                    //console.log(bo);
                });
            } catch(e){
                console.log(e);
            }
        }).auth(null, null, true, token);
    });
    return promise;
}

exports.commentOnConversation = function(id, message) {
    var promise = new Promise(function(resolve, reject){
        request.get("https://api2.frontapp.com/contacts/alt:smooch:"+id+"/conversations", function(err, resp, body){
            if (err) {
                reject(err);
            }
            var json = JSON.parse(body);
            var convo_to_move = json._results[0]._links.self;
            var obj = {
                author_id:"alt:email:isthisevenreal3@gmail.com",
                body:message
            };
            var str = JSON.stringify(obj);
            request({
                url: convo_to_move + "/comments",
                method: "POST",
                headers:{
                    "Content-Type":"application/json",
                    "Authorization": "Bearer " + token,
                    "Accept": "application/json"
                },
                body: str
            }, function(er, re, bo){
                if (er) {
                    reject(er);
                    console.log("error");
                }
                resolve(bo);
                console.log(bo);
            });
        }).auth(null, null, true, token);
    });
    return promise;
}