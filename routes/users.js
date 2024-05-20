var express = require('express');
var router = express.Router();
const { checkBody } = require('../modules/checkBody');
const bcrypt = require('bcrypt');
const uid2 = require('uid2');

// Nous vérifions ici que tous les champs soient bien remplis afin que l'inscription utilisateur soit possible.
router.post('/signup', (req, res) => {
  if (!checkBody(req.body, ["username", "email", "password", "token"]))
    res.json({ result: "false", error: "Missing or empty fields" })
  return;
})

// Vérifions maintenant que l'utilisateur n'est pas déjà enregistré
User.findOne({ username: $regex: new Regexp(req.body.username, 'i') }).then(data => {
  if (data === null) {
    // Si nous n'avons pas trouvé de "username" ( data === null), alors nous pour créer un nouvel utilisateur.
    const hash = bcrypt.hashSync(req.body.password, 10);

    const newUser = new User({
      username: req.body.username,
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










/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

module.exports = router;
