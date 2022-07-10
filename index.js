const express = require("express");
const model = require("./model");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocal = require("passport-local");
const CORS = require("cors");
const Employee = model.Employee;
const Schedule = model.Schedule;
const Week = model.Week;
const Day = model.Day;
const Work = model.Work;
const User = model.User;

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public')); // tells the server to host
app.use(express.urlencoded({extended: false}));
app.use(CORS({origin: 'https://schedule-m.herokuapp.com', credentials: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// PASSPORT STUFF
// Secret is a 'signiture' for cookies
app.use(session({ secret: "p198n1f0198481hm209656565", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new passportLocal.Strategy(
    // configuration
    {
        usernameField: 'email',
        passwordField: 'passwordText',
    },
    // authentication logic
    // email=String, passwordText=String, done=Function
    function (email, passwordText, done) {
        User.findOne({email: email}).then(function (user) {
            if (user) {
                user.verifyPassword(passwordText).then(function (result) {
                    if (result) {
                        done(null, user);
                    } else {
                        console.log("Failed Login: Wrong Password\n  [" + email +  "]\n");
                        done(null, false);
                    }
                });
            } else {
                console.log("Failed Login: User doesn't exist\n  [" + email + "]\n");
                done(null, false);
            }
        }).catch(function (err) {
            console.log("Failed Login: findOne error\n  [" + email + "]\n");
            done(err);
        });
    }
));

passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(function (userId, done) {
    User.findOne({_id: userId}).then(function (user) {
        done(null, user);
    }).catch(function (err) {
        done(err);
    });
});

app.get("/session", function (req, res) {
    if (req.user) {
        responseObject = {
            firstName: req.user.firstName,
            email: req.user.email,
        }
        res.json(responseObject);
    } else {
        res.sendStatus(401);
    }
});

app.post("/session", passport.authenticate("local"), function(req, res) {
    console.log("User Logged in:", req.user.email, end="\n");
    res.sendStatus(201);
});

app.delete("/session", function(req, res) {
    req.logout();
    res.sendStatus(204);
});

app.post('/users', (req, res) => {
    var user = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email
    });
    user.setEncryptedPassword(req.body.passwordText).then(() => {
        user.save().then(() => {
            console.log("User created:", user);
            res.status(201).send("created");
        }).catch((error) => {
            if (error.code == 11000) {
                // handle some specific databae constraint here
                // email -> NOT UNIQUE
                res.status(422).json({"email": "Email already in use"});
                return;
            }
            if (error.errors) {
                let errorMessages = {};
                for (let e in error.errors) {
                    errorMessages[e] = error.errors[e].message;
                }
                if (req.body.passwordText == "") {
                    errorMessages["password"] = "Please specify a password";
                }
                res.status(422).json(errorMessages);
            } else {
                console.error("Error occured while creating a user:", error);
                res.status(500).send("server error");
            }
        });    
    });    
});

app.get('/schedules', async (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }
    returnSchedules = [];

    // Find and add schedules that the user owns
    private_schedules = await Schedule.find({ user : req.user._id});    
    for (let i = 0; i < private_schedules.length; i++) {
        let schedule = private_schedules[i].toJSON();
        schedule.ownership = true;
        returnSchedules.push(schedule);
    }

    // Find and add schedules that are public
    public_schedules = await Schedule.find({ public : true });          
    for (let i = 0; i < public_schedules.length; i++) {
        alreadyAdded = false;
        let schedule = public_schedules[i].toJSON();

        // if schedules is already added, mark as duplicate
        for (let i = 0; i < returnSchedules.length; i++) {              
            if (returnSchedules[i].schedule_name == schedule.schedule_name) {
                alreadyAdded = true;
                break;
            }
        }

        // if duplicate, don't add
        if (!alreadyAdded) {                                            
            schedule.ownership = false;
            returnSchedules.push(schedule);
        }
    }
    res.json(returnSchedules);
});

app.get('/schedules/:scheduleId', async (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }
    Week.find({schedule_id: req.params.scheduleId}).then(async (weeks) => {
        Employee.find({schedule_id: req.params.scheduleId}).then(async (employees) => {
            let responseDays = [];
            let responseWorks = [];
            for(var i = 0; i < weeks.length; i++) {
                let week = weeks[i];
                await Day.find({week_id: week._id}).then(days => {
                    for (let i in days) {
                        responseDays.push(days[i]);
                    }
                });
                await Work.find({week_id: week._id}).then(works => {
                    for (let i in works) {
                        responseWorks.push(works[i]);
                    }
                });
            }
            let responseObject = {
                weeks: weeks,
                employees: employees,
                works: responseWorks,
                days: responseDays
            }
            console.log("Retrieved schedule information for:", req.params.scheduleId);
            res.status(200).json(responseObject);
        });
    }).catch(error => {
        if (error['kind'] == 'ObjectId') {
            res.sendStatus(422);
        } else {
            console.log(error);
        }
    });
});

app.get('/schedules/:scheduleId/employees', async (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }
    Employee.find({schedule_id: req.params.scheduleId}).then(async (employees) => {
        let responseObject = employees
        console.log("Retrieved employees for:", req.params.scheduleId);
        res.status(200).json(responseObject);
        // RESPONSE HAPPENING BEFORE DATA POPULATED!!!
    }).catch(error => {
        console.error("Error retrieving employees for:", req.params.scheduleId);
        console.error(error);
        res.status(500).send();
    });
});

