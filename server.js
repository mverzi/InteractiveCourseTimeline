const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const app = express();
const PORT = 3000;
require('dotenv').config();

let dbConnectionStr = process.env.DB_STRING;

app.set('view engine', 'ejs'); // Set EJS as the view engine

MongoClient.connect(dbConnectionStr, { useUnifiedTopology: true })
    .then(client => {
        console.log(`Connected to Database`);
        // Here, you should set up your MongoDB database connection and store it in a variable.
        // Example: const db = client.db('your_database_name');
    })
    .catch(error => {
        console.error(`Error connecting to the database: ${error}`);
    });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.render('index', {
        
    });
});

app.get('/planAhead', (req, res) => {
    // Render the EJS template, not serve it as a static file
    res.render('planAhead', {
        // Pass data for this template if needed
    });
});

app.listen(process.env.PORT || PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
