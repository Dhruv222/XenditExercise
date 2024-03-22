const express = require("express");
const { StatusCodes } = require("http-status-codes");
const validator = require("card-validator");
const { cardsDB, usersDB } = require("./persistence");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/cards", (req, res) => {
  if (!req.body["card"] || !req.body.email) {
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }

  if (
    !req.body.card.cardNumber ||
    !req.body.card.expiryDate ||
    !req.body.cardHolderName
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }

  if (
    typeof req.body.card.cardHolderName != "string" ||
    typeof req.body.email != "string"
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }

  //check if the card number is valid
  if (!validator.number(req.body.card.cardNumber).isValid) {
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }

  const dateToday = new Date();

  if (
    typeof req.body.card.expiryDate != "object" ||
    req.body.card.expiryDate.month > 12 ||
    req.body.card.expiryDate.month < 1 ||
    req.body.card.expiryDate.year < dateToday.getFullYear() ||
    req.body.card.expiryDate.year >
      dateToday.setFullYear(dateToday.getFullYear() + 20)
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }

  //check if expiry is not within next 3 months
  if (
    req.body.card.expiryDate.year === dateToday.getFullYear &&
    req.body.card.expiryDate.month < dateToday.getMonth() + 3
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }
  //create a user if it doesnt exist using the email as key
  //create the token for the encrypted card data needed below, UUID?
  //create an entry into the cards table in user database with the trunc card number, user id, token
  //Encrypt the card number you are sending through to card database, need to use a key to encrypt
  //might have to store that key in one of the files on the server, write a note for the lack of KMS
  //send the token back to the user
  res.send("All Good");
});

usersDB
  .init()
  .then(() => {
    console.log("Connected to the Users DB");
    return cardsDB.init();
  })
  .then(() => {
    console.log("Connected to the Cards DB");
    app.listen(port, () => {
      console.log(`App listening on port ${port}`);
    });
  })
  .catch(async (err) => {
    try {
      await usersDB.teardown();
      await cardsDB.teardown();
    } catch (error) {
      console.log("error:", error);
    }
    console.error(err);
    process.exit(1);
  });

const gracefulShutdown = () => {
  usersDB
    .teardown()
    .then(() => {
      return cardsDB.teardown();
    })
    .catch(() => {})
    .then(() => process.exit());
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGUSR2", gracefulShutdown);
