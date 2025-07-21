const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// A simple route for the homepage
app.get('/', (req, res) => {
  res.status(200).send('<h1>Hello World! The server is working correctly.</h1>');
});

// The server start command
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple test server listening on port ${PORT}`);
});