app.get('/weeks/:weekId/days', (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }
    Day.find({week_id: req.params.weekId}).then((days) => {
        res.status(200).json(days);
    }).catch(error => {
        res.status(500).json(error);
    });
});

app.get('/weeks/:weekId/works', (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }
    Work.find({week_id: req.params.weekId}).then((works) => {
        res.status(200).json(works);
    }).catch(error => {
        res.status(500).json(error);
    });
});

// app.post('/users', (req, res) => {
//     if (!req.body.email || !req.body.password) {
//         res.status(422).json({errorMessage: "Field missing"});
//         return;
//     }
//     User.findOne({email: req.body.email}).then((user) => {
//         if (!user) {
//             console.log("login attempt unsuccessful for: ", req.body.email);
//             res.status(422).send("Login Unsuccessful");
//             return;
//         }
//         if (user.userPassword == req.body.password) {
//             console.log("login attempt successful for: ", req.body.email);
//             res.status(201).send("Login Successful");
//         } else {
//             console.log("login attempt unsuccessful for: ", req.body.email);
//             res.status(422).send("Login Unsuccessful");
//         }
//     });
// });

app.post('/schedules', async (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }

    if (!req.body.schedule 
        || !req.body.sun 
        || !req.body.mon 
        || !req.body.tue 
        || !req.body.wed
        || !req.body.thur
        || !req.body.fri
        || !req.body.sat
        || !req.body.open
        || !req.body.close
        || !req.body.public
    ) {
        // invalid schedule request
        res.status(422).json(["Invalid Schedule Request"]);
        return;
    }
    schedule = await Schedule.findOne({schedule_name: req.body.schedule});
    if (schedule != null) {
        res.status(422).json(["Schedule name is already in use"]);
        return;
    }

    var schedule = new Schedule({
        schedule_name: req.body.schedule,
        user: req.user._id,
        public: req.body.public
    });
    schedule.save().then(async () => {
        console.log("Schedule Saved:",schedule);
        Schedule.findOne({schedule_name: req.body.schedule}).then(async (created_schedule) => {
            try {
                var scheduleName = created_schedule.schedule_name;
            } catch (error) {
                return;
            }
            const week_name = "week_1";
            var week = new Week({
                week_name: week_name,
                schedule_id: created_schedule._id
            });
            week.save().then(async (created_week) => {
                [["sun",req.body.sun], ["mon",req.body.mon], ["tue",req.body.tue], ["wed",req.body.wed], ["thur",req.body.thur], ["fri",req.body.fri], ["sat",req.body.sat]].forEach(async (dayArray) => {
                    if (dayArray[1] == 'true') {
                        var day = new Day({
                            day_id: dayArray[0],
                            week_id: created_week._id,
                            start_time: parseInt(req.body.open),
                            end_time: parseInt(req.body.close)
                        });
                        await day.save().catch((error) => {
                            console.log(error);
                            res.status(500).json(["server error"]);
                        });
                    }
                });
                res.status(201).json(schedule);
                return;
            }).catch((error) => {
                console.log(error);
                res.status(500).json(["server error"]);
                return;
            });
        });
    }).catch((error) => {
        console.log(error);
        res.status(500).json(["server error"]);
        return;
    });
});

