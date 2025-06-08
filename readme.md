# Jobly (backend)

https://myron-chen-jobly-backend.onrender.com

https://github.com/myronchen-git/Springboard-SEC-Unit-41.2-React-Jobly-Backend

A student project that demonstrates use of Express.js and a PostgreSQL client.  
An API service for a job board website that allows creating, reading, updating, 
and deleting companies, jobs, and users.

## Overview

This basic backend provides an API to allow getting and filtering a list of 
companies and jobs.  Certain API requests are protected, such as creating and 
deleting companies, and are only allowed for admins, while other requests 
require users to be registered.  There is also a feature for users to apply to 
jobs.  JSON schemas are used to validate user inputs.

## Features

- User registration and sign-in.

- Lists companies and job openings.

  - Uses query parameters to filter by name, min employees, and max employees 
for companies; and title, min salary, whether there is equity for jobs.  Info 
for a specific company also shows the company's job openings.

- Admins can create users with a random password.
  
- Protects routes from unauthorized access.
 
  - Requires admin access or users to be registered for certain routes, else an 
unauthorized or forbidden error is returned.
  
- Matches users and job openings that share the same technologies.

  - Technologies, that are attached to jobs and users, can be used in an API
 endpoint to retrieve jobs that are only applicable to users.

## Tech Stack

### Backend

- Express
- node-postgres
- JSON Schema
- JSON web token
- Jest
- SuperTest

### Languages

- JavaScript
- HTML
- CSS
