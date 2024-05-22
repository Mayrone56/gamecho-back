var express = require("express");
var router = express.Router();
const cloudinary = require("cloudinary").v2; // ATTENTION, lien cloudinary à renseigner dans .env
const uniqid = require("uniqid");
const fs = require("fs");
const path = require("path"); // à exploiter pour extraire l'extension de l'image et s'adapter

//ne peut fonctionner sans le module fileupload, ne pas oublier de yarn install

router.post("/avatar", async (req, res) => {
  const photoPath = `./tmp/${uniqid()}.gif`; // possibilité de remplacer l'extension => le but est d'accepter tout type d'image
  // création du dossier tmp en amont
  if (req.files && req.files.avatar) {
    // si aucun fichier temporaire n'est extrait, arrêt du code
    const resultMove = await req.files.avatar.mv(photoPath); // avatar => nom donnée au fichier dans le frontend

    if (!resultMove) {
      // contre-intuifif mais c'est l'absence de resultMove qui garantit l'upload
      const resultCloudinary = await cloudinary.uploader.upload(photoPath);
      res.json({ result: true, url: resultCloudinary.secure_url }); // url sera récupéré pour dispatch côté front
    } else {
      res.json({ result: false, error: resultMove });
    }

    fs.unlinkSync(photoPath); // suppression du fichier temporaire pour alléger le backend
  }
});

module.exports = router;
