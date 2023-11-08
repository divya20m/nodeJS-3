import express from 'express'
import { MongoClient } from 'mongodb'
import 'dotenv/config'

const app=express()
const port=9000


const mongourl=process.env.mongourl

async function CreateConnection(){
    const client=new MongoClient(mongourl)
    await client.connect()
    console.log("Mongodb is connected")
    return client
}
const client=await CreateConnection() 


//home page
app.get('/',(req,res)=>{
    res.send('hello world')
})


// getting all mentors
app.get('/mentors',async (req,res)=>{
    const allmentors= await client.db("mentor-student").collection("mentor").find().toArray()
    res.send(allmentors)
})


// getting all students
app.get('/students',async (req,res)=>{
    const allstudents= await client.db("mentor-student").collection("student").find().toArray()
    res.send(allstudents)
})

//updating previous mentor to all students
app.put('/students',async (req,res)=>{
    const allstudent= await client.db("mentor-student").collection("student").updateMany({}, { $set: { previousMentor: [] } })
    res.send(allstudent)
})

//adding mentors to the list
app.post('/mentors', express.json(),async (req,res)=>{
    const mentor=req.body
    const allmentors= await client.db("mentor-student").collection("mentor").insertMany(mentor)
    res.send(allmentors)
})


//adding students to the list
app.post('/students', express.json(),async (req,res)=>{
    const students=req.body
    const allstudents= await client.db("mentor-student").collection("student").insertMany(students)
    res.send(allstudents)
})



//getting the students with no assigned mentors
app.get('/assign-mentors', async (req, res) => {
    const unassignedStudents = await client.db("mentor-student").collection("student").find({   mentorName: "", }).toArray()
   res.send(unassignedStudents)
  })


  //getting the students who are assigned with mentors
  app.get('/assigned', async (req, res) => {
    const{mentorName}=req.query
    const assignedStudents = await client.db("mentor-student").collection("student").find({mentorName:{ $ne: "" }}).toArray()
    res.send(assignedStudents)
  })


  //to get students based on their ids
  app.get('/students/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const students = await client.db("mentor-student").collection("student").find({ studentId: studentId }).toArray();

    res.send(students);
});


//assigning mentors to the students who are not assigned with mentors
app.put('/assign-mentors/:studentId', express.json(), async (req, res) => {
    const { studentId } = req.params;
    const { mentorName, studentName } = req.body; 

    const student = await client.db("mentor-student").collection("student").findOne({ studentId, studentName });

    if (student) {
        if (student.mentorName === mentorName) {
            res.status(400).send("Student is already assigned to this mentor.");
        } else {
            const mentor = await client.db("mentor-student").collection("mentor").findOne({ mentorName });

            if (mentor) {
                await client.db("mentor-student").collection("student").updateOne({ studentId }, { $set: { mentorName } });
                await client.db("mentor-student").collection("mentor").updateOne({ mentorName }, { $addToSet: { assignedStudents: studentName } });

                res.status(200).send(`Assigned mentor ${mentorName} to student with ID and name: ${studentId}:${studentName}`);
            } else {
                res.status(404).send("Mentor not found.");
            }
        }
    } else {
        res.status(404).send("Student not found.");
    }
});


//showing students who are assigned to a particular mentor
app.get('/assingedStudents/:mentorName', async (req, res) => {
    const { mentorName } = req.params;

    // Find all students assigned to a specific mentor
    const students = await client.db("mentor-student").collection("student").find({ mentorName }).toArray();

    res.send(students);
});


//changing mentor and saving it to previous mentorName in student collection
app.put('/changeMentor/:studentId', express.json(), async (req, res) => {
    const { studentId } = req.params
    const { mentorName } = req.body

    const student = await client.db("mentor-student").collection("student").findOne({ studentId })

    if (student)
    {
        const currentMentorName = student.mentorName;
        await client.db("mentor-student").collection("student").updateOne({ studentId }, { $set: { mentorName: mentorName }, $push: { previousMentor: currentMentorName }})
        await client.db("mentor-student").collection("mentor").updateOne({ mentorName: currentMentorName },{$pull: { assignedStudents: student.studentName }})
        await client.db("mentor-student").collection("mentor").updateOne( { mentorName },{$addToSet: { assignedStudents: student.studentName } })
         
        res.status(200).send(`Updated mentor for student with ID: ${studentId} from ${currentMentorName} to ${mentorName}`)
    }
    else
     {
        res.status(404).send("Student not found.")
    }
})



  

app.listen(port,console.log("the port has started on the", port))

