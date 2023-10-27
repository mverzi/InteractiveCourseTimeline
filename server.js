const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const app = express();
const PORT = process.env.PORT || 3000; // Use the PORT environment variable if available

require('dotenv').config();

app.set('view engine', 'ejs');

let dbConnectionStr = process.env.DB_STRING;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', async (req, res) => {
    try {
        const client = await MongoClient.connect(dbConnectionStr, { useUnifiedTopology: true });
        const db = client.db('CourseTimeline');
        const studentsCollection = db.collection("student1");
        const student = await studentsCollection.findOne({ studentId: "102899" });

        if (student) {
            const major = student.major;
            const coursesTaken = student.coursesTaken;

            const classesCollection = db.collection("classes");
            const courseData = await classesCollection.find({ _id: { $in: coursesTaken } }).toArray();

            const totalCreditsFromCourses = courseData.reduce((total, course) => total + course.creditHours, 0);

            const majorsCollection = db.collection("majors");
            const majorData = await majorsCollection.findOne({ name: major });

            if (majorData) {
                const creditsNeededForCompletion = majorData.creditsNeededForCompletion;
                const progress = ((totalCreditsFromCourses / creditsNeededForCompletion) * 100).toFixed(2);

                res.render('index', { progress });
            }
        }

        client.close();
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

