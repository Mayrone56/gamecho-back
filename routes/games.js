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

  // REQUÊTE DE LA LISTE PRINCIPALE

  const gameSearchResult = await fetch(
    `https://api.rawg.io/api/games?key=${API_KEY}&search=${name}&page_size=100`
  );
  // Voir page size

  const searchData = await gameSearchResult.json();
  console.log(searchData.results.length);
  // Vérifie s'il y a des résultats de recherche
  if (!searchData.results || searchData.results.length === 0) {
    console.log(result, error); // console.log AVANT le return
    return res.json({ result: false, error: "Aucun jeu trouvé" });
  }
  // Filtrer les résultats pour ne conserver que ceux dont le nom contient la chaîne de recherche
  const filteredResults = searchData.results.filter(
    (game) => game.name.toLowerCase().includes(name.toLowerCase()) // sans cette fonction, les jeux donnés en réponse n'étaient pas pertinent
  );
  // Filtrer les résultats pour exclure les jeux amateurs (avec un nombre minimal de critiques ?)
  // const filteredByPopularity = filteredResults.filter((game) => game.reviews_count > 100); // exclut les jeux avec moins de 100 critiques

  // Vérifie s'il y a des résultats filtrés
  if (!searchData.results || searchData.results.length === 0) {
    return res.json({
      result: false,
      error: "Aucun jeu trouvé avec le nom spécifié",
    });
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
    const formattedGame = {
      // LA VRAIE DIFFICULTE
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
      // très perfectible, l'API contient plusieurs tags mais n'est pas correcte pour beaucoup de jeux
      isMultiplayer:
        gameDetailsData.tags &&
        gameDetailsData.tags.some(
          (tag) => tag.name.toLowerCase().includes("multiplayer") // on cherche simplement un champ multiplayer sans être sensible à la casse
        ),
      // pareil que pour isMultiplayer
      isOnline:
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
    }; // FIN DE LA VARIABLE FORMATTEDGAME

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

// router.get("/:cityName", (req, res) => {
//   City.findOne({
//     cityName: { $regex: new RegExp(req.params.cityName, "i") },
//   }).then((data) => {
//     if (data) {
//       res.json({ result: true, weather: data });
//     } else {
//       res.json({ result: false, error: "City not found" });
//     }
//   });
// });

// router.delete("/:cityName", (req, res) => {
//   City.deleteOne({
//     cityName: { $regex: new RegExp(req.params.cityName, "i") },
//   }).then((deletedDoc) => {
//     if (deletedDoc.deletedCount > 0) {
//       // document successfully deleted
//       City.find().then((data) => {
//         res.json({ result: true, weather: data });
//       });
//     } else {
//       res.json({ result: false, error: "City not found" });
//     }
//   });
// });

router.get("/", async (req, res) => {
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

router.get("/suggestions", async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.json({ result: false, error: "Game name is required" });
  }

  // Perform a flexible search to find the most relevant game
  const gameSearchResponse = await fetch(
    `https://api.rawg.io/api/games?key=${API_KEY}&search=${name}&search_precise=true&page_size=10`
  );
  const gameSearchData = await gameSearchResponse.json();

  if (!gameSearchData.results || gameSearchData.results.length === 0) {
    return res.json({
      result: false,
      error: "No game found with the specified name",
    });
  }

  // Take the first relevant game found
  const targetGame = gameSearchData.results[0];
  const targetGameId = targetGame.id;

  // Fetch details of the target game
  const gameDetailsResponse = await fetch(
    `https://api.rawg.io/api/games/${targetGameId}?key=${API_KEY}`
  );
  const gameDetailsData = await gameDetailsResponse.json();

  const { genres, tags, developers, publishers, platforms } = gameDetailsData;
  const genreSlugs = genres.map((genre) => genre.slug);
  const tagSlugs = tags.map((tag) => tag.slug);
  const developerIds = developers.map((developer) => developer.id);
  const publisherIds = publishers.map((publisher) => publisher.id);
  const platformIds = platforms.map((platform) => platform.platform.id);

  // Fetch similar games based on genres, tags, developers, publishers, and platforms of the target game
  const fetchGames = async (url) => {
    const response = await fetch(url);
    const data = await response.json();
    return data.results;
  };

  const similarByGenreUrl = `https://api.rawg.io/api/games?key=${API_KEY}&genres=${genreSlugs.join(
    ","
  )}&ordering=-rating&page_size=100`;
  const similarByTagsUrl = `https://api.rawg.io/api/games?key=${API_KEY}&tags=${tagSlugs.join(
    ","
  )}&ordering=-rating&page_size=100`;
  const similarByDeveloperUrl = `https://api.rawg.io/api/games?key=${API_KEY}&developers=${developerIds.join(
    ","
  )}&ordering=-rating&page_size=100`;
  const similarByPublisherUrl = `https://api.rawg.io/api/games?key=${API_KEY}&publishers=${publisherIds.join(
    ","
  )}&ordering=-rating&page_size=100`;
  const similarByPlatformUrl = `https://api.rawg.io/api/games?key=${API_KEY}&platforms=${platformIds.join(
    ","
  )}&ordering=-rating&page_size=100`;

  const similarByGenre = await fetchGames(similarByGenreUrl);
  const similarByTags = await fetchGames(similarByTagsUrl);
  const similarByDeveloper = await fetchGames(similarByDeveloperUrl);
  const similarByPublisher = await fetchGames(similarByPublisherUrl);
  const similarByPlatform = await fetchGames(similarByPlatformUrl);

  // Combine similar games from all sources
  const allSimilarGames = [
    ...similarByGenre,
    ...similarByTags,
    ...similarByDeveloper,
    ...similarByPublisher,
    ...similarByPlatform,
  ];

  // Remove duplicates and limit to 10 unique games
  const uniqueGames = Array.from(new Set(allSimilarGames.map((game) => game.id)))
    .map((id) => {
      return allSimilarGames.find((game) => game.id === id);
    })
    .slice(0, 10);

  // Format the suggestions
  const formattedSuggestions = uniqueGames.map((game) => ({
    name: game.name,
    description: game.description_raw || game.description,
    developer: game.developers && game.developers.length > 0 ? game.developers[0].name : "",
    publisher: game.publishers && game.publishers.length > 0 ? game.publishers[0].name : "",
    releasedDate: game.released,
    platforms: game.platforms ? game.platforms.map((p) => p.platform.name).join(", ") : "",
    genre: game.genres ? game.genres.map((g) => g.name).join(", ") : "",
    isMultiplayer: game.tags && game.tags.some((tag) => tag.name.toLowerCase().includes("multiplayer")),
    isOnline: game.tags && game.tags.some((tag) => tag.name.toLowerCase().includes("online")),
    imageGame: game.background_image,
    ratingSummary: {
      averageRating: game.rating,
      numberOfRatings: game.ratings_count,
    },
  }));

  return res.json({ result: true, games: formattedSuggestions });
});

module.exports = router;
