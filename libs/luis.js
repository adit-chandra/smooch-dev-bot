const request = require('request');
const builder = require('botbuilder');

//TEST LUIS ADD ID
//var luismodel_appID ="https://api.projectoxford.ai/luis/v1/application?id=2ab18d37-d317-4c45-8ca2-27eadddc0e92&subscription-key=3d2fd6e84b2c4108a889136b79a33f94&q=";

//NEW LUIS TEST KEY
var luismodel_appID = "https://api.projectoxford.ai/luis/v1/application?id=04ad9f35-9d23-4cb3-8c5a-d2fdfcab6544&subscription-key=7ac50969619b4c4b88543d312e33000f&q=";

var message_req = null;

function buildLuisURI(q) {
    var uri = luismodel_appID + encodeURIComponent(q);
    //console.log(uri);
    return uri;
}

exports.setLUISHandler = function(query, callback) {
    var promise = new Promise(function (resolve, reject) {
        request.get(buildLuisURI(query), function (err, res, body) {
            if (err){
                //console.log(err);
                reject();
                throw "Couldn't reach LUIS app. Check logs.";
            }
            //console.log(body);
            var json = JSON.parse(body);
            message_req = json;
            if (callback && typeof(callback) == "function") {
                callback(message_req);
                resolve();
            }
            console.log(message_req);
            resolve();
        });
    });
    return promise;
}

exports.getIntent = function() {
    if (message_req == null) {
        throw "Didn't set a query.";
    }
    var intents = message_req.intents;
    return intents[0].intent;
}

exports.getEntity = function(type) {
    if (message_req == null) {
        throw "Didn't set a query.";
    }
    if (!type) {
        return message_req.entities;
    }
    var data = builder.EntityRecognizer.findEntity(message_req.entities, type);
    if (data){
        return data.entity;
    }
    return data;
}