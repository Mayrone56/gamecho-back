const mongoose = require('mongoose');

// const connectionString = "mongodb+srv://sighwayve:G5ydPgH35v2fNq7G@sgwvlacapsule.6ecjitm.mongodb.net/gamecho"
const connectionString = process.env.CONNECTION_STRING
// don't forget to use your own connectionString to exploit the database
// set it as an env.

mongoose.connect(connectionString, { connectTimeoutMS: 2000 })
  .then(() => console.log('Database Gamecho connected'))

  .catch(error => console.error(error));
