const mongoose = require('mongoose');
let Schema = mongoose.Schema;

const StudentSchema = new Schema({
    name: String,
    email: String,
    role: { type: String, enum: ['student'], default: 'student' },
    course: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }] //same here
});

//create and export the model
let Student = mongoose.model('Student', StudentSchema); 


module.exports = {Student};
