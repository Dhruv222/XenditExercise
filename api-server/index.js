const express = require("express");
const { StatusCodes } = require("http-status-codes");
const validator = require("card-validator");
const uuid = require("uuid");
const { cardsDB, usersDB } = require("./persistence");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/cards", async (req, res) => {
  console.log("received the request with body:", req.body);

  if (!req.body.card || !req.body.email) {
    console.log("Missing card or email in body");
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }

  if (
    !req.body.card.cardNumber ||
    !req.body.card.expiryDate ||
    !req.body.card.cardHolderName
  ) {
    console.log(
      "Missing cardNumber, expiryDate or cardHolderName in card object",
      req.body.card.cardNumber,
      req.body.card.expiryDate,
      req.body.card.cardHolderName
    );
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }

  if (
    typeof req.body.card.cardHolderName != "string" ||
    typeof req.body.email != "string"
  ) {
    console.log("cardHolderName or email are not string types");
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }

  //check if the card number is valid
  if (!validator.number(req.body.card.cardNumber).isValid) {
    console.log("CardNumber is not valid");
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
    console.log("ExpiryDate is invalid");
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }

  //check if expiry is not within next 3 months
  if (
    req.body.card.expiryDate.year === dateToday.getFullYear &&
    req.body.card.expiryDate.month < dateToday.getMonth() + 3
  ) {
    console.log("expiryDate is within the next 3 months");
    return res.status(StatusCodes.BAD_REQUEST).send("Bad request data");
  }
  //create a user if it doesnt exist using the email as key
  let user;
  try {
    user = await usersDB.getUserByEmail(req.body.email);
    console.log("user query successful", user);
  } catch (error) {
    console.log("Error getting userByEmail: ", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("There was an error processing your request.");
  }

  let user_id;
  if (!user) {
    try {
      user_id = uuid.v4();
      await usersDB.storeUser({
        id: user_id,
        email: req.body.email,
      });
      user = {
        id: user_id,
      };
      console.log("created user with uuid:", user_id, req.body.email);
    } catch (error) {
      console.log("Error creating a new user", user_id, req.body.email, error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send("There was an error processing your request.");
    }
  }

  user_id = user.id;
  let card_id = uuid.v4(); //create the token for the encrypted card data needed below, UUID?

  //Encrypt the card number you are sending through to card database, need to use a key to encrypt
  //might have to store that key in one of the files on the server, write a note for the lack of KMS
  try {
    await cardsDB.storeCard({
      id: card_id,
      cardNumber: req.body.card.cardNumber, //excrypt this
      expiry: req.body.card.expiryDate,
      cardHolderName: req.body.card.cardHolderName,
    });
    console.log("able to store card data in the cardDB:", card_id);
  } catch (error) {
    console.log("Error storing card data in the card db:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("There was an error processing your request.");
  }

  console.log("Storing card data in users db");
  //create an entry into the cards table in user database with the trunc card number, user id, token
  try {
    console.log(
      "saving the data for user id and card id in the users DB",
      card_id,
      user_id,
      req.body.card.cardNumber.slice(0, 6)
    );
    await usersDB.storeCardData({
      user_id,
      card_id,
      truncCardNumber: req.body.card.cardNumber.slice(0, 6),
    });
    console.log(
      "saved the data for user id and card id in the users DB",
      card_id,
      user_id,
      req.body.card.cardNumber.slice(0, 6)
    );
  } catch (error) {
    console.log("Error storing the user and card data:", error);
    try {
      await cardsDB.removeCard(card_id);
      console.log(
        "removed the card data as the subsequent data failed to store"
      );
    } catch (error) {
      console.log(
        "There was an error removing the card from the card table after the insertion to the Users DB failed"
      );
    }
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("There was an error processing your request.");
  }

  res.send(card_id);
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
      console.log("error tearing down the db connections:", error);
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
