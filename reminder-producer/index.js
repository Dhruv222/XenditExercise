#!/usr/bin/env node
const amqp = require("amqplib");
const { cardsDB, taskQ } = require("./persistence");

let mqConnection;
cardsDB
  .init()
  .then(() => {
    console.log("Connected to the Cards DB, connecting to the task queue");
    return taskQ.init();
  })
  .then(() => {
    console.log("Connected to the Queue");
  })
  .catch(async (error) => {
    console.log(
      "error connecting to the DB or RabbitMQ, shutting down the server"
    );
    try {
      await cardsDB.teardown();
      await taskQ.teardown();
    } catch (error) {
      console.log("Error in teardown", error);
    }
    process.exit(1);
  });

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
