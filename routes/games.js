var express = require("express");
var router = express.Router();
const fetch = require("node-fetch");
const Game = require("../models/games");
const User = require("../models/users");

const API_KEY = process.env.API_KEY;

router.post("/search", async (req, res) => {
  const { name } = req.body; // destructuration du req.body (champ de recherche)
  console.log(name);

  try {
    // Vérifie si le jeu est présent sur la base de données
    const existingGame = await Game.findOne({ name: { $regex: new RegExp(name, "i") } });
    if (existingGame) {
      return res.json({ result: false, error: "Game already saved" });
    }

    // Fetch d'une liste sommaire de jeu pour extraire un ID
    const response = await fetch(`https://api.rawg.io/api/games?key=9e87ce55f8d447b1892f3828fb9cce3e&search=Zel`);
    const data = await response.json();
    console.log(data);
    if (!data.results || data.results.length === 0) {
      return res.json({ result: false, error: "No games found" });
    }

    // Extract the ID of the first game (or whichever game you need)
    const gameID = data.results[0].id;
    console.log(gameID);

    // A l'aide de l'ID sauvé en constante, on peut exploiter les détails du jeu
    const gameResponse = await fetch(`https://api.rawg.io/api/games/${gameID}?key=9e87ce55f8d447b1892f3828fb9cce3e`);
    const gameData = await gameResponse.json();

    // Création du document dans la base de données
    const newGame = new Game({
      name: gameData.name,
      description: gameData.description,
    });

    // Sauvegarde dans la base de données
    const savedGame = await newGame.save();
    res.json({ result: true, game: savedGame });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, error: "Internal Server Error" });
  }
});

router.get("/", (req, res) => {
  City.find().then((data) => {
    res.json({ weather: data });
  });
});

router.get("/:cityName", (req, res) => {
  City.findOne({
    cityName: { $regex: new RegExp(req.params.cityName, "i") },
  }).then((data) => {
    if (data) {
      res.json({ result: true, weather: data });
    } else {
      res.json({ result: false, error: "City not found" });
    }
  });
});

router.delete("/:cityName", (req, res) => {
  City.deleteOne({
    cityName: { $regex: new RegExp(req.params.cityName, "i") },
  }).then((deletedDoc) => {
    if (deletedDoc.deletedCount > 0) {
      // document successfully deleted
      City.find().then((data) => {
        res.json({ result: true, weather: data });
      });
    } else {
      res.json({ result: false, error: "City not found" });
    }
  });
});

router.get("/", (req, res) => {
  fetch(`https://api.rawg.io/api/games?key=${API_KEY}`)
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        const formatedGame = {
          name: data.name,
          image: data.background_image,
        };
        res.json({ result: true, games: data.results });
      } else {
        res.json({ games: [] });
      }
    });
});

// Cette route servira à rajouter des jeux à notre wishlist
// A TERMINER!!!!!!! API???
router.post("/", (req, res) => {
  // Nous vérifions tout d'abord si le jeu existe ou non dans notre database
  Game.findOne({
    gameName: { $regex: new RegExp(req.body.gameName, "i") },
  }).then((MongoData) => {
    if (MongoData === null) {
      // Si le jeu n'est pas trouvé dans notre base de donnée, on va récupérer l'info grâce à une API
      fetch(`https://api.rawg.io/api/games?key=${API_KEY}`)
        .then((response) => response.json())
        // Attention à cette étape, nous stockons notre jeu sous forme d'objet correspondant
        // aux couples clés/valeurs de notre modèle "games"
        .then((data) => {
          const newGame = new Game({
            description: data.description,
            name: data.name,
            releasedDate: data.date,
            imageGame: data.image,
          });
          // Une fois notre objet récupérer, on le sauvegarde dans notre database
          newGame.save().then((newDoc) => {
            res.json({ result: true, game: newDoc });
          });
        });
    } else {
      res.json({ result: false, error: "Game already saved" });
    }
  });
});

// Route pour trouver les jeux en fonction de l'utilisateur (params = username)
// Nous allons devoir populate la wishlist (clé étrangère) dans la collection users
// Ensuite, cette route sera appelée dans notre composant Wishlist côté Front.
// A TERMINER !!!!

router.get("/game/:username/:", (req, res) => {
  // La première étape consiste à savoir si l'utilisateur existe bel et bien.
  User.findOne({ username: req.params.username }).then((user) => {
    if (user === null) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    // Game.find()
    // .populate('games', [''])
  });
});

// Route pour supprimer les jeux qui sont déjà présents dans notre wishlist (cf: wireframe)
router.delete("/wishlist", (req, res) => {
  Game.deleteOne({ name: Game.name }).then(() => {
    res.json({ result: true });
  });
});

module.exports = router;
