'use strict';

const Script = require('smooch-bot').Script;
const _ = require('lodash');
const request = require('request');
const builder = require('botbuilder');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const movieProvider = require(path.join(__dirname, "libs", "movieProvider"));

const luis = require(path.join(__dirname, "libs", "luis"));
var movieMap;
movieProvider.createMap(path.join(__dirname,'moviemap.csv'));

const front = require(path.join(__dirname, "libs", "front"));

var app_token = "0kntojv4o8o48nq92p1w9g3by";

//user query params
var title, reason, genre, recs, num;

function stringTemplateGenerator(picks) {

    var ret_str = [];

    var StringGen = function(str, index) {
        this.string = str;
        this.index = index;
    }

    StringGen.prototype.splice = function(rem, str) {
        return this.string.slice(0, this.index) + str + this.string.slice(this.index + Math.abs(rem));
    };


    var strings = [[new StringGen("I found  for you! ", 8) , new StringGen("There's also ! :) ",13)],
                    [new StringGen("You should try ! ",15), new StringGen("I also found ! ",13)],
                    [new StringGen("I think you should give  a shot! ", 24), new StringGen("Also check out ! :) ", 15)]];


    for(var i = 0; i < picks.length; i++) {
        var ind = Math.floor(Math.random() * (3 - 0)) + 0;

        if (i % 2 == 0) {
            ret_str[i] = strings[ind][0].splice(0,picks[i].pick);
        }
        else if (i % 2 == 1) {
            ret_str[i] = strings[ind][1].splice(0, picks[i].pick);
        }

        if (picks[i].trailer != "") {
            ret_str[i] = ret_str[i] + `%[Show Trailer](${picks[i].trailer})`;
        }
    }

    return ret_str;
}

//To change keyword for reset, go to /node_modules/smooch-bot/lib/stateMachine.js

