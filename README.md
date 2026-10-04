# Nursery Management System

> **Status:** Portfolio edition of a university project

A full-stack nursery operations prototype built with React and Express. The application models day-to-day workflows for child records, attendance and occupancy, staff administration, finance, facilities, viewings, and Ofsted-related reporting.

All records included in this public repository are fictional demonstration data. The application is an educational prototype and must not be used to store real child, family, staff, medical, safeguarding, payroll, or DBS information.

## Features

- Role-based navigation for managers, room leaders, and practitioners
- Child records, guardians, bookings, funding, and fee calculations
- Staff profiles, rotas, leave, training, and compliance information
- Occupancy and capacity tracking
- Finance ledgers, outstanding balances, and reminders
- Facilities and maintenance records
- Nursery viewing enquiries and calendar export
- Ofsted-oriented operational reports
- Input validation and responsive dashboard views

## Technology

- React 19
- React Router
- Express 5
- Node.js
- REST APIs
- jsPDF
- Jest and React Testing Library

The current Express server stores demonstration data in memory. Data resets whenever the server restarts.

## Repository structure

```text
backend/server.js       Express API and synthetic seed data
public/                 Static web assets
src/components/         Shared navigation components
src/pages/              Operational dashboard modules
src/utils/              Validation helpers
```

## Run locally

Requirements: a supported Node.js and npm installation.

```bash
npm install
npm run server
```

In a second terminal:

```bash
npm start
```

The frontend runs at `http://localhost:3000` and the API at `http://localhost:5000`.

## Demo access

The sign-in screen provides manager, room leader, and practitioner demonstration roles. This is frontend role simulation for portfolio testing, not production authentication.

## Privacy and security

- Only synthetic `example.com` contact details and reserved demonstration phone numbers are included.
- Dependencies, build output, environment files, and secrets are excluded from version control.
- Do not enter real personal or special-category data.
- Production use would require secure authentication, authorisation enforced by the API, encrypted persistent storage, audit logging, retention controls, backups, and a formal data-protection review.

## Known limitations

- In-memory persistence only
- Demonstration role selection rather than secure authentication
- No production database or migrations
- Limited automated test coverage
- Local API URLs are currently configured in the frontend
- Several operational workflows require further accessibility and security testing

## Planned improvements

- Add an environment-based API configuration
- Introduce a relational database and migration scripts
- Enforce role permissions on the server
- Expand unit, integration, and accessibility tests
- Add architecture and database diagrams
- Document requirements, user stories, and test evidence

## Portfolio context

This project demonstrates requirements translation, operational workflow modelling, full-stack development, validation, and awareness of privacy obligations in a regulated childcare setting.
