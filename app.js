require("dotenv").config();
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");


var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var profileRouter = require("./routes/profile");
var gameRouter = require("./routes/games");
var ratingRouter = require("./routes/ratings");

var app = express();

const cors = require('cors');
app.use(cors());
// app.use(cors({
//     origin: 'http://localhost:3001',
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true, // si tu utilises des cookies ou l'authentification basée sur des sessions
// }));

// const https = require('https'); // nouveau module pour créer des serveurs et des clients HTTPS
// const fs = require('fs'); // "file system", module pour opération de lecture/d'écriture de fichiers nécessaires aux certificats SSL/TLS.

// const options = {
//   key: fs.readFileSync('localhost.key'),
//   cert: fs.readFileSync('localhost.crt')
// };

// https.createServer(options, app).listen(3019, () => {
//   console.log('Server running on https://localhost:3019');
// });
// app.get('/', (req, res) => {
//   res.send('Hello HTTPS World!');
// });

const fileUpload = require("express-fileupload");
app.use(fileUpload());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/profile", profileRouter);
app.use("/games", gameRouter);
app.use("/ratings", ratingRouter);

module.exports = app;
