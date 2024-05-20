const mongoose = require('mongoose');

const connectionString = process.env.CONNECTION_STRING

// don't forget to use your own connectionString to exploit the database
// set it as an env.

mongoose.connect(connectionString, { connectTimeoutMS: 2000 })
 .then(() => console.log('Database connected'))

  .catch(error => console.error(error));
