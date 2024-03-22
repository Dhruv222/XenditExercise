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
    // ssl: {
    //   ca: fs.readFileSync("/etc/certs/ca.crt"),
    //   rejectUnauthorized: false,
    // },
  });

  return new Promise((acc, rej) => {
    pool.query("SHOW TABLES;", (err) => {
      if (err) return rej(err);

      console.log(`Connected to cards db at host ${HOST}`);
      acc();
    });
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

async function getCards(expiryDates) {
  return new Promise((acc, rej) => {
    pool.query(
      "SELECT id, full_expiry FROM cards WHERE full_expiry IN (?)",
      [expiryDates.toString()],
      (err, rows) => {
        if (err) return rej(err);
        acc(rows);
      }
    );
  });
}

module.exports = {
  init,
  teardown,
  getCards,
};
