const express = require("express");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/webhook", (req, res) => {
  console.log("Data received", req.body);
});

app.listen(process.env.PORT, () => {
  console.log("Server started at port:", process.env.PORT);
});
