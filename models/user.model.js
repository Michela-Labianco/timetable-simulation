const mongoose = require('mongoose');
let Schema = mongoose.Schema;
const bcrypt = require('bcrypt');


// Example Mongoose schema for contact section
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true }, //✔️ Used unique: true for email –> to prevent duplicates
  password: { type: String, required: true },
  //add a role field for future-proofing
  role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

//create and export the model
let User = mongoose.model('User', UserSchema); 

module.exports = {User};