var express = require("express");
var router = express.Router();
const fetch = require("node-fetch");
const Game = require("../models/games");
const User = require("../models/users");

const API_KEY = process.env.API_KEY;

// const moby_key = "moby_IflJKWa2Gpp3OGqFDaxD2018NKt"

// NE PAS OUBLIER de renseigner sa clé RAWG API_KEY dans le fichier .env


router.get("/search", async (req, res) => {
  // Extrait la requête de recherche à partir des paramètres d'URL
  const { name } = req.query;
  console.log(name);

  // Requête pour rechercher une liste de jeux basée sur le nom
  const gameSearchResult = await fetch(
    `https://api.rawg.io/api/games?key=${API_KEY}&search=${name}&page_size=100`
  );
  // Voir page size 


  const searchData = await gameSearchResult.json();
  console.log(searchData.results.length)
  // Vérifie s'il y a des résultats de recherche
  if (!searchData.results || searchData.results.length === 0) {
    return res.json({ result: false, error: "Aucun jeu trouvé" });
  }
  // Filtrer les résultats pour ne conserver que ceux dont le nom contient la chaîne de recherche
  const filteredResults = searchData.results.filter((game) =>
    game.name.toLowerCase().includes(name.toLowerCase()) // sans cette fonction, les jeux donnés en réponse n'étaient pas pertinent
  );
  // Filtrer les résultats pour exclure les jeux amateurs (avec un nombre minimal de critiques ?)
  // const filteredByPopularity = filteredResults.filter((game) => game.reviews_count > 100); // exclut les jeux avec moins de 100 critiques

  // Vérifie s'il y a des résultats filtrés
  if (!searchData.results || searchData.results.length === 0) {
    return res.json({ result: false, error: "Aucun jeu trouvé avec le nom spécifié" });
  }
  // Extraction de la clé ID pour fetcher la route qui détaille les jeux
  const gameIDs = searchData.results.slice(0, 10).map((game) => game.id); // pour une recherche, on limite à 10 jeux pour l'instant à modifier si bouton +
  console.log(gameIDs);

  const savedGames = []; // tableau vide composé en aval des résultats pertinents

  // Loop through each game ID and fetch its details
  for (const gameID of gameIDs) {
    const gameDetailsResponse = await fetch(
      `https://api.rawg.io/api/games/${gameID}?key=${API_KEY}`
    );
    const gameDetailsData = await gameDetailsResponse.json();

    // Formatage des données pour chaque jeu // si la clé n'existe pas, on la remplace par une string vide
    const formattedGame = { // LA VRAIE DIFFICULTE
      name: gameDetailsData.name || "",
      description: gameDetailsData.description || "",
      developer:
        gameDetailsData.developers && gameDetailsData.developers.length > 0
          ? gameDetailsData.developers[0].name // possibilité d'avoir plusieurs développeurs/éditeurs / Si présence d'au moins un, on récupère seulement le premier
          : "",
      publisher:
        gameDetailsData.publishers && gameDetailsData.publishers.length > 0
          ? gameDetailsData.publishers[0].name
          : "",
      releasedDate: gameDetailsData.released || "",
      platforms: gameDetailsData.platforms
        ? gameDetailsData.platforms
          .map((platform) => platform.platform.name)
          .join(", ") // après avoir fait le tour du tableau, on obtient une string jointe avec tous les éléments
        : "",
      genre: gameDetailsData.genres
        ? gameDetailsData.genres.map((genre) => genre.name).join(", ") // même principe
        : "",
      isMultiplayer: // très perfectible, l'API contient plusieurs tags mais n'est pas correcte pour beaucoup de jeux
        gameDetailsData.tags &&
        gameDetailsData.tags.some((tag) =>
          tag.name.toLowerCase().includes("multiplayer") // on cherche simplement un champ multiplayer sans être sensible à la casse
        ),
      isOnline: // pareil que pour isMultiplayer
        gameDetailsData.tags &&
        gameDetailsData.tags.some((tag) =>
          tag.name.toLowerCase().includes("online")
        ),
      isExpandedContent:
        gameDetailsData.additions && gameDetailsData.additions.length > 0, // si présence d'au moins une extension, condition
      expandedContentList: gameDetailsData.additions
        ? gameDetailsData.additions.map((expandedContent) => ({
          description: expandedContent.description || "",
          name: expandedContent.name || "",
          releasedDate: expandedContent.released || "",
          ratingsID: [], // À remplir séparément via les updates (lors d'un vote)
          imageGame: expandedContent.background_image || "",
          ratingSummary: {
            averageRating: 0, // À calculer lors d'un vote
            numberOfRatings: 0, // À calculer lors d'un vote
          },
        }))
        : [],
      imageGame: gameDetailsData.background_image || "",
      ratingSummary: {
        averageRating: 0, // À calculer lors d'un vote
        numberOfRatings: 0, // À calculer lors d'un vote
      },
    };

    // Ajoute les détails du jeu à la liste des jeux sauvegardés
    savedGames.push(formattedGame);
  }

  // Retourne les jeux formatés en tant que réponse
  return res.json({ result: true, games: savedGames });
});




