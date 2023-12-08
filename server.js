const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const app = express();
const PORT = process.env.PORT || 3000;
const { ObjectId } = require('mongodb');
require('dotenv').config();

let dbConnectionStr = process.env.DB_STRING;
let classesCollection;
let student1Collection;
let db;
let selectedStudent = '10289';

app.set('view engine', 'ejs');

//DATA BASE CONNECTION 
MongoClient.connect(dbConnectionStr, { useUnifiedTopology: true })
  .then(client => {
    console.log(`Connected to Database`);
    const database = client.db('CourseTimeline');
    classesCollection = database.collection('classes');
    student1Collection = database.collection('student1');
    majorsCollection = database.collection('majors');
    minorsCollection = database.collection('minors');
    concentrationsCollection = database.collection('concentration');
    db = database;
  })
  .catch(error => {
    console.error('Error connecting to the database:', error);
  });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Define a function to fetch the currentCourses for the selected student
async function fetchCurrentCourses() {
  try {
    if (!selectedStudent) {
      return [];
    }

    const student = await student1Collection.findOne({ studentId: selectedStudent });

    if (student && student.currentCourses) {
      const currentCourseIds = student.currentCourses;

      // Perform a lookup to retrieve class/course names based on _id values
      const currentCourses = await classesCollection
        .find({ _id: { $in: currentCourseIds } })
        .toArray();

      return currentCourses.map(course => course.courseNumber + ": " + course.courseTitle);
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
}

// Define the function to calculate progress
async function calculateProgress(studentId) {
  try {
    if (db) {
      const student = await student1Collection.findOne({ studentId });
      if (student) {
        const major = student.major;
        const coursesTaken = student.coursesTaken;

        const courseData = await classesCollection.find({ _id: { $in: coursesTaken } }).toArray();

        const totalCreditsFromCourses = courseData.reduce((total, course) => total + course.creditHours, 0);

        const majorsCollection = db.collection('majors');
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

async function getUserFirstName(studentId) {
  try {
    const student = await student1Collection.findOne({ studentId });

    // Check if the student exists and has a first name
    if (student && student.name) {
      return student.name;
    } else {
      return null; // Return null if the student or their first name is not found
    }
  } catch (error) {
    // Handle errors here
    console.error('Error retrieving student name:', error.message);
    return null;
  }
}

// HOME PAGE
app.get('/', async (req, res) => {
  try {
    // Fetch the progress and currentCourses for the selected student
    const progress = await calculateProgress(selectedStudent);
    const currentCourses = await fetchCurrentCourses();
    const firstName = await getUserFirstName(selectedStudent);
    if (progress !== null) {
      res.render('index', { progress, currentCourses,firstName });
    } else {
      res.status(404).send('Student not found or data not available');
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).send('Internal Server Error');
  }
});

// PLAN AHEAD PAGE
app.get('/planAhead', async (req, res) => {
  try {
    if (!selectedStudent) {
      res.status(400).send('No student selected');
      return;
    }

    const student = await student1Collection.aggregate([
      {
        $match: { studentId: selectedStudent }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'coursesTaken',
          foreignField: '_id',
          as: 'coursesTaken'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'currentCourses',
          foreignField: '_id',
          as: 'currentCourses'
        }
      }
    ]).toArray();

    if (student.length === 0) {
      res.status(404).send('Student not found');
      return;
    }

    const allClasses = await classesCollection.aggregate([
      {
        $match: { coreCourse: true }
      }
    ]).toArray();
    const studentCoursesTaken = student[0].coursesTaken;
    const studentCurrentCourses = student[0].currentCourses;

    const totalCreditsTaken = studentCoursesTaken.reduce((total, course) => total + course.creditHours, 0);
    const totalCreditsCurrent = studentCurrentCourses.reduce((total, course) => total + course.creditHours, 0);

    const coursesNotTaken = allClasses.filter(course => {
      return !studentCoursesTaken.some(c => c._id.toString() === course._id.toString()) && !studentCurrentCourses.some(c => c._id.toString() === course._id.toString());
    });

    const studentWithCourses = {
      name: student[0].name,
      creditsCompleted: totalCreditsTaken + totalCreditsCurrent,
      coursesTaken: studentCoursesTaken,
      currentCourses: studentCurrentCourses,
      coursesNotTaken: coursesNotTaken
    };

    res.render('planAhead', { student: studentWithCourses });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function fetchAllCourses() {
  try {
    const allClasses = await classesCollection.find({}, { courseNumber: 1, creditHours: 1 }).toArray();
    return allClasses;
  } catch (error) {
    throw error;
  }
}

let currentCourses = [];

// PLANNER PAGE
app.get('/planner', async (req, res) => {
  try {
    // Define coursesNotTaken as an empty array
    let coursesNotTaken = [];
    let activeCourses = [];

    // Populate coursesNotTaken based on the conditions in your GET route
    const student = await student1Collection.findOne({ studentId: selectedStudent });

    if (student) {
      const allClasses = await fetchAllCourses();
      coursesNotTaken = allClasses.filter(course => {
        if (!student.coursesTaken.includes(course._id) && !student.currentCourses.includes(course._id)) {
          // Check if the student has all prerequisites for this course
          const prerequisitesMet = course.prerequisites.every(prereq => {
            const met = student.currentCourses.includes(prereq) || student.coursesTaken.includes(prereq);
            return met;
          });
          return prerequisitesMet && course.coreCourse;
        }
        return false;
      });
    }

    if (student) {
      let currentCourses = student.currentCourses;

      const allClasses = await fetchAllCourses();

      // Find active courses that are in currentCourses
      activeCourses = allClasses.filter(course => currentCourses.includes(course._id));

      const recommendations = [];
      activeCourses.forEach(activeCourse => {
        if (activeCourse.nextCourses && Array.isArray(activeCourse.nextCourses)) {
          const activeCourseRecommendations = allClasses.filter(course =>
            course._id !== activeCourse._id && // Exclude the active course
            activeCourse.nextCourses.includes(course._id) &&
            !currentCourses.includes(course._id) && // Check if the course is not in currentCourses
            !student.coursesTaken.includes(course._id) // Check if the course is not in coursesTaken
          );

          if (activeCourseRecommendations.length > 0) {
            recommendations.push({
              course: activeCourse,
              recommendedCourses: activeCourseRecommendations,
            });
          }
        }
      });

      currentCourses = [];

      // Render the 'planner' template and pass the data
      res.render('planner', {
        coursesNotTaken,
        currentCourses,
        activeCourses,
        recommendations,
      });
    } else {
      // Handle the case where the student is not found
      res.status(404).send('Student not found');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/planner', async (req, res) => {
  try {
    // Define coursesNotTaken as an empty array
    let coursesNotTaken = [];
    //let activeCourses = [];
    let recommendations = [];

    const selectedCourseIds = req.body.selectedCourses;
    if (!selectedCourseIds || (!Array.isArray(selectedCourseIds) && !Array.isArray([selectedCourseIds]))) {
      res.status(400).send('Invalid course selections');
      return;
    }

    // Fetch all courses, including the creditHours field
    const allClasses = await fetchAllCourses();

    // Calculate selectedCourses
    const selectedCourses = allClasses.filter(course => selectedCourseIds.includes(course._id));

    // Retrieve the current courses from the hidden input field
    currentCourses = JSON.parse(req.body.currentCourses);

    // Pass 'coursesNotTaken' and 'currentCourses' when rendering the template
    res.render('planner', {
      coursesNotTaken: coursesNotTaken,
      selectedCourses: selectedCourses,
      currentCourses: currentCourses.concat(selectedCourses),
      recommendations: recommendations,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// DISCOVER PAGE
async function getPrerequisiteCourseNumbers(prerequisiteIds) {
  if (!prerequisiteIds || prerequisiteIds.length === 0) {
    return [];
  }

  const prerequisiteCourses = await classesCollection.find({ _id: { $in: prerequisiteIds } }).toArray();
  return prerequisiteCourses.map(course => course.courseNumber);
}

app.get('/api/search', async (req, res) => {
  const query = req.query.q || '';
  let results = [];

  if (query) {
    results = await classesCollection.find({ "courseNumber": new RegExp(query, 'i') }).toArray();
  } else {
    results = await classesCollection.find().toArray();
  }

  // Fetch prerequisites for each course
  for (let course of results) {
    if (course.prerequisites && course.prerequisites.length > 0) {
      console.log("Before processing: ", course.prerequisites);
      const prerequisitesCourses = await classesCollection.find({ _id: { $in: course.prerequisites.map(id => id) } }).toArray();
      course.prerequisites = prerequisitesCourses.map(course => course.courseNumber);
      console.log("After processing: ", course.prerequisites);
    }
  }

  res.json(results);
});

app.get('/discover', async (req, res) => {
  let results = await classesCollection.find().toArray();

  // For each course in results
  for (let course of results) {
    if (course.prerequisites && course.prerequisites.length > 0) {
      // Fetch the course numbers for each prerequisite
      const prerequisiteCourses = await getPrerequisiteCourseNumbers(course.prerequisites);
      course.prerequisites = prerequisiteCourses;
    }
  }

  res.render('discover', { results });
});

// WHAT IF PAGE 
app.get('/whatIf', async (req, res) => {
  try {
    // Initialize the variables to empty objects
    const selectedMajorInfo = {};
    const selectedMinorInfo = {};
    const selectedConcentrationInfo = {};

    // Render the 'whatIf' template and pass the initialized variables
    res.render('whatIf', {
      selectedMajorInfo,
      selectedMinorInfo,
      selectedConcentrationInfo
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/whatIf', async (req, res) => {
  try {
    // Retrieve the selected major, minor, and concentration from the form
    const selectedMajor = req.body.major;
    const selectedMinor = req.body.minor;
    const selectedConcentration = req.body.concentration;

    // Initialize the variables to empty objects
    const selectedMajorInfo = {};
    const selectedMinorInfo = {};
    const selectedConcentrationInfo = {};

    ////////////////////////////////////////////// MAJOR ///////////////////////////////////////////
    const majorInfo = await majorsCollection.findOne({ name: selectedMajor });
    if (majorInfo) {
      selectedMajorInfo.name = majorInfo.name;
      selectedMajorInfo.creditsNeededForCompletion = majorInfo.creditsNeededForCompletion;
      selectedMajorInfo.description = majorInfo.description;
    }

    ////////////////////////////////////////////// MINOR ///////////////////////////////////////////
    const minorInfo = await minorsCollection.findOne({ name: selectedMinor });
    const student = await student1Collection.findOne({ studentId: selectedStudent });
    const completedCourseIds = student.coursesTaken;
    let remainingMinorCourses = [];
    let remainingMinorElectives = [];
    if (minorInfo) {
      selectedMinorInfo.name = minorInfo.name;
      selectedMinorInfo.totalCredits = minorInfo.totalCredits;
      selectedMinorInfo.description = minorInfo.description;

      const requiredCourseIds = minorInfo.requiredCourses;
      const requiredCourses = await Promise.all(
        requiredCourseIds.map(async (courseId) => {
          const course = await classesCollection.findOne({ _id: courseId });
          return course ? { _id: course._id.toString(), number: course.courseNumber, title: course.courseTitle } : null;
        })
      );

      selectedMinorInfo.requiredCourses = requiredCourses.filter(Boolean);

      const electiveIds = minorInfo.electives;
      const electives = await Promise.all(
        electiveIds.map(async (electiveId) => {
          const elective = await classesCollection.findOne({ _id: electiveId });
          return elective ? { _id: elective._id.toString(), number: elective.courseNumber, title: elective.courseTitle } : null;
        })
      );

      selectedMinorInfo.electives = electives.filter(Boolean);

      const completedRequiredCourses = selectedMinorInfo.requiredCourses.filter(course =>
        completedCourseIds.includes(course._id)
      );
      const completedElectives = selectedMinorInfo.electives.filter(course =>
        completedCourseIds.includes(course._id)
      );
      selectedMinorInfo.completedCourses = {
        requiredCourses: completedRequiredCourses,
        electives: completedElectives
      };

      remainingMinorCourses = selectedMinorInfo.requiredCourses.filter(course =>
        !completedCourseIds.includes(course._id)
      );
      selectedMinorInfo.remainingCourses = remainingMinorCourses;
      // console.log("-----remaining main-----",remainingMinorCourses);

      remainingMinorElectives = selectedMinorInfo.electives.filter(elective =>
        !completedCourseIds.includes(elective._id)
      );
      selectedMinorInfo.remainingElectives = remainingMinorElectives;
      // console.log("-----remaining electives-----",remainingMinorElectives);
    }

    ////////////////////////////////////////////// CONCENTRATION ///////////////////////////////////////////
    const concentrationInfo = await concentrationsCollection.findOne({ name: selectedConcentration });
    if (concentrationInfo) {
      selectedConcentrationInfo.name = concentrationInfo.name;
      selectedConcentrationInfo.description = concentrationInfo.description;
      selectedConcentrationInfo.totalCredits = concentrationInfo.totalCredits;

      const requiredCourseId = concentrationInfo.requiredCourse;
      const requiredCourse = await classesCollection.findOne({ _id: requiredCourseId });

      const electiveIds = concentrationInfo.electives;
      const electives = await Promise.all(
        electiveIds.map(async (electiveId) => {
          const elective = await classesCollection.findOne({ _id: electiveId });
          return elective ? { _id: elective._id.toString(), number: elective.courseNumber, title: elective.courseTitle } : null;
        })
      );

      selectedConcentrationInfo.requiredCourse = requiredCourse ? { _id: requiredCourse._id.toString(), number: requiredCourse.courseNumber, title: requiredCourse.courseTitle } : null;
      selectedConcentrationInfo.electives = electives.filter(Boolean);

      remainingConcentrationElectives = selectedConcentrationInfo.electives.filter(elective =>
        !completedCourseIds.includes(elective._id)
      );
      selectedConcentrationInfo.remainingElectives = remainingConcentrationElectives;

      let completedRequiredCourses = [];
      if (completedCourseIds.includes(selectedConcentrationInfo.requiredCourse._id)) {
        completedRequiredCourses.push(selectedConcentrationInfo.requiredCourse);
      }
      const completedElectives = electives.filter(course =>
        completedCourseIds.includes(course._id)
      );
      selectedConcentrationInfo.completedCourses = {
        requiredCourses: completedRequiredCourses,
        electives: completedElectives
      };

      if (completedCourseIds.includes(selectedConcentrationInfo.requiredCourse._id)) {
        selectedConcentrationInfo.remainingCourse = false;
      }
      else {
        selectedConcentrationInfo.remainingCourse = true;
      }

    }

    // Render the 'whatIf' template and pass the fetched information
    res.render('whatIf', {
      selectedMajorInfo,
      selectedMinorInfo,
      selectedConcentrationInfo
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

//PLAN OF STUDY PAGE
async function fetchCurrentAndCompletedCourses(selectedStudent) {
  try {
    // Check if a student is selected
    if (!selectedStudent) {
      return [];
    }

    // Fetch the student's data based on their studentId
    const student = await student1Collection.findOne({ studentId: selectedStudent });

    if (student) {
      const currentCourseIds = student.currentCourses || [];
      const completedCourseIds = student.coursesTaken || [];

      // Fetch current and completed courses
      const currentCourses = await classesCollection
        .find({ _id: { $in: currentCourseIds.concat(completedCourseIds) } })
        .toArray();

      return currentCourses.map(course => course.courseNumber);
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
}

function recommendCourseProgression(allCourses, completedCourses) {
  const courseProgression = [];
  const semesters = ['Fall 2023', 'Spring 2024', 'Fall 2024', 'Spring 2025', 'Fall 2025', 'Spring 2026', 'Fall 2026', 'Spring 2027'];
  let currentSemester = 0; // Index to keep track of the current semester

  while (currentSemester < semesters.length) {
    const semester = semesters[currentSemester];
    let availableCourses = allCourses.filter(course => {
      // Filter out completed courses
      if (completedCourses.includes(course._id)) {
        return false;
      }

      if (course.coreCourse === false) {
        return false;
      }

      // Filter out courses with unmet prerequisites
      if (course.prerequisites) {
        if (course.prerequisites.some(prereq => !completedCourses.includes(prereq))) {
          return false;
        }
      }

      // Prioritize courses that are in the nextCourses of completed courses
      if (course.nextCourses) {
        if (course.nextCourses.some(nextCourse => completedCourses.includes(nextCourse))) {
          return true;
        }
      }

      // Include other courses
      return true;
    });

    // Handle alternatives
    const selectedCourses = [];
    const alternativeSet = new Set();

    availableCourses = availableCourses.filter(course => {
      const alternativeId = course.alternativeTo;

      if (alternativeId) {
        // Skip alternative course if the primary course or another alternative has been selected
        if (completedCourses.includes(course._id) || alternativeSet.has(alternativeId)) {
          return false;
        }

        // Mark the alternative as selected
        alternativeSet.add(alternativeId);
      }

      // Include other courses
      return true;
    });


    let totalCreditHours = 0;

    for (const course of availableCourses) {
      if (totalCreditHours + course.creditHours <= 12) {
        // Add the course to this semester
        totalCreditHours += course.creditHours;
        selectedCourses.push(course);
        completedCourses.push(course._id);
      }
    }

    // Add the semester and its courses to courseProgression
    courseProgression.push({ semester, courses: selectedCourses });

    // Move on to the next semester
    currentSemester++;
  }

  return courseProgression;
}

app.get('/planOfStudy', async (req, res) => {
  try {
    const allCourses = await fetchAllCourses();
    const currentAndCompletedCourses = await fetchCurrentAndCompletedCourses(selectedStudent);
    const courseProgression = recommendCourseProgression(allCourses, currentAndCompletedCourses);

    res.render('planOfStudy', { courseProgression });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(process.env.PORT || PORT, () => {
  console.log(`Server running on port ${PORT}`);
});