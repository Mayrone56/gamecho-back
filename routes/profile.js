// VAL
var express = require("express");
var router = express.Router();
const cloudinary = require("cloudinary").v2; // ATTENTION, lien cloudinary à renseigner dans .env
const uniqid = require("uniqid");
const fs = require("fs");
const path = require("path"); // à exploiter pour extraire l'extension de l'image et s'adapter

//ne peut fonctionner sans le module fileupload, ne pas oublier de yarn install

router.post("/avatar", async (req, res) => {
  const fileExtension = path.extname(req.files.avatar.name); // path = module qui permet d'exploiter l'extension d'un fichier, ici utilisé avec la méthode extname() pour extraire / req.files.avatar.name pour cibler le nom envoyé par le front
  const photoPath = `./tmp/${uniqid()}${fileExtension}`; // possibilité de remplacer l'extension => le but est d'accepter tout type d'image
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


// var express = require("express");
// var router = express.Router();
// const multer = require('multer');
// const cloudinary = require('cloudinary').v2;
// const { CloudinaryStorage } = require('multer-storage-cloudinary');

// // Configurer Cloudinary
// cloudinary.config({
//   cloud_name: 'your_cloud_name',
//   api_key: 'your_api_key',
//   api_secret: 'your_api_secret',
// });

// // Stockage Multer pour Cloudinary
// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: {
//     folder: 'avatars',
//     format: async (req, file) => 'png', // ou 'jpg', etc.
//     public_id: (req, file) => file.originalname,
//   },
// });

// const upload = multer({ storage: storage });

// // Route pour uploader l'avatar
// app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No file uploaded' });
//   }

//   const avatarUrl = req.file.path; // URL Cloudinary de l'image
//   // Sauvegarder l'URL de l'image dans MongoDB (via Mongoose)
//   User.findByIdAndUpdate(req.user.id, { avatar: avatarUrl }, { new: true })
//     .then((user) => res.json({ url: user.avatar }))
//     .catch((err) => res.status(500).json({ error: err.message }));
// });

// module.exports = router;