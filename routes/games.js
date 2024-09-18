var express = require("express");
var router = express.Router();
const fetch = require("node-fetch");
const moment = require("moment");
const Game = require("../models/games");

const API_KEY = process.env.API_KEY;

// NE PAS OUBLIER de renseigner sa clé RAWG API_KEY dans le fichier .env

router.get("/latestreleased", async (req, res) => {
  // Obtention de la date d'aujourd'hui au format correspondant à celui de l'API.
  const currentDate = moment().format("YYYY-MM-DD");
  // Obtention de la date d'il y a 45 jours.
  const oldDate = moment().subtract(45, "days").format("YYYY-MM-DD");
  // console.log("OLDDATE", oldDate);

  // Requête à l'API pour rechercher les derniers jeux sortis les 45 derniers jours
  //Le query parameter "metacritic" permet de filtrer les résultats les plus pertinents sur Metacritic
  const datedGames = await fetch(
    `https://api.rawg.io/api/games?key=${API_KEY}&dates=${oldDate},${currentDate}&megacritic=85,100&page_size=20`
  );

  const latestgames = await datedGames.json();
  console.log("LATESTGAMES", latestgames);

  // Extraction de la clé ID pour fetcher la route qui détaille les jeux
  const gameIDs = latestgames.results.map((game) => game.id); // plus besoin de la méthode slice, le fetch ne retient que dix jeux
  // console.log("GAMEIDS", gameIDs);

  const savedGames = []; // tableau vide composé en aval des résultats pertinents

  // Loop fait sur le tableau gameIDs à l'aide de chaque ID extrait les détails
  for (const gameID of gameIDs) {
    const gameDetailsResponse = await fetch(
      `https://api.rawg.io/api/games/${gameID}?key=${API_KEY}`
    );
    const game = await gameDetailsResponse.json();
    // Continue est un contrôleur de flux exclusif aux boucles for of, il permet d'ignorer l'élément souhaité dans l'itération. 
    // Ici, les jeux sans images ne feront pas parti de nos variables.
    if (!game.background_image) {
      continue;
    }

    // LA VRAIE DIFFICULTE
    const formattedGames = {
      name: game.name || "", //  comporateur logique "||" qui revient à OR donc game.name OR ""
      description: game.description || "",
      developer:
        // possibilité d'avoir plusieurs développeurs/éditeurs / Si présence d'au moins un, on récupère seulement le premier via l'index [O]
        game.developers && game.developers.length > 0
          ? game.developers[0].name
          : "",
      // même principe que developers
      publisher:
        game.publishers && game.publishers.length > 0
          ? game.publishers[0].name
          : "",
      releasedDate: game.released || "",
      // après avoir fait le tour du tableau, on obtient une string jointe avec tous les éléments
      platforms: game.platforms
        ? game.platforms.map((platform) => platform.platform.name).join(", ")
        : "",
      genre: game.genres
        ? game.genres.map((genre) => genre.name).join(", ") // même principe
        : "",
      // très perfectible, l'API contient plusieurs tags mais n'est pas correcte pour beaucoup de jeux
      isMultiplayer:
        // veut dire en Clean Code = // if (game.tags) {game.tags.some .......}
        // on cherche simplement un champ multiplayer sans être sensible à la casse
        game.tags && game.tags.some((tag) => tag.name.toLowerCase().includes("multiplayer")),
      isOnline:
        // pareil que pour isOnline
        game.tags && game.tags.some((tag) => tag.name.toLowerCase().includes("online")),
      // on explicite le booléen pour qu'il soit prêt à être importé selon le modèle dans la BDD dans une route POST
      isExpandedContent: game.additions ? true : false,
      // map parce que possibilité d'avoir plusieurs DLC / extensions donc plusieurs tableaux
      expandedContentList: game.additions ? game.additions.map((expandedContent) => ({
        description: expandedContent.description || "",
        name: expandedContent.name || "",
        releasedDate: expandedContent.released || "",
        ratingsID: [], // clé étrangère à définir lors d'un vote
        imageGame: expandedContent.background_image || "",
        ratingSummary: {
          averageRating: 0, // À calculer lors d'un vote
          numberOfRatings: 0, // À calculer lors d'un vote
        },
      }))
        : [],
      imageGame: game.background_image || "",
      ratingSummary: {
        averageRating: 0, // À calculer lors d'un vote
        numberOfRatings: 0, // À calculer lors d'un vote
      },
    };

    // on joint au tableau le jeu formaté (au sein de la boucle)
    savedGames.push(formattedGames);
  }

  //console.log(savedGames);

  res.json({ result: true, latestgames: savedGames });
});


