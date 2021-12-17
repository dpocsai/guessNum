const express = require("express");
const app = express();
const { body, validationResult } = require("express-validator");
const session = require("express-session");
const flash = require("express-flash");

function validRange(min, max) {
  min = +min;
  max = +max;
  if (min < 1 || min > 999999999 || min >= max) {
    return false;
  }
  if (max < 2 || max > 1000000000 || max <= min) {
    return false;
  }
  return true;
}
function guessesNeeded(min, max) {
  if (max - min === 1) return 2;
  return Math.ceil(Math.log2(max - min + 1));
}

function generateGuess() {
  let min = app.locals.min;
  let max = app.locals.max;
  return Math.floor((min + max) / 2);
}
app.set("view engine", "pug");

app.use(
  session({
    name: "guessNum",
    resave: false,
    saveUninitialized: true,
    secret: "guessNum-secret",
  })
);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(flash());

app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.get("/", (req, res) => {
  res.redirect("/setup");
});
app.get("/setup", (req, res) => {
  res.render("setup");
});

app.get("/start", (req, res) => {
  res.render("start");
});
app.get("/guess", (req, res) => {
  app.locals.currentGuess = generateGuess(app.locals.min, app.locals.max);
  app.locals.guessesLeft--;
  if (app.locals.guessesLeft >= 0) {
    res.render("guess");
  } else {
    res.redirect("/");
  }
});
app.get("/guess/higher", (req, res) => {
  app.locals.min = app.locals.currentGuess + 1;
  app.locals.currentGuess = generateGuess(app.locals.min, app.locals.max);
  app.locals.guessesLeft--;
  if (app.locals.guessesLeft >= 0) {
    res.render("guess");
  } else {
    res.redirect("/");
  }
});
app.get("/guess/lower", (req, res) => {
  app.locals.max = app.locals.currentGuess - 1;
  app.locals.currentGuess = generateGuess(app.locals.min, app.locals.max);
  app.locals.guessesLeft--;
  if (app.locals.guessesLeft >= 0) {
    res.render("guess");
  } else {
    res.redirect("/");
  }
});

app.post(
  "/setup",
  [
    body("min")
      .trim()
      .toInt()
      .isInt({ min: 1, max: 999999999 })
      .withMessage("Minimum must be between 1 and 999999999"),
    body("max")
      .trim()
      .toInt()
      .isInt({ min: 2, max: 1000000000 })
      .withMessage("Maximum must be between 2 and 1000000000"),
    body("min").custom((value, { req }) => {
      if (value >= req.body.max) {
        throw new Error("Minimum must be less than Maximum");
      }
      return true;
    }),
  ],
  (req, res, next) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors);
      errors.array().forEach((error) => req.flash("error", error.msg));
      res.render("setup", {
        flash: req.flash(),
      });
    } else {
      let min = req.body.min;
      let max = req.body.max;
      if (!validRange(min, max)) {
        next(new Error("Not found."));
      } else {
        let guesses = guessesNeeded(min, max);
        app.locals.min = +min;
        app.locals.max = +max;
        app.locals.guesses = guesses;
        app.locals.guessesLeft = guesses;
        app.locals.currentGuess = generateGuess();

        res.redirect(`/start`);
      }
    }
  }
);

app.use((err, req, res, next) => {
  console.log(err);
  res.redirect("/setup");
});

app.listen(3005, () => {
  console.log("Listening on port 3005");
});
