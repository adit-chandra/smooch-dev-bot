const csv = require('csv-parser');
const fs = require('fs');

var self_map;

function generateKey(str) {
    var ret = str.toLowerCase();
    ret = ret.replace(/[!@#$%^&*'":;,\s+]/g, "");
    //console.log("Key generated: " + ret);
    return ret;
}

exports.generateKey = generateKey;

exports.createMap = function (name, callback) {
    var map = {}
    fs.createReadStream(name)
    .pipe(csv())
    .on('data', function (data) {
        var key = generateKey(data.Movie);
        var dataobj = {
            pick: data.Picks,
            reason: data.Reasons,
            trailer: data.Trailer
        }
        var isIn = false;
        if (!map[key]) {
            map[key] = [];
        }
        for (var i = 0; i < map[key].length; i++) {
            if (map[key][i].pick == dataobj.pick) {
                isIn = true;
                if (map[key][i].reason.indexOf(dataobj.reason) == -1){
                    map[key][i].reason.push(dataobj.reason.toLowerCase());
                }
            }
        }
        if (!isIn){
            var obj = {
                pick: data.Picks,
                reason: [],
                trailer: data.Trailer
            }
            map[key].push(obj);
            map[key][map[key].length - 1].reason.push(data.Reasons.toLowerCase());
        }
    })
    .on('end', function(){
        if (callback && typeof(callback)) {
            callback(map);
        } else {
            self_map = map;
        }
    });
}

exports.hasKey = function(title) {
    var temp = generateKey(title);
    if (self_map[temp]){
        return true;
    }
    return false;
}

exports.returnPicks = function(title) {
    var temp = generateKey(title);
    return self_map[temp];
}


function reasonSort(a ,b) {
    var count = 0;
    return 0;
}