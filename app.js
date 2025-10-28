const express = require('express');
//import the express framework to handle server routes and middleware
const mongoose = require('mongoose');
//connect to mongoose and interact with database
const path = require('path');
//node.js buil-in module to handel file paths correctly across operating systems

const session = require('express-session');

const bcrypt = require('bcrypt');


const app = express();
//create an instance of express application

const User = require('./models/user.model').User;
const Course = require('./models/course.model').Course;
const Teacher = require('./models/teacher.model').Teacher;
const Student = require('./models/student.model').Student;


require('dotenv').config({ path: './.env' });
//loads environment variables from a file called file.env

// Connect to MongoDB (database)
mongoose.connect('mongodb://localhost:27017/timetable')
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(express.urlencoded({ extended: true })); // For parsing data from POST request (forms)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // to parse JSON data sent in POST requests (useful for AJAX requests)


// Set view engine
app.set('view engine', 'ejs');
//to tell express to use ejs as the template engine -> allow to render .ejs files from views/ folder

app.set('views', path.join(__dirname, 'views')); //it explicity sets the path where EJS template are located
//__dirname is a built-in variable in Node.js that gives the absolute path of the directory containing the current JavaScript file


app.use(session({
  secret: process.env.SESSION_SECRET, //set up a session management using a secret key
  resave: false, //Don't save the session back to the store if it hasn't changed.
  saveUninitialized: false, // only store sessions that are used
}));

//to let email decide the role
function getRoleFromEmail(email) {
  //test instead of match because match returns an array or null, while test check if a regular expression finds any match withing a string
  if (/@admin\./.test(email)) return 'admin';
  if (/@teacher\./.test(email)) return 'teacher';
  if (/@learning\./.test(email)) return 'student';
  return null;
}


//helper function to look up the corresponding teacher/student fromm DB using user.email and it populates the course/s field with every detail
async function getProfileByUser(user) {
  if (user.role === 'admin') return user; //only in user collection

  //teachers and students are in their own collections, linkeds by the email
  if (user.role === 'teacher') return await Teacher.findOne({ email: user.email }).populate('course'); //using the email as identifier
  if (user.role === 'student') return await Student.findOne({ email: user.email }).populate('course');
  return null; //return null if user is null
}
//so you use the user collection for authentication and fetch teacher/student profiles separately after login

// GET Routes
app.get('/', async (req, res) => {
  res.render('index',  { message: null }); // Always pass a default value 
  //error message not defined -> because you have to pass message, even if it's empty
});

app.get('/admin', async (req, res) => {
  //that's why here you check if req.session.userId exists or redirect to login
  if(!req.session.userId) return res.redirect('/login');
  //used to fetch teacher/student/admin data.
  try{
    const courses = await Course.find({});

    //to verify the logged-in user is an admin
    const user = await User.findById(req.session.userId);
    if(!user || user.role !== 'admin') return res.status(403).send('Access denied');

    //use of .find no findById so in the admin route all teachers and students are fetched
    const teachers = await Teacher.find({}).populate('course'); // course is the name of the field in the teacher and student schemas that holds the reference (ObjectId) to the Courses collection.
    const students = await Student.find({}).populate('course');
    //find all teachers/students and .populate('course') to get full course info for each one

    res.render('admin', { teachers, students, courses }); //here you send the data -> teachers, students, courses
    //so EJS template can loop through and display it
    //when someone visits /admin, the server fethes teachers, students and courses tables and send it to the template
    //a classic server-side rendering with data injection

  } catch(err){
    console.error('error fetching data', err);
    res.status(500).send('server error');
  }
});


app.get('/teacher', async (req, res) => {
  if(!req.session.userId) return res.redirect('/login') // here you are storing user._id in session during login
  
  try{
    //to verify the logged-in user -> so it fetches the user from database using userId stored in the session
    const user = await User.findById(req.session.userId);
    if(!user || user.role !== 'teacher') 
    //check if user was not found || if the user is found but their role is not a teacher 
    return res.status(403).send('Access denied'); //if either condition are true the access is denied 

    const teacher = await getProfileByUser(user); //calling the helper function and check for null
    if(!teacher) return res.status(404).send('Teacher not found'); // course is the name of the field in the teacher and student schemas that holds the reference (ObjectId) to the Courses collection.

    res.render('teacher', {teacher}); //so you can fetch the teacher, populates the course and return a complete document

  }catch(err){
    console.log(err);
    res.status(500).send('Server error');
  }
});


app.get('/student', async (req, res) => {
  if(!req.session.userId) return res.redirect('/login')

    try{
      //to verify the logged-in user -> so it fetches the user from database using userId stored in the session
      const user = await User.findById(req.session.userId);
      if(!user || user.role !== 'student') 
      //check if user was not found || if the user is found but their role is not a student 
      return res.status(403).send('Access denied'); //if either condition are true the access is denied 
      
      const student = await getProfileByUser(user);
      if(!student) return res.status(404).send('Student not found'); // course is the name of the field in the teacher and student schemas that holds the reference (ObjectId) to the Courses collection.

      const courses = await Course.find({}); //here you define courses

      res.render('student', {student, courses}); //data is sent to EJS view
    }catch(err){
      console.log(err);
      res.status(500).send('Server error');
    }
  });


//to log out 
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error logging out');
    }
    res.redirect('/'); // or wherever your login page is
  });
});




