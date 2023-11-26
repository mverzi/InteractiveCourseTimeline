// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use('CourseTimeline');

// Create a new document in the collection
db.getCollection('concentrations ').insertOne({

    name: 'Data Science',
    mustBeOfMajor: 'Computer Science',
    electives: ['27', '28', '29', '30', '31', '32', '33', '34'],
    requiredCourse: '26',
    description: '... (your description here)',
    totalCredits: 16
});