app.post('/schedules/:scheduleId/employees', async (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }

    // 401 if user doesn't own the schedule
    let schedule = await Schedule.findOne({_id: req.params.scheduleId, user: req.user._id});
    if (schedule == null) {
        res.status(401).json({ownershipFault : true, errorText: "Cannot Edit. This schedule is owned by someone else."});
        return;
    }
    if (!req.body.name || !req.body.color || !req.body.reqHours) {
        res.status(422).json({errorMessage: "Field(s) missing"});
        return;
    }
    
    Schedule.findOne({_id: req.params.scheduleId}).then((object)=>{
        let employee = new Employee({
            schedule_id: req.params.scheduleId,
            name: req.body.name,
            color: req.body.color,
            requested_hours: req.body.reqHours
        });
        employee.save().then(saveResult=>{
            console.log("employee saved:", employee);
            res.status(201).json(saveResult);
        }).catch(error=>{
            console.error("Failed to save employee", "\n", error);
            res.status(500).send();
        });
    }).catch(error => {
        console.error("Failed to grab Schedule ID for EMPLOYEE POST", "\n", error);
        res.status(422).json(["Invalid Schedule ID"]);
    });
});

app.post('/weeks/:weeksId/works', async (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }
    
    Week.findOne({_id: req.params.weeksId}).then( async (week)=>{
        let schedule = await Schedule.findOne({_id: week.schedule_id, user: req.user._id});
        // 401 if user doesn't own the schedule
        if (schedule == null) {
            res.status(401).json({ownershipFault : true, errorText: "Cannot Edit. This schedule is owned by someone else."});
            return;
        }
        Work.deleteMany({week_id: req.params.weeksId}).then((object) => {
            console.log("Old works deleted:", object);
            let works = req.body.works;
            Work.insertMany(works).then(object => {
                console.log("New works saved:", object);
                res.status(201).json(object);
            }).catch(error => {
                console.error("Failed to update works", "\n", error);
                res.status(500).json(error);
            });
        });
    }).catch(error => {
        console.error("Failed to update works", "\n", error);
        res.status(422).json(["Invalid Week ID"]);
    });
});

// app.post('/weeks/:weeksId/days', (req, res) => {
//     Week.findOne({_id: req.params.weeksId}).then((object)=>{
//         Day.deleteMany({week_id: req.params.weeksId}).then((object) => {
//             console.log("old days deleted:", object);
//             let days = req.body.days;
//             console.log("saving new days:", days);
//             Day.insertMany(days).then(object => {
//                 console.log("days saved.");
//                 res.status(201).json(object);
//             }).catch(error => {
//                 console.error("Failed to update days", "\n", error);
//                 res.status(500).json(error);
//             });
//         });
//     }).catch(error => {
//         console.error("Failed to update days", "\n", error);
//         res.status(422).json(["Invalid Week ID"]);
//     });
// });

