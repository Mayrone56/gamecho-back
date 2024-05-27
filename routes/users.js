var express = require("express");
var router = express.Router();
require("../models/connection");

const User = require("../models/users");

const { checkBody } = require("../modules/checkBody");
const bcrypt = require("bcrypt");
const uid2 = require("uid2");

// Nous vérifions ici que tous les champs soient bien remplis afin que l'inscription utilisateur soit possible.
router.post("/signup", (req, res) => {
  if (!checkBody(req.body, ["username", "email", "password"])) {
    res.json({ result: "false", error: "Missing or empty fields" });
    return; // ajout d'un return à CHAQUE réponse pour empêcher réponses multiples
  }

  // Comparaison du mot de passe écrit par l'utilisateur et sa confirmation

  if (req.body.password !== req.body.confirmPassword) {
    res.json({ result: false, error: "Passwords do not match" });
    return; // ajout d'un return à CHAQUE réponse pour empêcher réponses multiples
  }
  // Vérifions maintenant que l'utilisateur n'est pas déjà enregistré
  User.findOne({
    username: { $regex: new RegExp(req.body.username, "i") },
  }).then((data) => {
    if (data === null) {
      // Si nous n'avons pas trouvé de "username" ( data === null), alors nous pour créer un nouvel utilisateur.
      const hash = bcrypt.hashSync(req.body.password, 10);

      const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: hash,
        token: uid2(32),
      });

      newUser.save().then((newDoc) => {
        res.json({ result: true, token: newDoc.token });
        return; // ajout d'un return à CHAQUE réponse pour empêcher réponses multiples
      });
    } else {
      // Si l'utilisateur existe déjà, nous retournons une réponse à false.
      res.json({ result: false, error: "User already registered" });
      return; // ajout d'un return à CHAQUE réponse pour empêcher réponses multiples
    }
  });
});

router.post("/signin", (req, res) => {
  //la connexion est conditionnée par le renseignement de tous les champs
  if (!checkBody(req.body, ["username", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  //la route compare le mot de passe renseigné par l'utilisateur avec le procédé de hachage
  User.findOne({
    username: { $regex: new RegExp(req.body.username, "i") },
  }).then((data) => {
    if (data && bcrypt.compareSync(req.body.password, data.password)) {
      res.json({
        result: true,
        token: data.token,
        username: data.username,
        email: data.email,
      });
    } else {
      res.json({ result: false, error: "User not found or wrong password" });
    }
  });
});

router.delete("/delete", (req, res) => {
  User.deleteOne({ username: User.username }).then(() => {
    res.json({ result: true });
  });
});

//USERNAME UPDATE
router.put("/update-username", (req, res) => {
  const { currentUsername, newUsername } = req.body;

  if (!checkBody(req.body, ["currentUsername", "newUsername"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  };

  //on vérifie que le nouveau nom d'utilisateur n'existe pas déjà dans notre base de données
  User.findOne({ username: newUsername })
    .then(data => {
      if (data) {
        //si oui, on ne change pas le nom d'utilisateur
        res.json({ result: false, error: 'New username is already taken' })
      } else (
        //si ce n'est pas le cas, on change le nom d'utilisateur
        //Pour modifier un seul document. La methode retourne un objet qui contient:
        // matchedCount contenant le nombre de documents correspondants
        // modifiedCount contenant le nombre de documents modifiés
        // upsertedId contenant l'_id du document upserted (pour nous, toujour null)
        // upsertedCount contenant le nombre de documents upserted (pour nous, toujour 0)
        User.updateOne(
          { username: currentUsername }, //Le critère de recherche 
          { username: newUsername } //l’élément à modifier 
        ).then((data) => {
          console.log(data)
          //on vérifie si un document avec un nom d'utilisateur correspondant a été trouvé et si le nom d'utilisateur a été mis à jour
          if (data.modifiedCount > 0 && data.matchedCount > 0) {
            res.json({ result: true, message: 'Username updated successfully' })
          } else {
            res.json({ result: false, error: 'User not found or username not changed' })
          }
        })
      )
    });
});

//EMAIL UPDATE
router.put("/update-email", (req, res) => {
  const { currentEmail, newEmail } = req.body;

  if (!checkBody(req.body, ["currentEmail", "newEmail"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  };

  User.findOne({ email: newEmail })
    .then(data => {
      if (data) {
        //si oui, on ne change pas l'email
        res.json({ result: false, error: 'New email is already used' })
      } else (
        //si ce n'est pas le cas, on change l'email
        User.updateOne(
          { email: currentEmail }, //Le critère de recherche 
          { email: newEmail } //l’élément à modifier 
        ).then((data) => {
          console.log(data)
          //on vérifie si un document avec un nom d'utilisateur correspondant a été trouvé et si le nom d'utilisateur a été mis à jour
          if (data.modifiedCount > 0 && data.matchedCount > 0) {
            res.json({ result: true, message: 'Email updated successfully' })
          } else {
            res.json({ result: false, error: 'User with this email not found or email not changed' })
          }
        }))
    })
});

router.delete("/:username", (req, res) => {
  User.findOne({ username: { $regex: new RegExp(req.params.username, "i") }, })
    .then(data => {
      console.log(data)
      if (data) {
        User.deleteOne({ username: { $regex: new RegExp(req.params.username, "i") }, })
          .then(
            res.json({ result: true, userdeleted: data }))
      }

      else {
        res.json({ result: false, error: 'No user found' })
      }
    })
})

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

module.exports = router;
