// TODO:
//      [ ] Update README
//      [ ] Add Register for Login Accounts
//      [ ] Add MUCH BETTER server-side validation. So much crashing can happen right now. ;-;
//      [ ] Add User-attached schedules
//      [ ] Delete non-User-attached schedules

//      [ ] Delete works that relate to an employee after deleting an employee
//      [ ] Select New Employee after they are created (AUTOMATICALLY!)
//      [ ] Use REGEX for checking if color is valid
//      [ ] Use REGEX for checking if email is valid
//      [ ] Overhaul colors_used system (persist through page reloads, allow a color to be chosen again if that employee is deleted, ...)
//      [ ] Create a 'ARE YOU SURE?' for deleting schedules/employees
//      [ ] Update schedule name on schedule save (new fetch for updating/PUTing schedule)

//      [ ] Availabilities
//      [ ] Extra weeks
//      [ ] 

const SERVER_ROOT_URL = "https://schedule-m.herokuapp.com";

DEFAULT_COLOR_OPTIONS = ["#253140", "#344F59", "#3B7302", "#590202", "#8C6A03", "#314035"]; // ADD OR REMOVE COLORS AS NEEDED - code handles that
DEFAULT_INDEX_USED = [];

var app = new Vue({
    el: '#app',
    data: {
        loaded: false,
        state: {},
        selectedSchedule: "------",

        // Login Data
        emailInput: "",
        passwordInput: "",
        user: {
            email: "",
        },
        loginErrors: {},

        firstNameInput: "",
        lastNameInput: "",
        registerErrors: {},

        // New Schedule Data
        newSchedule: {},
        openTimeOptions: ["12:00am","1:00am","2:00am","3:00am","4:00am","5:00am","6:00am","7:00am","8:00am","9:00am","10:00am","11:00am","12:00pm","1:00pm","2:00pm","3:00pm","4:00pm","5:00pm","6:00pm","7:00pm","8:00pm","9:00pm","10:00pm","11:00pm"],
        closeTimeOptions: ["1:00am","2:00am","3:00am","4:00am","5:00am","6:00am","7:00am","8:00am","9:00am","10:00am","11:00am","12:00pm","1:00pm","2:00pm","3:00pm","4:00pm","5:00pm","6:00pm","7:00pm","8:00pm","9:00pm","10:00pm","11:00pm","12:00am"],
        scheduleNameInputClasses: [],
        scheduleNameError: "",

        // Schedule Data
        schedules: [],
        weeks:  [],
        days: [],
        half_hours: [],
        works: {},
        rowHeaders: [],
        currentWeek: "",
        ownership: false,
        showSaveNotification: false,
        notificationStyle: {
            backgroundColor: "var(--gray)",
            color: "inherit"
        },
        showDeleteError: false,
        deleteErrorStyle: {
            color: ""
        },
        deleteErrorText: "",

        //Employee Data
        employees: [],
        newEmployee: {},
        currentEmployee: {
            _id: "",
            name: "------",
            color: "#------",
            reqHours: 0,
            totalHours: 0,
            validEmployeeSelected: false
        },
        selectedEmployee: "------",
        
        rows: 0,
        columns: 0,
        scheduleStyle: {}

    },
    methods: {
        
        // ======================= LOGIN FUNCTIONS =======================
        //#region
        attemptLogIn: function() {
            if (this.emailInput != "" && this.passwordInput != "") {
                // SUCCESS ON LOGGING IN
                this.fetchAttemptLogin();
            }
        },
        attemptRegister: function() {
            this.fetchAttemptRegister();
        },
        successfulLogin: function() {
            this.fetchSchedules((scheduleArray) => {
                this.schedules = [];
                scheduleArray.forEach((schedule) => {
                    this.schedules.push(schedule);
                });
                this.setStateToBlankSchedule();
                this.emailInput = "";
                this.passwordInput = "";
            });
        },
        //#endregion
        // ======================= NAVBAR FUNCTIONS =======================
        //#region
        createNewScheduleButton: function() {
            this.state.showBlankScheduleScreen = false;
            this.state.showNewScheduleForm = true;
            this.newSchedule = {
                week: {
                    Sunday: {name: "Sunday", selected: false},
                    Monday: {name: "Monday", selected: false},
                    Tuesday: {name: "Tuesday", selected: false},
                    Wednesday: {name: "Wednesday", selected: false},
                    Thursday: {name: "Thursday", selected: false},
                    Friday: {name: "Friday", selected: false},
                    Saturday: {name: "Saturday", selected: false},
                },
                openHour: "",
                closeHour: "",
                name: "",
                public: false
            };
        },
        loadScheduleButton: function () {
            this.schedules.forEach(schedule => {
                if (schedule.schedule_name == this.selectedSchedule || "public: " + schedule.schedule_name == this.selectedSchedule || "private: " + schedule.schedule_name == this.selectedSchedule) {
                    this.ownership = schedule.ownership;
                    this.setStateToLoadedSchedule(schedule._id);
                }
            });
        },
        deleteScheduleButton: function () {
            this.schedules.forEach((schedule) => {
                if (schedule.schedule_name == this.selectedSchedule || "public: " + schedule.schedule_name == this.selectedSchedule || "private: " + schedule.schedule_name == this.selectedSchedule) {
                    this.fetchDeleteSchedule(schedule, callback=(response) => {
                        let deleted = false;
                        if (response.status == 401) {
                            response.json().then(errorObject => {
                                if (errorObject.ownershipFault) {
                                    this.deleteErrorText = errorObject.errorText;
                                    this.showDeleteError = true;
                                    setTimeout(() => {
                                        this.deleteErrorStyle.color = "rgba(0,0,0,0)";
                                        setTimeout(() => {
                                            this.deleteErrorText = "";
                                            this.showDeleteError = false;
                                            this.deleteErrorStyle.color = "var(--invalid-red)";
                                        }, 1000);
                                    }, 2000)
                                    return;
                                } else {
                                    this.setStateToLogin();
                                }
                            }).catch((error) => {
                                console.log(error);
                                this.setStateToLogin();
                            });
                        } else if (response.status == 204) {
                            this.state.showSchedule = false;
                            this.state.showBlankScheduleScreen = true;
                            this.currentEmployee = {
                                _id: "",
                                name: "------",
                                color: "#------",
                                reqHours: 0,
                                totalHours: 0,
                                validEmployeeSelected: false
                            };
                            this.selectedEmployee = "------";
                            this.fetchSchedules();
                            this.state.validScheduleOption = false;
                            this.selectedSchedule = "------";
                        }
                    })
                }
            });
        },
        scheduleSelectionChange: function (event) {
            this.state.validScheduleOption = event.target.value != "------";
        },
        logOutButton: function () {
            // this.user.email = "";
            // this.setStateToLogin();
            this.fetchLogout();
        },
        //#endregion
        // ======================= NEW SCHEDULE FUNCTIONS =======================
        //#region
        checkBoxLabelClick: function(day) {
            day.selected = !day.selected;
        },
        finishCreateButton: function () {
            if (!this.canCreateNewSchedule) {
                return;
            }
            this.fetchPostSchedule(this.newSchedule,
                callback=(response) => {
                    if (response.status == 401) {
                        this.setStateToLogin();
                    }
                    if (response.status != 201) {
                        response.json().then(parsed => {
                            this.scheduleNameInputClasses.push("invalid");
                            this.scheduleNameError = parsed[0];
                        })
                    } else {
                        response.json().then((parsed_response) => {
                            this.scheduleNameInputClasses = [];
                            this.scheduleNameError = "";
                            this.fetchSchedules((scheduleArray) => {
                                this.schedules = [];
                                scheduleArray.forEach((schedule) => {
                                    this.schedules.push(schedule);
                                });
                                let prefix = "";
                                if (this.newSchedule.public) {
                                    prefix = "public: ";
                                } else {
                                    prefix = "private: ";
                                }
                                this.selectedSchedule = prefix + this.newSchedule.name;
                                this.newSchedule = {};
                                this.setStateToLoadedSchedule(parsed_response._id);    
                            });
                        });
                    }
                }
            );
        },
        exitForm: function () {
            if (this.state.showNewScheduleForm) {
                this.state.showNewScheduleForm = false;
                if (!this.state.showSchedule) {
                    this.state.showBlankScheduleScreen = true;
                }
                this.scheduleNameInputClasses = [];
                this.scheduleNameError = "";
                this.newSchedule = {};
            } else if (this.state.showEmployeeForm) {
                this.state.showEmployeeForm = false;
                this.newEmployee = false;
            }
        },
        //#endregion
        // ======================= SCHEDULE FUNCTIONS =======================
        // #region
        updateWorkOnClickDown: function (half_hour, event) {
            if (!this.ownership) return;
            if (event.button == 0) {
                // Left click
                this.leftButtonIsDown = true;
                this.updateWorkOnHover(half_hour);
            } else if (event.button == 2) {
                // Right click
                this.rightButtonIsDown = true;
                this.updateWorkOnHover(half_hour);
            }
            this.$forceUpdate();
        },
        updateWorkOnClickUp: function (event) {
            if (!this.ownership) return;
            if (event.button == 0) {
                // Left click
                this.leftButtonIsDown = false;
            } else if (event.button == 2) {
                // Right click
                this.rightButtonIsDown = false;
            }
            this.$forceUpdate();
        },
        updateWorkOnHover: function (half_hour) {
            if (!this.ownership) return;
            if (this.leftButtonIsDown) {
                if (!this.works[half_hour.ID] || this.works[half_hour.ID].employee_id != "REMOVE HOUR") {
                    this.works[half_hour.ID] = {
                        time_id: half_hour.time_id,
                        day_id: half_hour.day_id,
                        week_id: half_hour.week_id,
                        employee_id: this.currentEmployee._id
                    };
                    this.updateTotalHours();
                    this.$forceUpdate();
                }
            } else if (this.rightButtonIsDown) {
                if (this.works[half_hour.ID]) {
                    if (this.works[half_hour.ID].employee_id == "REMOVE HOUR") {
                        if (this.currentEmployee._id == "REMOVE HOUR") {
                            delete this.works[half_hour.ID];
                            this.updateTotalHours();
                            this.$forceUpdate();
                        }
                    } else {
                        delete this.works[half_hour.ID];
                        this.updateTotalHours();
                        this.$forceUpdate();
                    }
                }
            }
        },
        updateTotalHours: function () {
            let temp_map = {};
            this.employees.forEach(employee => {
                employee.total_hours = 0;
                temp_map[employee._id] = employee;
            });
            this.currentEmployee.totalHours = 0;
            Object.values(this.works).forEach(work => {
                if (temp_map[work.employee_id]) {
                    temp_map[work.employee_id].total_hours += .5;
                    if (this.currentEmployee._id == work.employee_id) {
                        this.currentEmployee.totalHours += .5;
                    }
                }
            });
        },
        getHalfHourStyle: function (half_hour) {
            let style = {
                backgroundColor: ""
            };
            if (!!this.works[half_hour.ID]) {
                let work = this.works[half_hour.ID];
                let employee = this.findEmployeeFromEmployeeID([work["employee_id"]]);
                if (!!employee) {
                    style["backgroundColor"] = employee["color"];
                } else {
                    style["backgroundColor"] = "var(--dark_gray)";
                }
            } else {
                style["backgroundColor"] = "var(--dark_gray)";
            }
            return style;
        },
        isHalfHourRemoved: function (half_hour) {
            if (!!this.works[half_hour.ID]) {
                return (this.works[half_hour.ID]["employee_id"] == "REMOVE HOUR");
            }
            return false;
        },
        getEmployeeName: function (half_hour) {
            if (!!this.works[half_hour.ID]) {
                let work = this.works[half_hour.ID];
                let employee = this.findEmployeeFromEmployeeID([work["employee_id"]]);
                if (!!employee) {
                    return employee["name"];
                } else {
                    return "";
                }
            } else {
                return "";
            }
        },
        onScheduleSaveClick: function () {
            if (!this.ownership) return;
            this.fetchPostWorks(this.currentWeek);
            // this.fetchPostDays(this.currentWeek);
        },
        // #endregion
        // ======================= INITIALIZE DATA FUNCTIONS ======================= 
        //#region        
        initializeHalfHours: function() {
            this.half_hours = [];
            Object.values(this.days).forEach((day) => {
                for (var time_id = day["start_time"]; time_id < day["end_time"]; time_id+= 100) {
                    this.half_hours.push({"time_id" : time_id, "day_id" : day["day_id"], "week_id" : day["week_id"], "ID": String(time_id)+"-"+day["day_id"]+"-"+day["week_id"]})
                    this.half_hours.push({"time_id" : time_id+30, "day_id" : day["day_id"], "week_id" : day["week_id"], "ID": String(time_id+30)+"-"+day["day_id"]+"-"+day["week_id"]})
                    this.rows += 1;
                }
                this.columns += 1;
            });
            this.scheduleStyle = {};
            this.scheduleStyle["grid-template-columns"] = ".8fr " + "repeat(1fr, " + String(this.columns) + ");";
            this.scheduleStyle["grid-template-rows"] = "max-content " + "repeat(1fr, " + String(this.rows) + ");";
        },
        initializeHeaders: function (earliest_open, latest_close) {
            let i = 0;
            this.rowHeaders = [];
            for (var time_id = earliest_open; time_id < latest_close; time_id+= 100) {
                rowStart = String(i + 2);
                row2Start = String(i + 3);
                rowEnd = String(i + 3);
                row2End = String(i + 4);
                this.rowHeaders.push({
                    "value" : time_id, 
                    "display" : ConvertMilitaryIntToStandardTimeString(time_id), 
                    "style": "grid-row: " + rowStart + " / " + rowEnd
                });
                this.rowHeaders.push({
                    "value" : time_id + 30,
                    "display" : ConvertMilitaryIntToStandardTimeString(time_id + 30), 
                    "style": "grid-row: " + row2Start + " / " + row2End
                });
                i += 2;
            }
        },
        getDayName: function(day) {
            id_to_name = {
                "sun" : "Sunday",
                "mon" : "Monday",
                "tue" : "Tuesday",
                "wed" : "Wednesday",
                "thur" : "Thursday",
                "fri" : "Friday",
                "sat" : "Saturday"
            };
            return id_to_name[day["day_id"]];
        },
        //#endregion
        // ======================= EMPLOYEE FUNCTIONS =======================
        //#region
        createNewEmployeeClick: function () {
            this.state.showEmployeeForm = true;
            this.newEmployee = {
                name: "",
                color: "",
                reqHours: "",
                new: true
            };
        },
        editEmployeeClick: function () {
            this.state.showEmployeeForm = true;
            this.newEmployee = {
                name: this.currentEmployee.name,
                color: this.currentEmployee.color,
                reqHours: this.currentEmployee.reqHours,
                _id: this.currentEmployee._id,
                new: false
            };
        },
        deleteEmployeeClick: function () {
            let employee_id = "";
            for(let i = 0; i < this.employees.length; i++) {
                if (this.employees[i].name == this.selectedEmployee) {
                    employee_id = this.employees[i]._id;
                    break;
                }
            }
            if (!!employee_id) {
                this.fetchDeleteEmployee(this.state.loadedSchedule, employee_id);
            } else {
                console.error("Unable to delete Employee!", employee_id, this.selectedEmployee);
            }
        },
        saveEmployeeClick: function () {
            if (this.newEmployee.new) {
                let schedule_id = this.state.loadedSchedule;
                if (!schedule_id) {
                    console.error("Invalid scheduleID when saving new employee.", schedule_id);
                } else {
                    this.fetchPostEmployee(schedule_id);
                }
            } else {
                let schedule_id = this.state.loadedSchedule;
                if (!schedule_id) {
                    console.error("Invalid scheduleID when updating employee.", schedule_id);
                } else {
                    this.fetchUpdateEmployee(schedule_id);
                }
            }
        },
        employeeSelectionChange: function (event) {
            this.currentEmployee.validEmployeeSelected = event.target.value != "------";
            if (this.currentEmployee.validEmployeeSelected) {
                if (event.target.value == "REMOVE HOUR") {
                    this.currentEmployee = {
                        _id: "REMOVE HOUR",
                        name: "REMOVE HOUR",
                        color: "#------",
                        reqHours: 0,
                        totalHours: 0,
                    };
                } else {
                    for(let i = 0; i < this.employees.length; i++) {
                        employee = this.employees[i];
                        if (employee._id == this.getSelectedEmployeeID()) {
                            this.currentEmployee._id = employee._id;
                            this.currentEmployee.name = employee.name;
                            this.currentEmployee.color = employee.color;
                            this.currentEmployee.reqHours = employee.requested_hours;
                            this.currentEmployee.totalHours = employee.total_hours;
                        }
                    }
                }
            } else {
                this.currentEmployee = {
                    _id: "",
                    name: "------",
                    color: "#------",
                    reqHours: 0,
                    totalHours: 0,
                };
            }
        },
        findEmployeeFromEmployeeID: function (employee_id) {
            for (let i = 0; i < this.employees.length; i++) {
                if (employee_id == this.employees[i]._id) {
                    return this.employees[i];
                }
            }
            return null;
        },
        //#endregion
        // ======================= SET STATE FUNCTIONS =======================
        //#region
        setStateToLogin: function () {
            this.state = {
                showLoginScreen: true,
                showRegisterForm: false,
                showBlankScheduleScreen: false,
                showNewScheduleForm: false,
                showEmployeeForm: false,
                showSchedule: false,
    
                validScheduleOption: false,
            };
            setTimeout(() => {
                this.loaded = true;                
            }, 100);
            this.passwordInput = "";
            this.emailInput = "";
            this.firstNameInput = "";
            this.lastNameInput = "";
            this.loginErrors = {};
        },
        setStateToRegister: function () {
            this.state = {
                showLoginScreen: true,
                showRegisterForm: true,
                showBlankScheduleScreen: false,
                showNewScheduleForm: false,
                showEmployeeForm: false,
                showSchedule: false,
    
                validScheduleOption: false,
            };
            this.passwordInput = "";
            this.emailInput = "";
            this.firstNameInput = "";
            this.lastNameInput = "";
            this.registerErrors = {};
        },
        setStateToBlankSchedule: function () {
            this.state = {
                showLoginScreen: false,
                showRegisterForm: false,
                showBlankScheduleScreen: true,
                showNewScheduleForm: false,
                showEmployeeForm: false,
                showSchedule: false,
    
                validScheduleOption: false,
            };
            this.selectedSchedule = "------";
            setTimeout(() => {
                this.loaded = true;                
            }, 100);
        },
        setStateToLoadedSchedule: async function (schedule_id) {
            await this.fetchAllScheduleInformation(schedule_id);
            let schedule_name = "";
            for(let i = 0; i < this.schedules.length; i++) {
                if (schedule_id == this.schedules[i]._id) {
                    schedule_name = this.schedules[i].schedule_name;
                }
            }
            this.state = {
                showLoginScreen: false,
                showRegisterForm: false,
                showBlankScheduleScreen: false,
                showNewScheduleForm: false,
                showEmployeeForm: false,
                showSchedule: true,
    
                loadedSchedule: schedule_id,
                loadedScheduleName: schedule_name,
                validScheduleOption: true
            };
        },
        //#endregion
        // ======================= DATA HANDLING FUNCTIONS =======================
        //#region
        clearLoadedData: function () {
            this.employees = {};
            this.schedules = {};
            this.weeks = {};
            this.days = {};
            this.half_hours = [];
            this.works = {};
        },
        getSelectedEmployeeID: function () {
            for(let i = 0; i < this.employees.length; i++) {
                employee = this.employees[i];
                if (employee.name == this.selectedEmployee) {
                    return employee._id;
                }
            }
        },
        getPrivateOrPublicText: function (schedule) {
            if (schedule["public"]) {
                return "public: ";
            } else {
                return "private: ";
            }
        },
        //#endregion
        // ======================= FETCH FUNCTIONS =======================
        //#region
        fetchAttemptLogin: function () {
            fetch(SERVER_ROOT_URL + "/session", {
                method: "POST",
                body: "passwordText=" + encodeURIComponent(this.passwordInput) + "&email=" + encodeURIComponent(this.emailInput),
                credentials: "include",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then((response) => {
                if (response.status == 201) {
                    this.user.email = this.emailInput;
                    this.successfulLogin();
                } else {
                    this.passwordInput = "";
                    this.loginErrors["unauthorized"] = "Incorrect Email and/or Password";
                    this.$forceUpdate();
                }
            }).catch((error) => {
                console.log(error)
            });
        },
        fetchLogout: function () {
            fetch(SERVER_ROOT_URL + "/session", {
                method: "DELETE",
                credentials: "include"
            }).then((response) => {
                if (response.status == 204) {
                    this.user.email = "";
                    this.setStateToLogin();
                } else {
                    console.error("Error Logging out", response);
                }
            }).catch((error) => {
                console.log(error)
            });
        },
        fetchAttemptRegister: function () {
            data = "lastName=" + encodeURIComponent(this.lastNameInput) + "&email=" + encodeURIComponent(this.emailInput) + "&firstName=" + encodeURIComponent(this.firstNameInput) + "&passwordText=" + encodeURIComponent(this.passwordInput);
            fetch(SERVER_ROOT_URL + "/users", {
                method: "POST",
                body: data,
                credentials: "include",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then((response) => {
                this.registerErrors = [];
                if (response.status == 201) {
                    // this.user.email = this.emailInput;
                    this.setStateToLogin();
                } else if (response.status == 422) {
                    response.json().then((parsed) => {
                        this.registerErrors = parsed;
                    });
                }
            }).catch((error) => {
                console.log(error)
            });
        },
        fetchUserSession: function () {
            fetch(SERVER_ROOT_URL + "/session", {credentials: "include"}).then((response) => {
                if (response.status == 401) {
                    this.setStateToLogin();
                } else {
                    response.json().then((user) => {
                        if (user) {
                            this.user.email = user.email;
                            this.successfulLogin();
                        } else {
                            console.error("error with user", user, response);
                        }
                    });                    
                }
            });
        },
        fetchSchedules: function (callback=(scheduleArray)=>{this.schedules = [];scheduleArray.forEach((schedule) => {this.schedules.push(schedule);});}) {
            fetch(SERVER_ROOT_URL + "/schedules", {credentials: "include"}).then((response) => {
                if (response.status == 401) {
                    this.setStateToLogin();
                }
                response.json().then(callback)
            }).catch(error => {
                console.log("fetch schedules error", error)
            });
        },
        fetchPostSchedule: function (schedule, callback=(response)=>{
            if (response.status == 401) {
                this.setStateToLogin();
            }
            console.log("Post : Default Callback", response);
        }) {
            data = "schedule=" + encodeURIComponent(schedule.name)
                   + "&sun=" + encodeURIComponent(schedule.week.Sunday.selected)
                   + "&mon=" + encodeURIComponent(schedule.week.Monday.selected)
                   + "&tue=" + encodeURIComponent(schedule.week.Tuesday.selected)
                   + "&wed=" + encodeURIComponent(schedule.week.Wednesday.selected)
                   + "&thur=" + encodeURIComponent(schedule.week.Thursday.selected)
                   + "&fri=" + encodeURIComponent(schedule.week.Friday.selected)
                   + "&sat=" + encodeURIComponent(schedule.week.Saturday.selected)
                   + "&open=" + encodeURIComponent(ConvertStandardTimeStringToMilitaryInt(schedule.openHour))
                   + "&close=" + encodeURIComponent(ConvertStandardTimeStringToMilitaryInt(schedule.closeHour, true))
                   + "&public=" + encodeURIComponent(schedule.public);
            fetch(SERVER_ROOT_URL + "/schedules", {
                method: "POST",
                body: data,
                credentials: "include",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
            }).then(callback)
        },
        fetchDeleteSchedule: function (schedule, callback=(response)=>{
            if (response.status == 401) {
                response.json().then(errorObject => {
                    console.log(errorObject);
                    if (errorObject.ownershipFault) {
                        console.log(errorObject.errorText);
                    } else {
                        this.setStateToLogin();
                    }
                }).catch((error) => {
                    console.log(error);
                    this.setStateToLogin();
                });
            }
            console.log("Delete : Default Callback", response);
        }) {
            fetch(SERVER_ROOT_URL + "/schedules/" + String(schedule._id), {
                method: "DELETE",
                credentials: "include"
            }).then(callback);
        },
        fetchAllScheduleInformation: function (schedule_id, callback=(response)=>{
            if (response.status == 401) {
                this.setStateToLogin();
            } else if (response.status == 200) {
                response.json().then((responseObject) => {
                    this.weeks = responseObject.weeks;
                    this.currentWeek = this.weeks[0]["_id"];
                    this.days = sortDays(responseObject.days);
                    this.employees = responseObject.employees;
                    this.works = {};
                    responseObject.works.forEach(work => {
                        this.works[work.time_id + '-' + work.day_id + '-' + work.week_id] = work;
                    });
                    earliest_start_time = getEarliest(this.days);
                    latest_end_time = getLatest(this.days);
                    this.initializeHeaders(earliest_start_time, latest_end_time);
                    this.initializeHalfHours();
                    this.updateTotalHours();
                });
            }
        }) {
            fetch(SERVER_ROOT_URL + "/schedules/" + String(schedule_id), {credentials: "include"}).then(callback);
        },
        fetchEmployees: function (schedule_id, callback=(response) => {
            if (response.status == 401) {
                this.setStateToLogin();
            }
            response.json().then((responseObject) => {
                this.employees = responseObject;
                this.state.showEmployeeForm = false;
                this.currentEmployee = {
                    _id: "",
                    name: "------",
                    color: "#------",
                    reqHours: 0,
                    totalHours: 0,
                    validEmployeeSelected: false
                };
                this.updateTotalHours();
            });
        }) {
            fetch(SERVER_ROOT_URL + "/schedules/" + String(schedule_id) + "/employees", {credentials: "include"}).then(callback);
        },
        fetchPostEmployee: function (schedule_id, callback=(response) => {
            if (response.status == 401) {
                this.setStateToLogin();
            }
            response.json().then((responseObject) => {
                if (response.status == 422) {
                    console.error("unable to create employee", responseObject);
                } else {
                    this.selectedEmployee = "------";
                    this.newEmployee = {};
                    this.fetchEmployees(schedule_id);
                }
            });
        }) {
            if (!this.newEmployee.color) { // DEFAULT COLOR? 
                let can_use_index = false;
                let random_index = -1;
                while (!can_use_index) { // Generate unused index
                    random_index = Math.floor(Math.random() * DEFAULT_COLOR_OPTIONS.length);
                    can_use_index = true;
                    for(let i = 0; i < DEFAULT_INDEX_USED.length; i++) {
                        if (random_index == DEFAULT_INDEX_USED[i]) {
                            can_use_index = false;
                        }
                    }
                }
                this.newEmployee.color = DEFAULT_COLOR_OPTIONS[random_index];
                DEFAULT_INDEX_USED.push(random_index);
                if (DEFAULT_INDEX_USED.length == DEFAULT_COLOR_OPTIONS.length) {
                    DEFAULT_INDEX_USED = [];
                }
            } 
            data = "name=" + encodeURIComponent(this.newEmployee.name) + "&color=" + encodeURIComponent(this.newEmployee.color) + "&reqHours=" + encodeURIComponent(this.newEmployee.reqHours);
            fetch(SERVER_ROOT_URL + "/schedules/" + String(schedule_id) + "/employees", {
                method: "POST",
                body: data,
                credentials: "include",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
            }).then(callback);
        },
        fetchUpdateEmployee: function (schedule_id, callback=(response) => {
            if (response.status == 401) {
                this.setStateToLogin();
            }
            response.json().then((responseObject) => {
                if (response.status == 422) {
                    console.error("unable to update employee", responseObject);
                } else {
                    this.selectedEmployee = "------";
                    this.newEmployee = {};
                    this.fetchEmployees(schedule_id);
                }
            });
        }) {
            data = "name=" + encodeURIComponent(this.newEmployee.name) + "&color=" + encodeURIComponent(this.newEmployee.color) + "&reqHours=" + encodeURIComponent(this.newEmployee.reqHours);
            fetch(SERVER_ROOT_URL + "/schedules/" + String(schedule_id) + "/employees/" + String(this.newEmployee._id), {
                method: "PUT",
                body: data,
                credentials: "include",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
            }).then(callback);
        },
        fetchDeleteEmployee: function (schedule_id, employee_id, callback=(response) => {
            if (response.status == 401) {
                response.json().then(errorObject => {
                    console.log(errorObject);
                    if (errorObject.ownershipFault) {
                        console.log(errorObject.errorText);
                    } else {
                        this.setStateToLogin();
                    }
                }).catch((error) => {
                    console.log(error);
                    this.setStateToLogin();
                });
            }
            response.json().then((responseObject) => {
                if (response.status == 500) {
                    console.error("unable to delete employee", responseObject);
                } else {
                    this.selectedEmployee = "------";
                    this.currentEmployee = {
                        _id: "",
                        name: "------",
                        color: "#------",
                        reqHours: 0,
                        totalHours: 0,
                        validEmployeeSelected: false
                    };
                    this.fetchEmployees(schedule_id);
                }
            });
        }) {
            fetch(SERVER_ROOT_URL + "/schedules/" + String(schedule_id) + "/employees/" + String(employee_id), {
                method: "DELETE",
                credentials: "include"
            }).then(callback);
        },
        fetchPostWorks: function (week_id, callback=(response) => {
            if (response.status == 401) {
                this.setStateToLogin();
            }
            response.json().then((responseObject) => {
                if (response.status == 500) {
                    console.error("unable to update works", responseObject);
                } else {
                    this.fetchGetWorks(week_id);
                }
            });
        }) {
            let works = [];
            for (let i = 0; i < Object.values(this.works).length; i++) {
                if (Object.values(this.works)[i].week_id == week_id) {
                    works.push(Object.values(this.works)[i]);
                }
            }
            var data = JSON.stringify({ works : works });
            var head = { "Accept" : "application/json", "Content-Type" : "application/json" };
            fetch(SERVER_ROOT_URL + "/weeks/" + String(week_id) + "/works", { method: "POST", credentials: "include",
            headers: head, body: data }).then(callback);
        },
        fetchPostDays: function (week_id, callback=(response) => {
            if (response.status == 401) {
                this.setStateToLogin();
            }
            response.json().then((responseObject) => {
                if (response.status == 500) {
                    console.error("unable to update days", responseObject);
                } else {
                    this.fetchGetDays(week_id);
                }
            });
        }) {
            let days = [];
            for (let i = 0; i < this.days.length; i++) {
                if (this.days[i].week_id == week_id) {
                    days.push(this.days[i]);
                }
            }
            var data = JSON.stringify({ days : days });
            var head = { "Content-Type" : "application/json" };
            fetch(SERVER_ROOT_URL + "/weeks/" + String(week_id) + "/days", { method: "POST", credentials: "include",
            headers: head, body: data }).then(callback);
        },
        fetchGetWorks: function (week_id, callback=(response) => {
            if (response.status == 401) {
                this.setStateToLogin();
            }
            response.json().then((responseObject) => {
                if (response.status == 500) {
                    console.error("unable to get works", responseObject);
                } else {
                    responseObject.forEach(work => {
                        this.works[work.time_id + '-' + work.day_id + '-' + work.week_id] = work;
                    });
                    this.showSaveNotification = true;
                    this.$forceUpdate();
                    setTimeout(() => {
                        this.notificationStyle.backgroundColor = "rgba(0,0,0,0)";
                        this.notificationStyle.color = "rgba(0,0,0,0)";
                        setTimeout(() => {
                            this.showSaveNotification = false;
                            this.notificationStyle.backgroundColor = "var(--gray)"
                            this.notificationStyle.color = "inherit";
                        }, 1000);
                    }, 2000)
                }
            });
        }) {
            fetch(SERVER_ROOT_URL + "/weeks/" + String(week_id) + "/works", { credentials: "include" }).then(callback);
        },
        fetchGetDays: function (week_id, callback=(response) => {
            if (response.status == 401) {
                this.setStateToLogin();
            }
            response.json().then((responseObject) => {
                if (response.status == 500) {
                    console.error("unable to get days", responseObject);
                } else {
                    this.days = responseObject;
                }
            });
        }) {
            fetch(SERVER_ROOT_URL + "/weeks/" + String(week_id) + "/days", { credentials: "include" }).then(callback);
        },
        //#endregion
    },
    computed: {
        canCreateNewSchedule: function() {
            isDaySelected = false;
            try {
                Object.keys(this.newSchedule.week).forEach((day_key) =>{
                    if (this.newSchedule.week[day_key].selected) {
                        isDaySelected = true;
                    }
                });
                isHoursValid = false;    
            } catch (error) {
                return false;
            }
            try {
                isHoursValid = ConvertStandardTimeStringToMilitaryInt(this.newSchedule.openHour) < ConvertStandardTimeStringToMilitaryInt(this.newSchedule.closeHour, true);
            } catch (error) {
                console.error(error);
            }
            nameValid = isScheduleNameValid(this.newSchedule.name);
            return isDaySelected && isHoursValid && nameValid;
        },
        getSelectedSchedule: function() {
            return_schedule = {}
            this.schedules.forEach((schedule) => {
                if (schedule["schedule_name"] == this.selectedSchedule) {
                    return_schedule = schedule;
                }
            });
            return return_schedule;
        }
    },
    created: function () {
        this.fetchUserSession();
    }
});


// ======================= HELPER FUNCTIONS =======================
// #region
// 10:00am -> 1000
function ConvertStandardTimeStringToMilitaryInt (sTime, closing=false) {
    am_or_pm = sTime.slice(-2);
    sHour = parseInt(sTime.split(":")[0]);
    sMinute = parseInt(sTime.slice(-4,-2));
    if (sHour == 12) {
        if (am_or_pm == "am") {
            if (closing) {
                return 2400 + sMinute;
            }
            return 0 + sMinute;
        } else {
            return 1200 + sMinute;
        }
    } else {
        if (am_or_pm == "am") {
            return sHour*100 + sMinute;
        } else {
            return (sHour + 12)*100 + sMinute;
        }
    }
}

// 1000 -> 10:00am
function ConvertMilitaryIntToStandardTimeString (mTime) {
    let mTimeIndex = Math.floor(mTime / 100);
    let am_or_pm = "am";
    if (Math.floor(mTimeIndex / 12) > 0) {
        am_or_pm = "pm";
    }
    if (mTime - mTimeIndex * 100 == 30) {
        if (mTimeIndex == 0) {
            return "12:30am";
        } else {
            let mHour = String(mTimeIndex % 13 + Math.floor(mTimeIndex / 13));
            return mHour + ":30" + am_or_pm
        }
    } else {
        if (mTimeIndex == 0) {
            return "12:00am";
        } else {
            let mHour = String(mTimeIndex % 13 + Math.floor(mTimeIndex / 13));
            return mHour + ":00" + am_or_pm
        }
    }
}

function isScheduleNameValid(name) {
    if (name.length < 1) {
        return false;
    }
    validCharacters = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890";
    for (var i = 0; i < name.length; i++) {
        valid = false;
        for (var j = 0; j < validCharacters.length; j++) {
            if ((name[i] == validCharacters[j])) {
                valid = true;
                break;
            }
        }
        if (!valid) {
            return false;
        }
    }
    return true;
}

function getEarliest(days) {
    let earliest = 2400;
    for(let i in days) {
        if (days[i].start_time < earliest && days[i].start_time != days[i].end_time) {
            earliest = days[i].start_time;
        }
    }
    return earliest;
}

function getLatest(days) {
    let latest = 0;
    for(let i in days) {
        if (days[i].end_time > latest && days[i].start_time != days[i].end_time) {
            latest = days[i].end_time;
        }
    }
    return latest;
}

function sortDays(days) {
    let id_to_number = {
        "sun" : 0,
        "mon" : 1,
        "tue" : 2,
        "wed" : 3,
        "thur": 4,
        "fri" : 5,
        "sat" : 6
    };
    let dayHolder = {};
    days.forEach(day => {
        dayHolder[id_to_number[day['day_id']]] = day;
    });
    let daysSorted = [];
    for (let i = 0; i < 7; i++) {
        if (!!dayHolder[i]) {
            daysSorted.push(dayHolder[i]);
        }
    }
    return daysSorted;
}

// #endregion