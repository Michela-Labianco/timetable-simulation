const mongoose = require('mongoose');
let Schema = mongoose.Schema;

//Each course should be a separate document in the Courses collection, not an array of courses inside one document.
//So the CoursesSchema should describe a single course:
const CoursesSchema = new Schema({
  name: String,
  createdAt: { type: Date, default: Date.now } //mongoose date type
});

let Course = mongoose.model('Course', CoursesSchema); 

module.exports = {Course};
