const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes/routes');

const app = express();

mongoose.connect('<mongodb data base>',
    { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Successfuly connected to MongoDB'))
    .catch(() => console.log('Connection to MongoDB failed'));

app.use(cors());

app.use(bodyParser.json());

app.use('/', routes);

app.use(express.static('public'))

module.exports = app;