var express = require('express');
var router = express.Router();

const Game = require('../models/games')

router.delete('/wishlist', (req, res) => {

  Game.deleteOne({ name: Game.name }).then(() => {
    res.json({ result: true })
  });

});