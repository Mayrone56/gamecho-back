var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
// const hash = bcrypt.hashSync('password', 10);
// const uid2 = require('uid2');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
