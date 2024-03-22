const waitPort = require("wait-port");
const fs = require("fs");
const ampq = require("ampqlib");

let connection;
let channel;

async function init() {
  const host = process.env.RABBITMQ_HOST;

  await waitPort({
    host,
    port: 5672,
    timeout: 10000,
    waitForDns: true,
  });

  try {
    connection = await ampq.connect(`amqp://${host}`);
  } catch (error) {
    console.log("Error connecting to Queue", error);
    throw new Error("Error connecting to the RabbitMQ!", error);
  }

  try {
    channel = await connection.createChannel();
  } catch (error) {
    console.log("Error creating a channel", error);
    throw new Error("error creating channel", error);
  }
}

async function teardown() {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await connection.close();
  } catch (error) {
    console.log("Error closing the connection", error);
  }
}

async function createTask(queue, data) {
  try {
    await channel.assertQueue(queue, {
      durable: true,
    });
  } catch (error) {
    console.log(`Error asserting the queue ${queue}`, error);
    throw new Error("Channel Assert Error");
  }

  try {
    await channel.sendToQueue(queue, Buffer.from(data), {
      persistent: true,
    });
    console.log(`data sent to ${queue}`, data);
  } catch (error) {
    console.log("Error sending message to the queue", error);
    throw new Error("Error sending data to the queue");
  }
}

module.exports = {
  init,
  teardown,
  createTask,
};
