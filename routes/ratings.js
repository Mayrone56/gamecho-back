const express = require("express");
const router = express.Router();
const Game = require("../models/games");
const Rating = require("../models/ratings");
const User = require("../models/users");

router.post("/save", async (req, res) => {
  const { // destructuration
    username,
    gameName,
    rating,
    ratingMode,
    comment,
    ratingDate,
    gameDetails,
    // category, A mettre en place à terme ? Le critère personnel de l'utilisateur
  } = req.body; // IMPORTANT req.body du reducer gameDetails contenant toutes les données formatées du jeu

  // hypothèse d'extraction de tous les champs nécessaires pour le vote

  // On ne peut pas à ma connaissance extraire l'ID de l'user ou du game depuis le front, on fera la correspondance grâce aux noms / A terme : possible ?

  // au sujet des autres champs, ils sont nécessaires et renseignés en amont dans le front (paramétrer la modal en conséquence)

  // L'utilisateur a-t-il un compte enregistré sur la BDD ?
  const user = await User.findOne({ username }); // on devrait utiliser la méthode findById propre à Mongoose pour lier les clés étrangères mais comment l'extraire du front ? Ou la trouver avec l'username ?
  if (!user) {
    // si l'utilisateur n'est pas trouvé, le code arrête son execution au return
    console.log("User not found");
    return res.json({ success: false, message: "User not found" });
  }

  // Le jeu est-il déjà enregistré sur la BDD ? On utilise la clé name (à terme ça devrait être l'ID extrait ?)
  let game = await Game.findOne({ name: gameName });

  // S'il n'existe pas, on va créer un nouveau document dans la collection games
  if (!game) {
    game = new Game({ ...gameDetails, ratingsID: [] }); // gameDetails suffit à renseigner tous les champs puisqu'ils ont été formatés en amont dans les routes games
    // utilisation du spread operator ... pour être sûr que tous les champs du tableau soient renvoyés
    // génération automatique d'un ID qu'on a pas besoin de renseigner à la création d'un nouveau document
    // le champ _id sera cependant nécessaire pour lier le vote au jeu nouvellement créé

    console.log("New game created !", game);
  }
  // étape supplémentaire ajoutée le 29 mai 2024
  //
  const previousRating = await Rating.findOne({
    user: user._id,
    game: game._id,
  }); // on cherche un rating lié à un utilisateur ET le jeu noté

  let newRating; // on déclare la variable en let pour lui assigner une valeur dans la condition => permet l'exploitation de la valeur en dehors du scope (de l'échelle ?) de la condition

  if (previousRating) {
    // si l'utilateur a voté, on met à jour toutes les valeurs de ce vote avec les données du req.body
    previousRating.rating = rating; // le previousRating cible le vote trouvé dans la BDD
    previousRating.ratingMode = ratingMode;
    previousRating.comment = comment;
    previousRating.ratingDate = ratingDate;
    await previousRating.save();
    console.log("Rating updated !", previousRating);
  } else {
    // sinon, création d'un nouveau rating avec les données récupérées

    // Création du vote avec l'hypothèse que les champs correspondent aux noms des valeurs renseignées côté frontend
    newRating = await new Rating({
      user: user._id, // le lien avec les IDs respectifs se fait ici pour assurer l'uniformisation des données / éviter les doublons
      game: game._id, // même chose
      rating,
      ratingMode,
      comment,
      ratingDate,
    });
    console.log("New rating created !", newRating);

    await newRating.save(); // ne pas oublier la sauvegarde du rating sinon il sera juste référencé dans game !

    // On push le vote de l'utilisateur dans le champ ratingsID qui lie le jeu à tous ses votes
    game.ratingsID.push(newRating._id); // noter l'appel de la clé
    // Confirmation avec les infos du jeu
    console.log("Game ratings updated !", game);

    // Sauvegarde du jeu
    await game.save();

    // étape supplémentaire ajoutée le 29 mai 2024
    //pour mettre à jour la clé ratings de la collections users ! Désormais les trois collections de la BDD sont liées
    user.ratings.push(newRating._id); // même procédure que pour la sauvegarde de l'ID du rating dans la collection jeu : on pousse dans un tableau l'élément
    await user.save();
    console.log("User ratings updated !", user);
    return newRating;
  }
  // Message de confirmation
  console.log("Rating saved successfully");
  res.json({ success: true, rating: newRating || previousRating }); // || = "ou", selon l'existence préalable d'un vote, la réponse renvoie les données d'un nouveau vote OU celles d'une MàJ d'un vote déjà enregistré
});



///////////////////

//DELETE RATING SANDRINE
//CONSEIL RAIDA step by step
//Etape 1 prendre dans les params token du user et le nom du jeu correspondant au vote
//Etape 2 Trouver le user a qui appartient le token et recuperer son ID
//Etape 3 Trouve le rating qui contient le nom du jeu et qui match avec le user ID recup en etape 2
//Etape 4 on supprime une fois trouvé
//3 et 4 va se faire avec deleteOne
//La value de retour avec deleOne ya un champs deletedcount qui est le compteur du document qui a été supprimé
//C'est la qu'on peut dire que ça a bien été supprimé 

//On a delete en bdd sur les hackatweet, weather app, locapic

//ETAPE 1 - Mettre les params token et name nom du jeu dans la route delete afin de se baser sur ces deux params de recherche 

router.delete('/:token/:name', (req, res) => {
  //ETAPE 2 - Trouver le user à qui appartient le token car il ne faut pas tranferer les id en front, que ce soit pour le user ou n'importe quoi d'autre

  User.findOne({ token: req.params.token }).then(user => { //On cherche dans User qui est le nom du schema le token
    //Si le user n'existe pas on renvoie une rreur et on arrete le code avec return
    if (user === null) {
      res.json({ result: false, error: 'User not found' });
      return;
    } else {

      Game.findOne({ name: req.params.name }).then(game => {
        if (game === null) {
          res.json({ result: false, error: "Game not found" });
          return;
        } else {
          //console.log("USER + GAME ", user._id, game._id)
          //Se base sur les id de user et game

          //ETAPE 3
          Rating.deleteOne({ user: user._id, game: game._id })
            .then(deleteRating => {
              console.log("DELETERATING ", deleteRating)
              if (deleteRating.deletedCount > 0) {
                res.json({ result: true })
                return;
              }
              else {
                res.json({ result: false, error: "Rating" });
              }
            });
        }
      })
    }
  })
});

module.exports = router;
