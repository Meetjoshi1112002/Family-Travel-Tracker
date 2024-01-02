import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "meet@2002",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentuserID;
let users;
let countries_visited;
let err;

// Get all User from the database
async function getUsers(){
  const result = await db.query("select * from users;");
  return result.rows;
}

// Get all visited country code of a particular user
async function getVisitedCountryOfUser(){
  const result = await db.query("select country_code from visited_countries where user_id = $1",[currentuserID]);
  let arr = [];
  result.rows.forEach((obj)=>{
    arr.push(obj.country_code);
  })
  return arr;
}

// Get color of current user
async function getColorOfUser(){
  const obj = users.find((obj)=> obj.id === currentuserID);
  console.log(obj);
  return obj.color;
}

async function getCountryCode(name){
  const result = await db.query("select country_code from countries where country_name = $1",[name]);

  // -1 to show that country not in database
  if(result.rows.length === 0){
    return -1;
  }
  const code = result.rows[0].country_code;

  // -2 To show that user has already visite the country
  if (countries_visited.indexOf(code) !== -1){
    return -2;
  }

  // Return code if all OK
  return code;
}

// Add data in the dataBase then again get user from databse
async function addNewUser(name,color){
  const result = await db.query("insert into users (name,color) values($1,$2) returning id,name,color",[name,color]);
  console.log(result.rows);
  users = await getUsers();
}

// During get route we will use Database every time to get current user visited countries
app.get("/", async (req, res) => {
  countries_visited = await getVisitedCountryOfUser();
  const total = countries_visited.length;
  const color = await getColorOfUser();
  console.log(countries_visited);
  res.render("index.ejs",{
    users:users,
    color:color,
    total:total,
    countries:countries_visited,
    error:err
  })
});

// add route to add new country in database in visited country table
app.post("/add", async (req, res) => {
  const country = req.body.country;
  const code = await getCountryCode(country);
  console.log(code);
  if(parseInt(code) === -1 ){
    console.log("Hi");
    err = "Country is not found in data base"
    res.redirect("/");
    return;
  }
  else if(parseInt(code) === -2 ){
    console.log("Hello");
    err = "Country already visited";
    res.redirect("/");
    return;
  }
  else{
    err = null;
    const result = await db.query("insert into visited_countries(country_code,user_id) values($1,$2) returning id,country_code,user_id",[code,currentuserID])
    console.log(result.rows);
    res.redirect("/");
  }
});

// Simply switch the user Id is the main task here
app.post("/user", async (req, res) => {
  const add = req.body.add || null;
  const user = req.body.user || null;
  if(user && !add){
    console.log("Its for new user");
    console.log(user);
    currentuserID = parseInt(user);
    res.redirect("/");
  }
  else if(add && !user){
    console.log("Its to add");
    res.render("new.ejs");
  }
});

// Here we have to make a new data entry in the user table
app.post("/new", async (req, res) => {
  const color = req.body.color;
  const name = req.body.name;
  await addNewUser(name,color);
  res.redirect("/");
});

// During start of the server get all user from the database initially
app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  users = await getUsers();
  if(users.length !== 0){
    currentuserID = users[0].id;
  }
  console.log(currentuserID);
  console.log(users);
});
