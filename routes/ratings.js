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

//SANDRINE
router.delete("/delete", (req, res) => {
  Rating.deleteOne({ _id: ratingId }).then(() => {
    res.json({ result: true });
    Rating.find().then((data) => {
      console.log(data);
    });
  });
});

//DELETE RATING SANDRINE

router.delete("/:ratingId", (req, res) => {
  const ratingId = req.params.ratingId;
  Rating.deleteOne({ _id: ratingId }).then(() => {
    Rating.findById(ratingId).then((data) => {
      if (data) {
        res.json({ result: false, message: "Rating not deleted ", data });
      } else {
        res.json({ result: true, message: "Delete success" });
      }
    });
  });
});

/*Trouver l'utilisateur grace au token,
recuper le _id de l'utilisateur
dans la collection rating faire un find avec l'utilisateur id comment filtre
puis faire un res.json de ma data dans le front*/
router.get("/:token", (req,res)=>{
  User.findOne({
    token: { $regex: new RegExp(req.params.token, "i") },
  }).then(data => {
    if (data) {
      res.json({ result: true, user: data });
    } else {
      res.json({ result: false, error: "User not found" });
    }
  });
})

router.delete("/:_id", (req,res)=>{
  Rating.findOne({
    _id:{$regex: new RegExp(req.params.token, "i")}
  }).then(data=>{
    if(data) {
      Rating.deleteMany()
    }
    else{
      res.json({ result: false,error })
    }
  })
})

module.exports = router;
