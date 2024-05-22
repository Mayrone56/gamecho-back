var express = require('express');
var router = express.Router();

const Game = require('../models/games')
const User = require('../models/users')

const API_KEY = process.env.API_KEY;

// Cette route servira à rajouter des jeux à notre wishlist
// A TERMINER!!!!!!! API???
router.post('/', (req, res) => {
  // Nous vérifions tout d'abord si le jeu existe ou non dans notre database
  Game.findOne({ gameName: { $regex: new RegExp(req.body.gameName, 'i') } }).then(MongoData => {
    if (MongoData === null) {
      // Si le jeu n'est pas trouvé dans notre base de donnée, on va récupérer l'info grâce à une API
      fetch(`https://api.rawg.io/api/games?key=${API_KEY}`)
        .then(response => response.json())
        // Attention à cette étape, nous stockons notre jeu sous forme d'objet correspondant
        // aux couples clés/valeurs de notre modèle "games"
        .then(data => {
          const newGame = new Game({
            description: data.description,
            name: data.name,
            releasedDate: data.date,
            imageGame: data.image,
          });
          // Une fois notre objet récupérer, on le sauvegarde dans notre database
          newGame.save().then(newDoc => {
            res.json({ result: true, game: newDoc })
          });
        });
    } else {
      res.json({ result: false, error: "Game already saved" })
    }
  });
});

// Route pour trouver les jeux en fonction de l'utilisateur (params = username)
// Nous allons devoir populate la wishlist (clé étrangère) dans la collection users
// Ensuite, cette route sera appelée dans notre composant Wishlist côté Front.
// A TERMINER !!!!

router.get('/game/:username/:', (req, res) => {
  // La première étape consiste à savoir si l'utilisateur existe bel et bien.
  User.findOne({ username: req.params.username }).then(user => {
    if (user === null) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    // Game.find()
    // .populate('games', [''])
  })
})

// Route pour supprimer les jeux qui sont déjà présents dans notre wishlist (cf: wireframe)
router.delete('/wishlist', (req, res) => {

  Game.deleteOne({ name: Game.name }).then(() => {
    res.json({ result: true })
  });
});

module.exports = router;