const express = require("express");
const router = express.Router();
const Game = require("../models/games");
const Rating = require("../models/ratings");
const User = require("../models/users");

router.post("/save", async (req, res) => {
  const { username, gameName, rating, ratingMode, comment, ratingDate, gameDetails } = req.body;// IMPORTANT req.body du reducer gameDetails contenant toutes les données formatées du jeu

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

    console.log("New game created:", game);
  }

  // Création du vote avec l'hypothèse que les champs correspondent aux noms des valeurs renseignées côté frontend
  const newRating = await new Rating({
    user: user._id, // le lien avec les IDs respectifs se fait ici pour assurer l'uniformisation des données / éviter les doublons
    game: game._id, // même chose
    rating,
    ratingMode,
    comment,
    ratingDate,
  });
  console.log("New rating created:", newRating);

  await newRating.save(); // ne pas oublier la sauvegarde du rating sinon il sera juste référencé dans game !

  // On push le vote de l'utilisateur dans le champ ratingsID qui lie le jeu à tous ses votes
  game.ratingsID.push(newRating._id); // noter l'appel de la clé
  // Confirmation avec les infos du jeu
  console.log("Game ratings updated:", game);

  // Sauvegarde du jeu
  await game.save();

  // Message de confirmation
  console.log("Rating saved successfully");
  res.json({ success: true, rating: newRating });
});

router.delete("/delete", (req, res) => {
  Rating.deleteOne({ _id: ratingId }).then(() => {
    res.json({ result: true });
    Rating.find().then(data => {
      console.log(data);
    });
  });
});


//DELETE EN COURS SANDRINE

router.delete('/:ratingId', (req, res) => {
  const ratingId = req.params.ratingId;
  
  Rating.findById(ratingId)
    .then(data => {
      if (data) {
        res.json({ result: true, message: 'Rating deleted ', data });
      } else {
        res.json({ result: false, message: 'Rating not found' });
      }
    })
});

module.exports = router;