router.get('/ratings', (req, res) => {

  const { name } = req.query
  console.log(name);
  Game.findOne({ name: name })
    .populate({ path: 'ratingsID', populate: { path: 'user' } })
    .then(data => {
      if (!data) {
        res.json({ result: false, erreur: "Game not found" });
      } else
        res.json({ result: true, data: data.ratingsID });
    });
});

router.post('/saveGame', (req, res) => {
  const gameData = req.body; // The game details should be sent in the request body

  // Create a new game document
  const newGame = new Game(gameData);
  console.log("new game found ", newGame)

  // Save the game document to the database
  newGame.save().then(() => {
    res.json({ message: 'Game details saved successfully' });
  })
});

// SECTION SEARCH

router.get("/search", async (req, res) => {
  // Extrait la requête de recherche à partir des paramètres d'URL
  const { name } = req.query;
  // console.log(name);

  // Requête pour rechercher une liste de jeux basée sur le nom
  const gameSearchResult = await fetch(
    `https://api.rawg.io/api/games?key=${API_KEY}&search=${name}&page_size=100`
  );
  // un console.log qui permet de voir les réponses de l'API
  //console.log("Response Headers:", gameSearchResult.headers.raw());

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
  // console.log(gameIDs);




  const savedGames = []; // tableau vide composé en aval des résultats pertinents

  // loop à l'aide de chaque ID extrait les détails
  for (const gameID of gameIDs) {
    const gameDetailsResponse = await fetch(
      `https://api.rawg.io/api/games/${gameID}?key=${API_KEY}`
    );
    const gameDetailsData = await gameDetailsResponse.json();
    // Continue est un contrôleur de flux exclusif aux boucles for of, il permet d'ignorer l'élément souhaité dans l'itération. 
    // Ici, les jeux sans images ne feront pas parti de nos variables.
    if (!gameDetailsData.background_image) {
      continue;
    }
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
      isExpandedContent: gameDetailsData.additions ? true : false, // on explicite le booléen pour qu'il soit prêt à être importé selon le modèle dans la BDD dans une route POST
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



// SECTION SUGGESTION 

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


  console.log(gameSearchData)

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
  const targetGameData = await gameDetailsResponse.json();

  // Fetch similar games based on genres, tags, developers, publishers, and platforms of the target game
  const { genres, tags, developers, publishers, platforms } = targetGameData;
  const genreSlugs = genres.map((genre) => genre.slug);
  const tagSlugs = tags.map((tag) => tag.slug);
  const developerIds = developers.map((developer) => developer.id);
  const publisherIds = publishers.map((publisher) => publisher.id);
  const platformIds = platforms.map((platform) => platform.platform.id);

  // Fetch similar games from different sources
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

  const uniqueGameIds = [];
  const uniqueGames = [];
  for (const game of allSimilarGames) {
    if (!uniqueGameIds.includes(game.id) && uniqueGameIds.length < 10) {
      uniqueGameIds.push(game.id);
      uniqueGames.push(game);
      if (!uniqueGameIds.background_image || !uniqueGames.background_image) {
        continue;
      }
    }
  }




  // Fetch detailed information for each unique game
  const detailedGames = [];
  for (const gameId of uniqueGameIds) {
    const gameDetailsResponse = await fetch(
      `https://api.rawg.io/api/games/${gameId}?key=${API_KEY}`
    );
    const gameDetails = await gameDetailsResponse.json();
    detailedGames.push(gameDetails);
  }


  // Format the suggestions
  const formattedSuggestions = detailedGames.map((game) => ({
    name: game.name,
    description: game.description_raw || game.description,
    developer:
      game.developers && game.developers.length > 0
        ? game.developers[0].name
        : "",
    publisher:
      game.publishers && game.publishers.length > 0
        ? game.publishers[0].name
        : "",
    releasedDate: game.released,
    platforms: game.platforms
      ? game.platforms.map((p) => p.platform.name).join(", ")
      : "",
    genre: game.genres ? game.genres.map((g) => g.name).join(", ") : "",
    isMultiplayer:
      game.tags &&
      game.tags.some((tag) => tag.name.toLowerCase().includes("multiplayer")),
    isOnline:
      game.tags &&
      game.tags.some((tag) => tag.name.toLowerCase().includes("online")),
    imageGame: game.background_image,
    ratingSummary: {
      averageRating: game.rating,
      numberOfRatings: game.ratings_count,
    },
  }));

  return res.json({ result: true, games: formattedSuggestions });
});

module.exports = router;