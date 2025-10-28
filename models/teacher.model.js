const mongoose = require('mongoose');
let Schema = mongoose.Schema;

const TeacherSchema = new Schema({
    name: String, //to render <%= teacher.name %> and <%= teacher.email %> you need these fields in the Schema
    email: String,
    role: { type: String, enum: ['teacher'], default: 'teacher' },
    //to reference multiple courses as an array of objectIds
    course: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }] // 'course' field -> an array of ObjectIds referencing the 'Courses' collection
});
// Your Mongoose schemas use ObjectId references to Course, which is great,
// This requires saving the _ids of Course, not the course names, in the course array.

//create and export the model
let Teacher = mongoose.model('Teacher', TeacherSchema); 

module.exports = {Teacher};
