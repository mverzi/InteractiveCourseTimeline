const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const app = express();
const PORT = process.env.PORT || 3000; // Use the PORT environment variable if available
require('dotenv').config();

let dbConnectionStr = process.env.DB_STRING;
let classesCollection; 
let student1Collection;
let db; // Define the db variable at the top level

app.set('view engine', 'ejs');

let studentId = '12345';

// Connect to the MongoDB database at the start
MongoClient.connect(dbConnectionStr, { useUnifiedTopology: true })
  .then(client => {
    console.log(`Connected to Database`);
    const database = client.db('CourseTimeline');
    classesCollection = database.collection('classes');
    student1Collection = database.collection('student1');
    db = database; // Assign the db reference here
  })
  .catch(error => {
    console.error('Error connecting to the database:', error);
  });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Define the function to calculate progress
async function calculateProgress(studentId) {
  try {
    if (db) { // Check if db is defined
      const student = await student1Collection.findOne({ studentId });
      if (student) {
        const major = student.major;
        const coursesTaken = student.coursesTaken;

        const courseData = await classesCollection.find({ _id: { $in: coursesTaken } }).toArray();

        const totalCreditsFromCourses = courseData.reduce((total, course) => total + course.creditHours, 0);

        const majorsCollection = db.collection('majors'); // Use the db reference
        const majorData = await majorsCollection.findOne({ name: major });

        if (majorData) {
          const creditsNeededForCompletion = majorData.creditsNeededForCompletion;
          const progress = ((totalCreditsFromCourses / creditsNeededForCompletion) * 100).toFixed(2);
          return progress;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error: ${error}`);
    throw error;
  }
}

app.get('/', async (req, res) => {
  try {
    const progress = await calculateProgress(studentId);

    if (progress !== null) {
      res.render('index', { progress });
    } else {
      res.status(404).send('Student not found or data not available');
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/planAhead', (req, res) => {
  res.render('planAhead', {
    // Pass data for this template if needed
  });
});

app.get('/planner', (req, res) => {
  res.render('planner', {
    // Pass data for this template if needed
  });
});

app.get('/discover', (req, res) => {
  res.render('discover', {
    // Pass data for this template if needed
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
