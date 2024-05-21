var express = require("express");
var router = express.Router();
require('../models/connection');

const User = require('../models/user');


const { checkBody } = require('../modules/checkBody');
const bcrypt = require('bcrypt');
const uid2 = require('uid2');


// Nous vérifions ici que tous les champs soient bien remplis afin que l'inscription utilisateur soit possible.
router.post('/signup', (req, res) => {
  if (!checkBody(req.body, ["username", "email", "password"])) {
    res.json({ result: "false", error: "Missing or empty fields" });
    return;
  }

  // Vérifions maintenant que l'utilisateur n'est pas déjà enregistré
  User.findOne({ username: { $regex: new RegExp(req.body.username, 'i') } }).then(data => {
    if (data === null) {
      // Si nous n'avons pas trouvé de "username" ( data === null), alors nous pour créer un nouvel utilisateur.
      const hash = bcrypt.hashSync(req.body.password, 10);

      const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: hash,
        token: uid2(32),
      })

      newUser.save().then(newDoc => {
        res.json({ result: true, token: newDoc.token })
      });

    } else {
      // Si l'utilisateur existe déjà, nous retournons une réponse à false.
      res.json({ result: false, error: "User already registered" })
    }
  })

});




// Comparaison du mot de passe écrit par l'utilisateur et sa confirmation

if (req.body.password !== req.body.confirmPassword) {
  res.json({ result: false, error: "Passwords do not match" });
  return;
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
    });
  } else {
    // Si l'utilisateur existe déjà, nous retournons une réponse à false.
    res.json({ result: false, error: "User already registered" });
  }
});
});

router.post("/signin", (req, res) => {
  //la connexion est conditionnée par le renseignement de tous les champs
  if (!checkBody(req.body, ["username", "password", "email"])) {
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

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

module.exports = router;
