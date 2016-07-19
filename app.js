'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');

var port = process.env.port || 3000

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.render('index', {
        appToken: process.env.SMOOCH_APP_TOKEN
    });
});


module.exports = app;
