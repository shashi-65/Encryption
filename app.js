require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
require('https').globalAgent.options.rejectUnauthorized = false;






const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

mongoose.connect("mongodb+srv://shashi_secret:2vFT5wo4QSVPqgM1@cluster0.2c6soxo.mongodb.net/userDB");



const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// The below code serialize and deserialize only works for local startegy(local authentication) by using passport-local-mongoogle,
//  while the new logic works for all kinds of authentiction 
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });



passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
  },
  
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", (req, res) => {
User.find({"secret": {$ne: null}}) 
    .then(function(foundUsers) {
        res.render("secrets", {usersWithSecrets : foundUsers});
    })
    .catch(function(err){
        console.log(err);
    });

});



app.get("/submit", (req, res) => {
    if(req.isAuthenticated()) {
        res.render("submit");
   
       }else{
           res.redirect("/login");
       }
});


app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    // console.log(req.user);
    User.findById(req.user.id)
    .then(function(foundUser){
        if(foundUser){
            foundUser.secret = submittedSecret;
            foundUser.save()
                .then(function(){
                    res.redirect("/secrets");
            });

        }
    })
    .catch(function(err){
        console.log(err);
    });

});


app.get("/logout", (req, res,next) => {

    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});


app.get("/auth/google", 
    passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });


app.post("/register", (req, res) => {
// fetching the below code from examples section from passport-local-mongoose in npm docs
    User.register({username: req.body.username},  req.body.password, function (err,user){

        if(err){
            console.log(err);
            res.redirect("/register");
        } else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });


});





app.post("/login", (req, res) => {
    
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(3000, function(){
  console.log("Server started on port 3000.");
});

