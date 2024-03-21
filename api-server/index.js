const express = require("express");
const app = express();

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/cards", (req, res) => {
  console.log(req.body);
  //check if the card number is valid
  //check if expiry is not within last 3 months
  //create a user if it doesnt exist using the email as key
  //create the token for the encrypted card data needed below, UUID?
  //create an entry into the cards table in user database with the trunc card number, user id, token
  //Encrypt the card number you are sending through to card database, need to use a key to encrypt
  //might have to store that key in one of the files on the server, write a note for the lack of KMS
  //send the token back to the user
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
