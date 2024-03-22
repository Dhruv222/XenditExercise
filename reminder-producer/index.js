#!/usr/bin/env node

/**
 * Script to be run at the start of every month, e.g; Aug 1, Sep 1 etc
 * Set it up through a cron job or lambdas work as well
 */
const { cardsDB, taskQ } = require("./persistence");

const main = async () => {
  try {
    await cardsDB.init();
  } catch (error) {
    console.log("Error connecting to cards DB", error);
    throw new Error("Error connecting to the DB");
  }

  try {
    await taskQ.init();
  } catch (error) {
    console.log("error connecting to the queue", error);
    throw new Error("Error connecting to the queue");
  }

  let expiryDatesToInform = [];
  for (i = 0; i < 3; i++) {
    let date = new Date();
    date.setMonth(date.getMonth() + i + 1);
    expiryDatesToInform.push(`${date.getMonth}/${date.getFullYear}`);
  }
  console.log("INforming the following expiry dates:", expiryDatesToInform);

  let cardsToInform;
  try {
    cardsToInform = await cardsDB.getCards(expiryDatesToInform);
  } catch (error) {
    console.log("Error getting cards with close expiry dates", error);
  }
  console.log(`Found ${cardsToInform.length} cards to inform:`, cardsToInform);

  for (i = 0; i < cardsToInform.length; i++) {
    await taskQ.createTask(process.env.QUEUE_NAME, cardsToInform[i]);
  }
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

main()
  .then(() => {
    console.log("Notifications queued successfully");
  })
  .catch((error) => {
    console.log("Error running the script", error);
  })
  .finally(gracefulShutdown);

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGUSR2", gracefulShutdown);
