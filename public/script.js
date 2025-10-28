document.addEventListener('DOMContentLoaded', function(){
    const page = document.body.dataset.page;

    const registerForm = document.querySelector('.register-form'); //because submit event belongs to the form
    if(registerForm){
        registerForm.addEventListener('submit', async function (e){
            e.preventDefault(); // <- this stops the default submit behavior

            //new FormData grabs all input fields from the form
            const formData = new FormData(registerForm);
            const data = {
                email: formData.get('email'), //grabbing the email input value and the value will be stored in the data object under the email key
                password: formData.get('password'),
                confirmPassword: formData.get('confirmPassword')
            };
            
            try {
                const response = await fetch('/register', { //fetch makes http requests so it has to be /register no /submit
                    //an error was showing because the frontend JavaScript was trying to POST to /submit, but the backend route actually had /register.
                    method: 'POST', //we are submitting data
                    headers: { 'Content-Type': 'application/json' }, //tells the server to expect json
                    body: JSON.stringify(data) //sends the form data converted to a string in the request body
                });

                const text = await response.text(); //used to read the body of the HTTP response as plain text.
                //so if server sends back HTML, or just a string message like res.send('User already exists') using .text is appropriate

                //since the response might be either a string or a whole HTML page using .text ensures you can capture whatever string content comes back
                //so because you're returning various text-like responses, .text() is safer and more flexible here.

                if(response.ok){;
                    window.alert('Registration successful. Please log in.');
                    registerForm.reset();
                    location.reload(); //reload to show the login tab
                } else{
                    alert(text);
                }
            } catch(err){
                console.log('error registering user', err)
            }
        })
    }

    if(page === 'admin-page'){
        
        //to edit teachers and students  -> to select both items '.teacher-list, .student-list'
        document.querySelectorAll('.teacher-list, .student-list').forEach(row => {
            const editBtn = row.querySelector('.edit-btn');
            const saveBtn = row.querySelector('.save-btn');

            editBtn.addEventListener('click', () => {
                // Swap <td> for <input> fields
                const nameEl = row.querySelector('.name-name');
                const currentName = nameEl.textContent.trim();
                nameEl.innerHTML = `<input class="edit-name-input" value="${currentName}" />`;

                //edit course
                const courseCell = row.querySelector('td:nth-child(3)'); //This line selects the third <td> cell inside a <tr> (table row) — specifically the one containing the courses for that row (teacher or student).
                courseSpans = courseCell.querySelectorAll('.name-course');

                let currentCourses = '';
                if(courseSpans.length > 0){
                    currentCourses = Array.from(courseSpans).map(span => span.textContent.trim()).join(", ");
                } else{
                    //fallback if there is only no course text
                    currentCourses = courseCell.textContent.trim() === 'No course' ? '' : courseCell.textContent.trim();
                }
                courseCell.innerHTML = `<input class="edit-course-input" value="${currentCourses}"/>`
                //this replace the entire third cell with a signle input box to edit all courses at once
                
                // Show Save button, hide Edit button
                saveBtn.style.display = 'inline-block';
                editBtn.style.display = 'none';
            });

            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault(); //prevent form submission or page reload
                // Get updated values from inputs
                const updatedName = row.querySelector('.edit-name-input').value.trim();
                const updatedCourseRaw = row.querySelector('.edit-course-input').value.trim();

                const updatedCourses = updatedCourseRaw.split(',').map(c => ({name: c.trim() })).filter(c => c.name)
                //here when saving edits, you send You're sending:
                // {
                //   "name": "Jane Doe",
                //   "course": [
                //     { "name": "Math" },
                //     { "name": "Biology" }
                //   ]
                // } Perfectly fine for UX and readability.

                //Backend Logic -> You correctly map the incoming course names to their corresponding _ids:

                // const courseNames = course.map(c => c.name);
                // const foundCourses = await Courses.find({ name: { $in: courseNames } });
                // courseIds = foundCourses.map(c => c._id);


                // Then you store:
                // const updateData = { name, course: courseIds }; -> this ensures the course field stores ObjectIds as required.

                const id = row.dataset.id;

                try {
                const response = await fetch(`/edit-row/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(
                    //send a plain object, not array
                    {name: updatedName,
                    course: updatedCourses,}
                    )
                });

                if (response.ok) {
                    // Update UI to show updated text (switch back from input to <p>)
                    row.querySelector('.name-name').innerHTML = updatedName;


                    const courseHtml = updatedCourses.map(c => `<span class="name-course">${c.name}</span>`).join('<br>');
                    const courseCell = row.querySelector('td:nth-child(3)'); //to select the 3rd cell inside <tr> -> the course cell
                    courseCell.innerHTML = courseHtml;

                    // Show Edit button, hide Save button
                    editBtn.style.display = 'inline-block';
                    saveBtn.style.display = 'none';
                } else {
                    alert('Failed to update row');
                }
                } catch (error) {
                console.error('Error updating row:', error);
                alert('Server error while updating');
                }
            });
        });


        //to delete them from timetable
        const trashBtns = document.querySelectorAll('.trash-btn');

        trashBtns.forEach(trashBtn => {
            trashBtn.addEventListener('click', async function (){
                const id = trashBtn.dataset.id;
                //calling remove later only on one row
                const row = trashBtn.closest('.teacher-list') || trashBtn.closest('.student-list');

                try{
                    const response = await fetch(`/delete-row/${id}`,{ //no need to send data in the body because you are already using the id in the url path
                        method: 'DELETE',
                        headers: {'Content-type':'application/json'},
                    })
                    if(response.ok){
                        row.style.transition = 'opacity 0.3s';
                        row.style.opacity = '0';

                        setTimeout(() => {
                            row.remove();
                        }, 300)
                    } else{
                        console.log('failed to delete the row');
                    }
                } catch(err){
                    console.log(err);
                }
                
            })
            
        })

        //to add new courses
        const courseForm = document.getElementById('course-form');
        courseForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = document.getElementById('new-course-name').value.trim();

            if (!name) {
                alert('Course name is required');
                return;
            }

            try {
                const res = await fetch('/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
                });

                if (res.ok) {
                location.reload(); // Refresh to show new course
                } else {
                alert('Failed to save course');
                }
            } catch (err) {
                console.error(err);
                alert('Error submitting course');
            }

        })
    }

    if(page === 'student-page'){
        //The attribute is data-has-course, so hasCourse must match exactly:
        const studentHasCourses = document.body.dataset.hasCourse === 'true';

        if(!studentHasCourses){
            //new bootstrap.Modal -> is used to programmatically create and control a modal dialog using JavaScript.
            const addCourseModal = new bootstrap.Modal(document.getElementById('addCourseModal'));
            addCourseModal.show();

            //bootstrap 4
            //$('#addCourseModal').modal('show');
        }

        const addCourseForm = document.getElementById('addCourseForm');
        if(addCourseForm){
            addCourseForm.addEventListener('submit', async(e) => {
                e.preventDefault();

                const courseName = document.getElementById('courseName').value.trim();
                if(!courseName) return alert('course name required');

                try{
                    const response = await fetch('/student/add-course', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name : courseName })
                    });

                    if(response.ok){
                        window.location.reload();
                    } else{
                        alert('failed to add course');
                    }
                } catch (err){
                    console.log('error:', err);
                }
            })
        }
        
    }
})