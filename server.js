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
        const student = await studentsCollection.findOne({ _id: "1" });

        if (student) {
            const completedCourses = student.creditsCompleted;
            const major = student.major;

            const majorsCollection = db.collection("majors");
            const majorData = await majorsCollection.findOne({ name: major });

            if (majorData) {
                const totalCredits = majorData.creditsNeededForCompletion;
                const progress = (completedCourses / totalCredits * 100).toFixed(2);

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
