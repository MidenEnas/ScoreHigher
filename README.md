# Score Higher

A Node.js web application for managing climbing competitions with scoring for boulder and lead climbs.

## Local Development
1. Clone the repo
2. Run `npm install`
3. Run `node server.js`
4. Open http://localhost:3000

## Deployment on Hostinger
1. Upload the code to your Hostinger Node.js hosting.
2. Change `db.js` to use MySQL instead of SQLite:
   - Install `mysql2` if needed.
   - Update the connection to use environment variables: `process.env.DB_HOST`, etc.
3. Set environment variables in Hostinger for DB credentials.
4. Run the database schema on your MySQL database.
5. Start the app.

## Features
- Admin interface to create competitions
- Customizable point values
- Self-judged or judge-judged modes