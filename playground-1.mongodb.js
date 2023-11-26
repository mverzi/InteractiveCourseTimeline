// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use('CourseTimeline');

// Create a new document in the collection.
db.getCollection('concentrations ').insertOne({


    "_id": "3",
    "name": "Data Science",
    "mustBeOfMajor": "Computer Science",
    "requiredCourse": "20",
    "electives": [
        "21",
        "22",
        "23",
        "24",
        "25"
    ],
    "description": "With the proliferation of social networks and mobile computing and emerging areas of Internet of Things (IoT), cyber sensing and networking technologies, generating and collecting data has become ubiquitous. The computation and analysis of such large amounts of data have become increasingly important for today’s global and competitive economy. Businesses and industries are striving to use data analytics, data mining, machine learning and statistical models to make better data-driven decisions. As a result, a significant growing demand exists for scientists trained in managing large data sets, developing and utilizing computer systems/software to process data, extracting knowledge or insights from data in various forms and modeling predictive analytics.",
    "totalCredits": 16




});