// POST routes
app.post('/register', async (req, res) => {
  ///extract form req.body
  const { email, password, confirmPassword } = req.body;
  //assigned to role variable
  const role = getRoleFromEmail(email);
  
  //validate that password and confirmPassword fields match
  if(!role) return res.send('Invalid email address');
  if (password !== confirmPassword) return res.send('Passwords do not match');

  try {
    //find the the user by email
    const existingUser = await User.findOne({ email }); //findOne expects a filter object
    if (existingUser) return res.send('User already exists');

    const user = new User({ email, password, role });
    await user.save();

    //extract name from email or get it from form
    const name = email.split('@')[0];

    if (role === 'student'){
      //storing role-specific data (also check /student/add-course post route)
      const student = new Student({ email, name, role, course : [] });
      await student.save();
      //console.log('Student saved:', student);

    }
    if (role === 'teacher'){
      //storing role-specific data (also check /edit-row/:id put route -> admin)
      const teacher = new Teacher({ email, name, role, course : [] });
      await teacher.save();
    }

    const message = 'Registration successful. Please log in.';
    res.render('index', { message });

  } catch (err) {
    res.status(500).send('Error registering user');
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const role = getRoleFromEmail(email);
  if(!role) return res.send('Invalid email address');

  try {
    const user = await User.findOne({ email });
    if (!user) return res.send('User not found');

    const match = await bcrypt.compare(password, user.password); //to check if the password is correct
    if (!match) return res.send('Incorrect password');

    req.session.userId = user._id;

    //to update the URL in the browser you need redirect instead of render
    res.redirect(`/${role}`); //to render either one of the ejs file based on the email (regex patterns)
    //the server tells the browser to go to the /admin (or /teacher or /student) URL, so the URL updates properly, 
    //and the user is taken to that route, where your GET route will render the appropriate page.

  } catch (err) {
    res.status(500).send('Login error');
  }
});


app.post('/submit', async (req, res) => {
  try {
    const { name } = req.body;
    const newCourse = new Course({ name });
    await newCourse.save(); //inserting data by saving new courses
    //this is what works with fetch in script.js
    res.status(200).json({ message: 'course saved successfully'});
  } catch (err) {
    console.error('Failed to save course:', err);
    res.status(500).send('Server Error');
  }
});


//student adding course
app.post('/student/add-course', async (req, res) => {
  if(!req.session.userId) return res.status(401).send('unauthorized');

  const{name} = req.body;
  if(!name) return res.status(400).send('course name required');

  try{
    let course = await Course.findOne({name});
    if(!course){
      course = new Course({name});
      await course.save();
    }
    const user = await User.findById(req.session.userId);
    const student = await Student.findOne({email: user.email}); //find the student using the user's email
    if(!student) return res.status(404).send('student not found');

    //avoid adding duplicate course
    //and storing course references in the student course array
    if(!student.course.some(cId => cId.equals(course._id))){
      student.course.push(course._id); //-> actual course assignment
      await student.save()
    }

    res.status(200).json({message : 'course added and assigned to student'})
  } catch (err){
      console.log(err);
  }
})


//ADMIN CRUD
app.put('/edit-row/:id', async (req, res) => {

  const {id} = req.params;
  const {name, course} = req.body;

  try {
    const teacher = await Teacher.findById(id); //findById(id) expects a single string or ObjectId
    const student = !teacher ? await Student.findById(id) : null;
    if(!teacher && !student){
      return res.status(404).json({ message: 'row not found' });
    }

    //logic to find course documents by name
    let courseIds = []; //empty array

    if(Array.isArray(course)){ //check if it's an array
      const courseNames = course.map(c => c.name); //to extract just names from 
      const foundCourses = await Course.find({name: {$in: courseNames}}) //this queries the Course collection to find all documents 
      // where the name field match any of the names in courseNames
      //$in ==== any of these values

      //after retrieving the actual course document, it extract their _id s and they will be assigned to the teacher or student as references
      courseIds = foundCourses.map(c => c._id)
    }

    const updateData = {name, course: courseIds}; //to create an object with the updated name and course Id, passed to findByIdAndUpdate

    //update the correct model
    const updated = await (teacher 
      ? Teacher.findByIdAndUpdate(id, updateData, {new:true}) //if is a teacher it updates their course field 
      : Student.findByIdAndUpdate(id, updateData, {new:true}))
    res.json({ message: 'updated', row: updated });

    //so it takes a list of course names from the frontend, looks them up in the Course collection to get their objectIds
    //and prepares an updateData object that stores those Ids in the course field

  } catch (err) {
    console.error('Error updating row:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


//delete one by one
//'/delete-row' -> custom route path defined by you that have to match the frontend request
app.delete('/delete-row/:id', async (req, res) =>{
  const {id} = req.params; //data from url path

  try{
    //ids is that array of MongoDB _ids, ready to be passed to:
    await Teacher.findByIdAndDelete(id); //check notes
    await Student.findByIdAndDelete(id); //check notes
    //added await so it ensures the document is deleted

    //Waits until deletion is complete before moving on
    res.status(200).json({message: 'row deleted'})
  }catch (err){
    console.log('error:', err);
  }
})

let port = process.env.PORT || 3003;
app.listen(port, () => console.log(`Listening ${port}...`));