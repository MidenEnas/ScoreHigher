# Score Higher

A Node.js web application for managing climbing competitions with scoring for boulder and lead climbs.

## Local Development
1. Clone the repo
2. Run `npm install`
3. Set up a local MySQL database and update environment variables or db.js
4. Run `node server.js`
5. Open http://localhost:3000

## Deployment on Hostinger
1. Upload the code to your Hostinger Node.js hosting.
2. In Hostinger, create a MySQL database.
3. Set environment variables in Hostinger:
   - DB_HOST: Your MySQL host
   - DB_USER: Your MySQL username
   - DB_PASSWORD: Your MySQL password
   - DB_NAME: Your MySQL database name
4. The app will automatically create the tables on first run.
5. Start the app—it should work now.

## Features
- Admin interface to create competitions
- Customizable point values
- Self-judged or judge-judged modes