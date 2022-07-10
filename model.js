const bcrypt = require('bcrypt');
const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://cs4200:paseof8901paoin1pbiuat@cluster0.iryff.mongodb.net/bluewhale?retryWrites=true&w=majority');

const Employee = mongoose.model('employee', {
    schedule_id: { type: Schema.Types.ObjectId, ref: 'schedule' },
    name: String,
    color: String,
    requested_hours: Number
});

const Schedule = mongoose.model('schedule', {
    schedule_name: {type: String, unique: [true, "Schedule name already in use."]},
    user: {type: Schema.Types.ObjectId, ref: 'user', required: true},
    public: {type: Boolean, default: false}
});

const Week = mongoose.model('week', {
    week_name: String,
    schedule_id: { type: Schema.Types.ObjectId, ref: 'schedule' }
});

const Day = mongoose.model('day', {
    day_id: String,
    week_id: { type: Schema.Types.ObjectId, ref: 'week' },
    start_time: Number,
    end_time: Number
});

const Work = mongoose.model('work', {
    time_id: Number,
    day_id: String,
    week_id: { type: Schema.Types.ObjectId, ref: 'week' },
    employee_id: String
});

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "Please specify a first name"]
    },
    lastName: {
        type: String,
        required: [true, "Please specify a last name"]
    },
    email: {
        type: String,
        required: [true, "Please specify an email"],
        unique: true
    },
    encryptedPassword: {
        type: String,
        required: [true, "Please specify a password"]
    },
    access_level: {
        type: Number,
        default: 0
        
    }
})

userSchema.methods.setEncryptedPassword = function (passwordText) {
    // CREATE A PROMISE
    let promise = new Promise((resolve, reject) => {
        
        // bcrypt HASHING
        if (passwordText == "") {
            resolve();
        }
        bcrypt.hash(passwordText, 12).then((hash) => {
            this.encryptedPassword = hash;

            // RESOLVE PROMISE
            resolve();
        });
    });
    return promise;
};

userSchema.methods.verifyPassword = function (passwordText) {
    // CREATE A PROMISE
    let promise = new Promise((resolve, reject) => {

        // bcrypt HASHING
        bcrypt.compare(passwordText, this.encryptedPassword).then((result) => {
        
            // RESOLVE PROMISE with parameter
            resolve(result);
        });
    });
    return promise;
};

const User = mongoose.model("user", userSchema);


module.exports = {
    Employee: Employee,
    Schedule: Schedule,
    Week: Week,
    Day: Day,
    Work: Work,
    User: User
};