const waitPort = require("wait-port");
const fs = require("fs");
const mysql = require("mysql2");

const {
  CARD_MYSQL_HOST: HOST,
  CARD_MYSQL_HOST_FILE: HOST_FILE,
  CARD_MYSQL_USER: USER,
  CARD_MYSQL_USER_FILE: USER_FILE,
  CARD_MYSQL_PASSWORD: PASSWORD,
  CARD_MYSQL_PASSWORD_FILE: PASSWORD_FILE,
  CARD_MYSQL_DB: DB,
  CARD_MYSQL_DB_FILE: DB_FILE,
} = process.env;

let pool;

async function init() {
  const host = HOST_FILE ? fs.readFileSync(HOST_FILE) : HOST;
  const user = USER_FILE ? fs.readFileSync(USER_FILE) : USER;
  const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE) : PASSWORD;
  const database = DB_FILE ? fs.readFileSync(DB_FILE) : DB;

  await waitPort({
    host,
    port: 3306,
    timeout: 10000,
    waitForDns: true,
  });

  pool = mysql.createPool({
    connectionLimit: 5,
    host,
    user,
    password,
    database,
    charset: "utf8mb4",
  });

  return new Promise((acc, rej) => {
    pool.query(
      "CREATE TABLE IF NOT EXISTS cards (id varchar(36), cardNumber varchar(16), expiryMonth integer, expiryYear integer, cardHolderName varchar(255)) DEFAULT CHARSET utf8mb4",
      (err) => {
        if (err) return rej(err);

        console.log(`Connected to cards db at host ${HOST}`);
        acc();
      }
    );
  });
}

async function teardown() {
  return new Promise((acc, rej) => {
    pool.end((err) => {
      if (err) rej(err);
      else acc();
    });
  });
}

/**
 *
 * @returns TODO
 */
async function getItems() {
  return new Promise((acc, rej) => {
    pool.query("SELECT * FROM cards", (err, rows) => {
      if (err) return rej(err);
      acc(
        rows.map((item) =>
          Object.assign({}, item, {
            completed: item.completed === 1,
          })
        )
      );
    });
  });
}

async function storeItem(card) {
  return new Promise((acc, rej) => {
    pool.query(
      "INSERT INTO cards (id, cardNumber, expiryMonth, expiryYear, cardHolderName) VALUES (?, ?, ?, ?, ?)",
      [
        card.id,
        card.cardNumber,
        card.expiry.month,
        card.expiry.year,
        card.cardHolderName,
      ],
      (err) => {
        if (err) return rej(err);
        acc();
      }
    );
  });
}

module.exports = {
  init,
  teardown,
  getItems,
  storeItem,
};