app.put('/schedules/:scheduleId/employees/:employeeId', async (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }

    // 401 if user doesn't own the schedule
    let schedule = await Schedule.findOne({_id: req.params.scheduleId, user: req.user._id});
    if (schedule == null) {
        res.status(401).json({ownershipFault : true, errorText: "Cannot Edit. This schedule is owned by someone else."});
        return;
    }
    if (!req.body.name || !req.body.color || !req.body.reqHours) {
        res.status(422).json({errorMessage: "Field(s) missing"});
        return;
    }
    Employee.replaceOne({_id: req.params.employeeId}, {
        "schedule_id" : req.params.scheduleId, 
        "name" : req.body.name, 
        "color" : req.body.color, 
        "requested_hours" : req.body.reqHours
    }).then((object)=>{
            console.log("employee updated:", object);
            res.status(201).json(object);
    }).catch(error => {
        console.error("Failed to update employee", "\n", error);
        res.status(422).json(["Invalid Schedule ID"]);
    });
});

app.delete('/schedules/:scheduleId', async (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }

    // 401 if user doesn't own the schedule
    let schedule = await Schedule.findOne({_id: req.params.scheduleId, user: req.user._id});
    if (schedule == null) {
        res.status(403).json({ownershipFault : true, errorText: "Cannot Delete. This schedule is owned by someone else."});
        return;
    }

    console.log("deleting schedule with id:", req.params.scheduleId, "\n");

    Schedule.deleteOne({_id: req.params.scheduleId}).then(async (deleteObj) => {
        console.log("Schedule Deleted, delete count:", deleteObj);
        await Week.find({schedule_id: req.params.scheduleId}).then(async (weeks) => {
            weeks.forEach(async (week) => {
                await Day.deleteMany({week_id: week._id}).then((response) => {
                    console.log("Deleted days", response);
                });
                await Work.deleteMany({week_id: week._id}).then((response) => {
                    console.log("Deleted works", response);
                });
            });
        }).catch(error => {
            console.log("error finding weeks", error);
            res.status(500).json(error);
        });

        await Week.deleteMany({schedule_id: req.params.scheduleId}).then(object => {
            console.log("Deleted weeks", object);
        }).catch(error => {
            console.log("error deleting weeks", error);
            res.status(500).json(error);
        });
        
        await Employee.deleteMany({schedule_id: req.params.scheduleId}).then(object => {
            console.log("Deleted employees", object);
        }).catch(error => {
            console.log("error deleting employees", error);
            res.status(500).json(error);
        });

        if (deleteObj.deletedCount > 0) {
            res.status(204).json(deleteObj);
        } else {
            res.status(404).json(["Nothing to delete"]); // NOT CORRECT STATUS _ PLACEHOLDER
        }
    });
});

app.delete('/schedules/:scheduleId/employees/:employeeId', async (req, res) => {
    if (!req.user) {
        res.sendStatus(401);
        return;
    }

    // 401 if user doesn't own the schedule
    let schedule = await Schedule.findOne({_id: req.params.scheduleId});
    if (schedule.user != req.user._id) {
        res.status(401).json({ownershipFault : true, errorText: "Cannot Delete. This schedule is owned by someone else."});
        return;
    }

    console.log("deleting employee with id:", req.params.employeeId, "\n");

    Employee.deleteOne({_id: req.params.employeeId}).then(deleteObj => {
        console.log("deleted employee:", deleteObj);
        if (deleteObj.deletedCount > 0) {
            res.status(200).json(deleteObj);
        } else {
            res.status(404).json(["Nothing to delete"]); // NOT CORRECT STATUS _ PLACEHOLDER
        }
    }).catch(error => {
        console.error("error deleting employee:", error);
        res.status(500).json(error);
    })
});

var server = app.listen(port, () => {
    console.log(`Node.js server using MongoDB now listening at http://localhost:${port}`);
});




// app.get('/weeks/:weekId', (req, res) => {
//     Day.find({week_id: req.params.weekId}).then((days) => {
//         Work.find({week_id: req.params.weekId}).then((works) => {
//             responseObject = {
//                 days: days,
//                 works: works
//             }
//             res.json(responseObject);
//         });
//     });
// });