router.post("/search", async (req, res) => {
  const { name } = req.body; // destructuring the req.body (search field)
  console.log(name);

  // vérifie la présence du jeu dans la BDD
  const alreadySavedGame = await Game.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
  if (alreadySavedGame) {
    return res.json({ result: false, error: "Game already saved" });
  }

  // fetch d'une liste de jeu selon le req.body
  const gameSearchResult = await fetch(
    `https://api.rawg.io/api/games?key=${API_KEY}&search=${name}`
  );
  const searchData = await gameSearchResult.json();
  console.log(searchData);

  // vérifie si un résultat s'affiche
  if (!searchData.results || searchData.results.length === 0) {
    return res.json({ result: false, error: "No game found" });
  }

  // Extract the IDs of the first 10 games from the search results
  const gameIds = searchData.results.slice(0, 10).map((game) => game.id);
  console.log(gameIds);

  const savedGames = [];

  // Loop through each game ID and fetch its details
  for (const gameId of gameIds) {
    const gameDetails = await fetch(
      `https://api.rawg.io/api/games/${gameId}?key=${API_KEY}` // pour essayer Wind Waker = 56092
    );
    const newGameData = await gameDetails.json();

    // Determine if the game has multiplayer or online features
    const isMultiplayer =
      newGameData.tags &&
      newGameData.tags.some((tag) =>
        tag.name.toLowerCase().includes("multiplayer")
      );
    const isOnline =
      newGameData.tags &&
      newGameData.tags.some((tag) => tag.name.toLowerCase().includes("online"));

    // Create a new game document in the database
    const newGame = new Game({
      name: newGameData.name || "",
      description: newGameData.description || "",
      developer: newGameData.developers ? newGameData.developers[0].name : "",
      publisher: newGameData.publishers ? newGameData.publishers[0].name : "",
      releasedDate: newGameData.released || "",
      platforms: newGameData.platforms
        ? newGameData.platforms
          .map((platform) => platform.platform.name)
          .join(", ")
        : "",
      genre: newGameData.genres
        ? newGameData.genres.map((genre) => genre.name).join(", ")
        : "",
      isMultiplayer: isMultiplayer,
      isOnline: isOnline,
      isExpandedContent:
        newGameData.additions && newGameData.additions.length > 1,

      expandedContentList: newGameData.additions
        ? newGameData.additions.map((expandedContent) => ({
          description: expandedContent.description || "",
          name: expandedContent.name || "",
          releasedDate: expandedContent.released || "",
          ratingsID: [], // Need to be populated separately
          imageGame: expandedContent.background_image || "",
          ratingSummary: {
            averageRating: 0, // Need to be calculated
            numberOfRatings: 0, // Need to be calculated
          },
        }))
        : [],
      imageGame: newGameData.background_image || "",
      ratingSummary: {
        averageRating: 0, // Need to be calculated
        numberOfRatings: 0, // Need to be calculated
      },
    });

    // Save the new game to the database
    const savedGame = await newGame.save();
    savedGames.push(savedGame);
  }

  return res.json({ result: true, games: savedGames });
});

router.get("/latestrelease", async (req, res) => {

  // Requête à l'API pour rechercher les derniers jeux sortis en filtrant la date
  const datedGames = await fetch(`https://api.rawg.io/api/games?key=${API_KEY}?dates`);

  const latestgames = await datedGames.json();
  console.log(latestgames.length)
  // const date = moment().format("YYYY-MM-DD");

  const today = new Date();
  console.log(today);



  // format() {
  //   var options = {year: 'numeric', month: 'numeric', day: 'numeric'}
  //   return new Date().toLocaleDateString([], options);
  // };

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
