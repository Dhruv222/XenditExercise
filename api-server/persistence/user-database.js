const waitPort = require("wait-port");
const fs = require("fs");
const mysql = require("mysql2");

const {
  USER_MYSQL_HOST: HOST,
  USER_MYSQL_HOST_FILE: HOST_FILE,
  USER_MYSQL_USER: USER,
  USER_MYSQL_USER_FILE: USER_FILE,
  USER_MYSQL_PASSWORD: PASSWORD,
  USER_MYSQL_PASSWORD_FILE: PASSWORD_FILE,
  USER_MYSQL_DB: DB,
  USER_MYSQL_DB_FILE: DB_FILE,
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
    pool.query(
      "CREATE TABLE IF NOT EXISTS users (id varchar(36) NOT NULL, email varchar(255) NOT NULL, PRIMARY KEY(email)) DEFAULT CHARSET utf8mb4 " +
        // "ENCRYPTION='Y'" +
        "",
      (err) => {
        if (err) return rej(err);

        pool.query(
          "CREATE TABLE IF NOT EXISTS cards (user_id varchar(36) NOT NULL, card_id varchar(36) NOT NULL, trunc_card_number varchar(16) NOT NULL, CONSTRAINT userCard PRIMARY KEY (user_id,card_id)) DEFAULT CHARSET utf8mb4 " +
            // "ENCRYPTION='Y'" +
            "",
          (err) => {
            if (err) return rej(err);

            console.log(`Connected to users db at host ${HOST}`);
            acc();
          }
        );
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

async function getUsers() {
  return new Promise((acc, rej) => {
    pool.query("SELECT * FROM users", (err, rows) => {
      if (err) return rej(err);
      acc(rows);
    });
  });
}

async function getUserByEmail(email) {
  return new Promise((acc, rej) => {
    pool.query("SELECT * FROM users WHERE email=?", [email], (err, rows) => {
      if (err) return rej(err);
      acc(rows[0]);
    });
  });
}

async function storeUser(user) {
  return new Promise((acc, rej) => {
    pool.query(
      "INSERT INTO users (id, email) VALUES (?, ?)",
      [user.id, user.email],
      (err) => {
        if (err) return rej(err);
        acc();
      }
    );
  });
}

async function storeCardData(data) {
  return new Promise((acc, rej) => {
    pool.query(
      "INSERT INTO cards (card_id, user_id, trunc_card_number) VALUES (?, ?, ?)",
      [data.card_id, data.user_id, data.truncCardNumber],
      (err, rows) => {
        if (err) {
          return rej(err);
        }
        acc();
      }
    );
  });
}

module.exports = {
  init,
  teardown,
  getUsers,
  getUserByEmail,
  storeUser,
  storeCardData,
};
