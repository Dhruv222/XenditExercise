#!/usr/bin/env node
const amqp = require("amqplib");
const usersDB = require("./persistence");

const main = async () => {
  try {
    await usersDB.init();
  } catch (error) {
    console.log("Error connecting to cards DB", error);
    throw new Error("Error connecting to the DB");
  }

  let connection;
  try {
    connection = amqp.connect("amqp://" + process.env.RABBITMQ_HOST);
  } catch (error) {
    console.log("Error connecting to the queue", error);
    throw new Error("Error connecting to the Queue");
  }

  let queue_name = process.env.QUEUE_NAME;
  let channel;
  try {
    channel = await connection.createChannel();
    await channel.assertQueue(queue_name, {
      durable: true,
    });
    await channel.prefetch(1);
  } catch (error) {
    console.log("error creating channel", error);
    throw new Error("error creating new channel");
  }

  console.log("Starting to consume messages");
  channel.consume(
    queue_name,
    async (msg) => {
      console.log("got a message:", msg);
      let data = JSON.parse(msg.content.toString());
      console.log("Data in the message", data);

      // get the user_id and trunc_number from the cards table in the users db
      let userCardData;
      try {
        userCardData = await usersDB.getUserCardById(data.id);
        console.log("userCardData:".userCardData);
      } catch (error) {
        console.log("Error getting user id and trunc number", error);
        throw new Error("Error connecting to DB");
      }

      // get the user email from the users table
      let userData;
      try {
        userData = await usersDB.getUserById(userCardData.user_id);
        console.log("userData:".userData);
      } catch (error) {
        console.log("Error getting user data");
        throw new Error("Error connecting to DB");
      }

      console.log(
        "Sent Email to the customer and called the webhook for the merchant"
      );
      //send the email with the template and data retrieved above
      //use the webhook to send a request with the data for the card and consumer

      channel.ack(msg);
    },
    {
      noAck: false,
    }
  );
};

const gracefulShutdown = () => {
  taskQ
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

main()
  .then(() => {
    console.log("ran the code");
  })
  .catch((error) => {
    console.log("error with main", error);
  })
  .finally(gracefulShutdown);
