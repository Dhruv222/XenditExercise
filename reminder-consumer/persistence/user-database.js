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
    pool.query("show tables", (err) => {
      if (err) return rej(err);
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

async function getUserById(id) {
  return new Promise((acc, rej) => {
    pool.query("SELECT * FROM users WHERE id=?", [id], (err, rows) => {
      if (err) return rej(err);
      acc(rows[0]);
    });
  });
}

async function getUserCardById(id) {
  return new Promise((acc, rej) => {
    pool.query("SELECT * FROM cards WHERE card_id=?", [id], (err, rows) => {
      if (err) return rej(err);
      acc(rows[0]);
    });
  });
}

module.exports = {
  init,
  teardown,
  getUserCardById,
  getUserById,
};
