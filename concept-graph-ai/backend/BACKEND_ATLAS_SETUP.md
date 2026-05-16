# MongoDB Atlas — Backend Setup

Steps to migrate from a local MongoDB/Compass setup to MongoDB Atlas and configure this project's backend.

1) Create an Atlas cluster
   - Sign in at https://cloud.mongodb.com and create a free or paid cluster.

2) Create a database user
   - In "Database Access" create a user with a strong password and give it the appropriate role (e.g., "Atlas DB User").

3) Network access
   - In "Network Access" add your IP address or use 0.0.0.0/0 for development (not recommended for production).

4) Get the connection string
   - In the Atlas cluster UI choose "Connect" → "Connect your application" and copy the connection string.
   - Replace `<username>` and `<password>` and the default DB name as needed. Example:

```
mongodb+srv://<username>:<password>@cluster0.abcd.mongodb.net/conceptgraph?retryWrites=true&w=majority
```

5) Store the connection string in the backend environment
   - Copy `.env.example` to `.env` in the `backend/` folder and paste your connection string into `MONGODB_URI`.
   - Example `.env` contents:

```
MONGODB_URI="mongodb+srv://myUser:mySecretPass@cluster0.abcd.mongodb.net/conceptgraph?retryWrites=true&w=majority"
PORT=5000
```

6) Restart the backend
   - The backend uses `dotenv` (already included). Start the server:

PowerShell:
```
cd concept-graph-ai/backend
npm run dev
```

7) Notes and best practices
   - Never commit `.env` to source control; add it to `.gitignore` if not already ignored.
   - For production deployments, set `MONGODB_URI` in your hosting platform's environment variables.
   - If you later enable Atlas Vector Search, you'll store embeddings in the same collections or in a dedicated collection and create the necessary search index in Atlas.
