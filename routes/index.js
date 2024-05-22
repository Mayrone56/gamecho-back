var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('password', 10);
const uid2 = require('uid2');

const API_KEY = process.env.API_KEY;
//console.log(API_KEY);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
