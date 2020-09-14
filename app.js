//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require('lodash');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const socketio = require('socket.io');


// setting up of all packages
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

  //Sessions setup
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


  // Users DB connection
let conn = mongoose.createConnection("mongodb+srv://admin-niranjay:Nebula@cluster0.wrvir.mongodb.net/userDB", {useNewUrlParser: true, useUnifiedTopology: true});


  // User Schema
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(findOrCreate);

  // User's Model
const User = conn.model("User", userSchema);

  // Passport Strategy
passport.use(User.createStrategy());

  // Serialization and De-serialization for any third party authenticator, using Passport
passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});


  // Stories DB
let conn2 = mongoose.createConnection("mongodb+srv://admin-niranjay:Nebula@cluster0.wrvir.mongodb.net/storiesDB", {useNewUrlParser: true, useUnifiedTopology: true});

  // Post's Schema
const postSchema = {
  title: String,
  content: String,
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }]
};

  // Post's Model
const Post = conn2.model("Post", postSchema);


const homeStartingContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus et molestie ac feugiat sed lectus vestibulum. Nisl purus in mollis nunc sed id semper risus. Scelerisque varius morbi enim nunc. Integer eget aliquet nibh praesent tristique magna sit amet purus. Eget nullam non nisi est sit amet facilisis magna. Mi quis hendrerit dolor magna eget est.";



// Routing paths

app.get("/", function(req, res){
  res.render("home");
});


app.get("/posts/:postid", function(req, res){

  const userid = req.user._id;
  const requestedPostId = req.params.postid;
  Post.findOne({_id: requestedPostId}, function(err, post){
    post.viewedBy.addToSet(userid);
    post.save();
    res.render("post", {
      title: post.title,
      content: post.content,
      totalViewCount: post.viewedBy.length,
    });
 });
});


app.get("/login", function(req, res){
  res.render("login");
});


app.get("/register", function(req, res){
  res.render("register");
});


app.get("/timeline", function(req, res){
  if(req.isAuthenticated()){
    Post.find({},function(err, posts){
      res.render("timeline", {
        startingContent: homeStartingContent,
        posts: posts
      });
    });
  } else {
    res.redirect("/login");
  }
});


app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
})


app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/timeline");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
      return next(err)
    } else {
      passport.authenticate("local", { successRedirect: "/timeline", failureRedirect: "/login"})(req, res, function(){
        console.log(req.user.username);
      });
    }
  });

});











app.listen(process.env.PORT || 3000, function(){
  console.log("Server started on port 3000...");
});