module.exports = new Script({
    processing: {
        prompt: (bot) => bot.say('Beep boop...'),
        receive: () => 'processing'
    },

    start: {
        receive: (bot) => {
          console.log('BEFORE0');
          console.log(bot.getProp('reason'));
          bot.setProp('reason', 'TEST1');
          console.log('AFTER1');
          console.log(bot.getProp('reason'));
          bot.setProp('reason', 'TEST2');
          console.log('AFTER2');
          console.log(bot.getProp('reason'));
            var prom = new Promise(function(resolve, reject){
                setTimeout(function(){
                    bot.say("Hi! And Chill here (www.andchill.io). I'll give you spot-on movie recs you'll love. You can tell me anything about your movie preferences. I'll understand you :)\n\nI'm new and improved, so whether you've used me before or are brand new, say 'GO' to start! **During beta, you'll get your movie recs within a few minutes!**");

                    resolve();
                }, 1500);
            });
            return prom.then(() => 'firstFlow');
        }
    },

    firstFlow: {
        receive: (bot) => {
            var messages = ["Great, let's do this! Start by giving me a movie you like and some reasons why.\n\nYou can also just tell me what you want in the movie that I'll be picking for you. A great match awaits!",
            "Be as quick or in depth as you want to be...\n\n'Fight Club for the twists and incredible acting'\n\n'I liked George Clooney's attitude in Ocean's 11'"];
            var p = Promise.resolve();
            // _.each(messages, function (mess) {
            //     p = p.then(function() {
            //         return bot.say(mess);
            //     });
            // });

            syncLoop(2, function(loop){
                var i = loop.iteration();
                p = p.then(() => {
                    setTimeout(function(){
                        bot.say(messages[i]).then(() => {
                            loop.next();
                        });
                    }, 1500);
                });
            });
            return p.then(() => 'webhook');
        }
    },
    wait : {
        receive: (bot, message) => {
            return setTimeout(() => {bot.say("Got it. About to jump into lightspeed! I'll have something for you to look at within the next few minutes!").then(() => 'webhook'); }, 2000);
        }
    },
    webhook : {
        receive: (bot, message) => {


            var p = new Promise(function(resolve, reject){

                var id = ((bot.userId == "testUserId") ? "c2d45bd00a85a52593f645e6" : bot.userId);
                //Getting the bot state variables
                var prom = new Promise(function(resolve, reject){
                    bot.getProp('title').then((ent_title) => {
                        title = ent_title;
                        bot.getProp('reason').then((res) => {
                            reason = res;
                            bot.getProp('genre').then((gen) => {
                                genre = gen;
                                bot.getProp('recs').then((rec) => {
                                    recs = ((rec !== undefined) ? JSON.parse(rec) : undefined);
                                    bot.getProp('num').then((n) => {
                                        num = n;
                                        resolve();
                                    });
                                });
                            });
                        });
                    });
                });

                request({
                    url: "https://api.smooch.io/v1/appusers/"+id,
                    method: "GET",
                    headers: {
                        "app-token": app_token
                    }
                }, function(err, res, body){
                    console.log(body);
                });

                //Parsing with LUIS
                prom.then(()=>{
                    luis.setLUISHandler(message.text).then(() => {
                        var intent = luis.getIntent();
                        console.log("INTENT: " + intent);
                        if (intent == 'Greeting'){
                            bot.say("Great, let's do this! Start by giving me a movie you like and some reasons why.\n\nYou can also just tell me what you want in the movie that I'll be picking for you. A great match awaits!").then(() => 'webhook');
                        } else if (intent == 'RejectRecommendation'){
                            //copy/paste the reject section below
                                    if (!num || num == 0){
                                        return Promise.resolve().then(() => 'webhook');
                                    } else if (num < recs.length && num < 4) {
                                        var it = (recs.length - num == 1 ? 1 : 2);
                                        syncLoop(it , function(loop){
                                            setTimeout(function(){
                                                var i = loop.iteration() + num;
                                                bot.say(recs[i]).then(() => {
                                                    loop.next();
                                                });
                                            }, 4500);
                                        }, function() {
                                            return bot.setProp('num', num + it).then(() => 'webhook');
                                        });
                                    } else if(num > 4){
                                        return Promise.resolve().then(() => 'webhook');
                                    } else if (num >= 4) {
                                        bot.setProp('num', num + 1);
                                        return bot.say("Hmmm...Watch some of the movies I recommended...they're really great! :)")
                                            .then(() => 'webhook');
                                    } else {
                                        console.log("Tagged rejected");
                                        bot.say("One sec. Let's see! :)").then(() =>{
                                            return front.tagConversationById(id, ["REJECTED"]).then(() => 'webhook');
                                        });
                                    }
                        } else if (intent == "BotOrHuman"){
                            //say something then back to webhook
                            var messages = ["I am human-esque.\n\nSome people call me bottish.","I'm like a bot that is growing up with human parents."]
                            syncLoop(2, function(loop){
                                var i = loop.iteration();
                                setTimeout(function(){
                                    bot.say(messages[i]).then(() => {
                                        loop.next();
                                    });
                                }, 2000);
                            });
                            return Promise.resolve().then(() => 'webhook');
                        } else if (intent == "NoTVShow"){
                            return bot.say("Hmmm, I haven't learned enough about TV shows to give you spot-on picks just yet. How about a movie you like and why? :)")
                                .then(() => 'webhook');
                        } else if (intent == "OutsideScope") {
                            return bot.say("Ah! I don’t answer that kind of question just yet! I’m learning more every day!")
                                .then(() => 'webhook');
                        } else if (intent == "NoNetflixOnly") {
                            return bot.say("Sorry, I can't do Netflix only movies right now...But I'm learning more every day!")
                                .then(() => 'webhook');
                        } else if (intent == "Success") {
                            if (!num || num == 0) {
                                return Promise.resolve().then(() => 'webhook');
                            } else {
                                return bot.say(":) Cool! I hope you enjoy your movies!. If you love your movie picks so far, like me on Facebook here :) www.facebook.com/textandchill. Or mention me in a tweet @TextAndChill !")
                                    .then(() => 'webhook');
                            }
                        } else if (intent == "None") {
                            return Promise.resolve().then(() => 'webhook')
                        } else{

                            if (intent == 'SetLikedMovieAndWhy') {
                                title = luis.getEntity('MovieTitle');
                                bot.setProp('title', title);
                                reason = luis.getEntity('MovieFeature');
                                bot.setProp('reason', reason);
                                genre = luis.getEntity('MovieGenre');
                                bot.setProp('genre', genre);
                            } else if (intent == 'MovieOnly') {
                                title = luis.getEntity('MovieTitle');
                                bot.setProp('title', title);
                            } else if (intent == 'ReasonOnly') {
                                reason = luis.getEntity('MovieFeature');
                                bot.setProp('reason', reason);
                            }
                            console.log("title is: " + title);
                            console.log("genre is: " + genre);
                            console.log("reason is: " + reason);
                            if ((title && reason) || (genre && reason) ) {
                                //Full form
                                //get the picks
                                //console.log("inside the full form");
                                var gotProm = new Promise((res, reject) => {
                                    setTimeout(function(){
                                        bot.say("Got it. About to jump into lightspeed! I'll have something for you to look at within the next few minutes!  ![](http://vignette3.wikia.nocookie.net/starwars/images/a/ae/Hyperspace_falcon.png/revision/latest?cb=20130312014242)");
                                        res();
                                    }, 2000);
                                });
                                gotProm.then(() => {
                                    console.log("line 240");
                                    if (movieProvider.hasKey(title)) {
                                        recs = stringTemplateGenerator(movieProvider.returnPicks(title));
                                        bot.setProp('recs', JSON.stringify(recs));
                                        console.log("recs are here");
                                        title = null;
                                        genre = null;
                                        reason = null;
                                        bot.setProp('title', null).then(() =>{
                                            bot.setProp('reason', null).then(() => {
                                                bot.setProp('genre', null);
                                            });
                                        });
                                            console.log("line 249");
                                            var x = 0;
                                            var rec_length = ((recs.length >= 2 )? 2 : recs.length);
                                            syncLoop(rec_length, function(loop) {
                                                setTimeout(function(){
                                                    var i = loop.iteration();
                                                    x++;
                                                    bot.say(recs[i]).then(() => {
                                                        loop.next();
                                                    });
                                                }, setTime(x));
                                            }, function(){
                                                num = rec_length;
                                                console.log("line 262");
                                                return bot.setProp('num',rec_length).then(() => 'webhook');
                                            });
                                    } else {
                                        console.log("Tagged in Front: " + id);
                                        return front.tagConversationById(id, ["READY"]).then(() => 'webhook');
                                    }
                                });
                                //bot.setProp('recs', JSON.stringify(recs));
                                //say first two recs
                            } else if (!title && !reason && genre) {
                                //Reason Only (genre only)
                                //ask for movie & reason
                                //say "Give me a movie and a reason" => webhook
                                bot.setProp('num', 0);
                                return bot.say("OK, what's a good movie like that and what do you like about it? Examples: Old School hilarious situations, Wolf of Wall Street for all the craziness.  (Make sure to name a movie!)").then(() => 'webhook');

                            } else if (title && !reason) {
                                //Movie Only
                                //ask for reason
                                //say "Give me a reason" => webhook;
                                bot.setProp('num',0);
                                return bot.say("OK, what did you like about it? Examples: darkness, cool vampires, shot beautifully, intensity, or anything else!  (Be more specific than things like 'sci-fi' or 'awesome')").then(() => 'webhook');
                            }
                        }
                    });
                });
            });
            return p.then(()=>'webhook');
        }
    },
    // hook : {
    //     receive: (bot, message) => {
    //         var p = new Promise(function (resolve, reject) {
    //             /* Testing outside library use */
    //             luis.setLUISHandler(message.text).then(function() {
    //                 /* SET UP SWITCH BLOCK FOR INTENTS */
    //                 var intent = luis.getIntent();
    //                 console.log("INTENT: "+ intent);
    //                 var id = (bot.userId == "testUserId" ? "0fc0c628e0d5ff6b125fb073" : bot.userId);

    //                 // // PROTOTYPE CODE.
    //                 // // if (title) {
    //                 //     return front.tagConversationById(id, ["Ready"]).then(function(result){
    //                 //         console.log(result);
    //                 //         front.commentOnConversation(id, "Testing this thing.");
    //                 //     },function(err){
    //                 //         console.log(err);
    //                 //     });
    //                 // //}



    //                 //TODO: set up a bot state to remember recent movie choice.


    //                 //CODE THAT SHOULD WORK BUT DOENT Below
    //                 if (intent == "RejectRecommendation") {
    //                     var reclist;
    //                     bot.getProp('recs').then((recs) => {
    //                         var prom = new Promise((resolve, reject) => {
    //                             reclist = JSON.parse(recs);
    //                             if (reclist != undefined) {

    //                                 resolve(reclist);
    //                             } else {
    //                                 console.log("didnt work");
    //                                 reject();
    //                             }
    //                         });
    //                         return prom.then((recs) => {
    //                             bot.getProp('num').then((num) => {

    //                                 if (num < recs.length) {
    //                                     var it = (recs.length - num == 1 ? 1 : 2);
    //                                     syncLoop(it , function(loop){
    //                                         setTimeout(function(){
    //                                             var i = loop.iteration() + num;
    //                                             bot.say(recs[i]).then(() => {
    //                                                 loop.next();
    //                                             });
    //                                         }, 3000);
    //                                     }, function() {
    //                                         bot.setProp('num', num + it);
    //                                     });
    //                                     // for (var j = num; j < recs.length && j < num + 2; j++) {
    //                                     //     bot.say(recs[j]).then(() =>{
    //                                     //         bot.setProp('num', j + 1);
    //                                     //     });
    //                                     // }
    //                                 } else {
    //                                     console.log("Tagged rejected");
    //                                     return front.tagConversationById(id, ["REJECTED"]);
    //                                 }
    //                             });

    //                         });
    //                     });

    //                 } else if (intent == "SetLikedMovieAndWhy") {

    //                     //TODO: reorder the promise so that it checks for all the necessary information before sending this message.
    //                     var gotProm = new Promise((res, reject) => {
    //                         setTimeout(function(){
    //                             bot.say("Got it. About to jump into lightspeed! I'll have something for you to look at within the next few minutes!  ![](http://vignette3.wikia.nocookie.net/starwars/images/a/ae/Hyperspace_falcon.png/revision/latest?cb=20130312014242)");
    //                             res();
    //                         }, 2000);
    //                     });
    //                     gotProm.then(() => {
    //                         var title = luis.getEntity('MovieTitle');
    //                         var reason = luis.getEntity('MovieFeature');
    //                         var genre = luis.getEntity('MovieGenre');


    //                         if (title == null) {
    //                                 return front.tagConversationById(id, ["Ready"]);
    //                         } else {
    //                             title = movieProvider.generateKey(title);
    //                             if (movieMap[title]) {
    //                                 var prom = Promise.resolve();
    //                                 var  recs = stringTemplateGenerator(movieMap[title]);
    //                                 var rec_str = JSON.stringify(recs);
    //                                 console.log();
    //                                 bot.setProp('recs', rec_str);
    //                                 // _.each(stringTemplateGenerator(movieMap[title]), function (mess) {
    //                                 //     prom = prom.then(function() {
    //                                 //         return bot.say(mess);
    //                                 //     });
    //                                 // });


    //                                 var x = 0;
    //                                 syncLoop(2, function(loop) {
    //                                     setTimeout(function(){
    //                                         var i = loop.iteration();
    //                                         x++;
    //                                         bot.say(recs[i]).then(() => {
    //                                             loop.next();
    //                                         });
    //                                     }, setTime(x));
    //                                 }, function(){
    //                                     bot.setProp('num',2);
    //                                 });

    //                                 // for(var i = 0; i < recs.length && i < 2; i++) {
    //                                 //     // bot.say(recs[i]).then(() => {
    //                                 //     //     return bot.setProp('num', i + 1);
    //                                 //     // });
    //                                 // }

    //                             } else {
    //                                 return front.tagConversationById(id, ["Ready"]);
    //                             }
    //                         }
    //                     });

    //                 } else {
    //                     return front.tagConversationById(id, ["Ready"]);
    //                 }
    //                 resolve();
    //             });
    //         });

    //         return p.then(() => 'hook');
    //     }
    // },
    stop: {
        receive: (bot, message) => {
            return Promise.resolve().then(() => 'stop');
        }
    },
    finish: {
            receive: (bot, message) => {
                return Promise.resolve().then(() => 'start');
            }
        }
    //     askName: {
    //         prompt: (bot) => bot.say('What\'s your name?'),
    //         receive: (bot, message) => {
    //             const name = message.text;
    //             return bot.setProp('name', name)
    //                 .then(() => bot.say(`Great! I'll call you ${name}
    // Is that OK? %[Yes](postback:yes) %[No](postback:no)`))
    //                 .then(() => 'finish');
    //         }
    //     },

    //     finish: {
    //         receive: (bot, message) => {
    //             return bot.getProp('name')
    //                 .then((name) => bot.say(`Sorry ${name}, my creator didn't ` +
    //                         'teach me how to do anything else!'))
    //                 .then(() => 'finish');
    //         }
    //     }
});

function syncLoop(iterations, process, exit){
    var index = 0,
        done = false,
        shouldExit = false;
    var loop = {
        next:function(){
            if(done){
                if(shouldExit && exit){
                    return exit(); // Exit if we're done
                }
            }
            // If we're not finished
            if(index < iterations){
                index++; // Increment our index
                process(loop); // Run our process, pass in the loop
            // Otherwise we're done
            } else {
                done = true; // Make sure we say we're done
                if(exit) exit(); // Call the callback on exit
            }
        },
        iteration:function(){
            return index - 1; // Return the loop number we're on
        },
        break:function(end){
            done = true; // End the loop
            shouldExit = end; // Passing end as true means we still call the exit callback
        }
    };
    loop.next();
    return loop;
}

function setTime(ind) {
    if (ind == 0) {
        return 10000;
    } else if (ind == 1) {
        return 3000;
    } else {
        return 3000;
    }
}

function resetProps() {

    return prom;
}
