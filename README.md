# Schedule Master

WEBSITE URL (client and server): https://schedule-m.herokuapp.com/

Scheduling application which allows for flexible creation of week-based schedules.

## **Resources / Schemas**
--------------------------------
## *Employees*
* \_id (ObjectId)
* schedule_id (ObjectId -> 'Schedules')
* name (String)
* color (String)
* requested_hours (Number)

## *Schedules*
* \_id (ObjectId)
* schedule_name (String, unique)
* user (ObjectId -> 'Users')
* public: (Boolean)

## Weeks
* \_id (ObjectId)
* week_name (String)
* schedule_id (ObjectId -> 'Schedules')

## Days
* day_id (String)
* week_id (ObjectId -> 'Weeks')
* start_time (Number)
* end_time (Number)

## Works
* time_id (Number)
* day_id (String)
* week_id (ObjectId -> 'Weeks')
* employee_id (String)

## Users
* firstName (String)
* lastName (String)
* email (String)
* encryptedPassword (String)
* access_level (Number)

<br>
<br>

## **REST Endpoints**
--------------------------------
Name                                | Method | Path
------------------------------------|--------|------------------
Retrieve user session data          | GET    | /session
Retrieve schedules collection       | GET    | /schedules
Retrieve info about one schedule    | GET    | /schedules/schedule_id
Retrieve employees for one schedule | GET    | /schedules/schedule_id/employees
Retrieve days for a week            | GET    | /weeks/week_id/days
Retrieve works for a week           | GET    | /weeks/week_id/works
Create a session (logging in)       | POST   | /session
Create a schedule member            | POST   | /schedules
Create a employees member           | POST   | /schedules/schedule_id/employees
Create account for a user           | POST   | /users
Create multiple works members       | POST   | /weeks/week_id/works
Create mulitple days memebers       | POST   | /weeks/week_id/days
Update/replace employee member      | PUT    | /schedules/schedule_id/employees/employee_id
Delete user session (logging out)   | DELETE | /session
Delete schedule member and dependants | DELETE | /schedules/schedule_id
Delete employee member              | DELETE | /schedules/schedule_id/employees/employee_id
