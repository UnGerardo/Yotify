# Yotify

This program is a web interface that allows a user to save Spotify track information.

## Table of contents
- [Yotify](#yotify)
  - [Table of contents](#table-of-contents)
  - [Manual Installation](#manual-installation)
  - [Use with Docker](#use-with-docker)

## Manual Installation

1. Clone the Repo
   ```sh
   git clone https://github.com/UnGerardo/Yotify.git
2. Install Programs
   - Python 3.9+
     - Spotdl: `pip install spotdl`
   - FFmpeg
   - Node.js 22.0.0+
3. Get Spotify Credentials
   - Create a new [Spotify app](https://developer.spotify.com/)
   - Add a redirect URI of `http://127.0.0.1:3000/getUserTracks`
   - Under 'Which API/SDKs' are you planning to use?', select 'Web API'
   - Go to the app settings and get Client ID and Client Secret values
   - To allow other users to use the app, go to 'User Management' and add their email
4. Create `.env` file
   - Rename `EXAMPLE.env` to `.env`
   - Fill in Client ID and Client Secret values
   - Modify other values if desired (note: if REDIRECT_URI is changed, add it to the app in Spotify dashboard)
5. Install Node.js Dependencies
   - `cd` into the code directory and run `npm i`
6. Run Server
   - Run the server with `node ./server.js`
   - Visit [http://127.0.0.1:3000/](http://127.0.0.1:3000/)

## Use with Docker

1. Install Docker on your device
2. Get Spotify Credentials
   - Create a new [Spotify app](https://developer.spotify.com/)
   - Add a redirect URI of `http://127.0.0.1:3000/getUserTracks`
   - Under 'Which API/SDKs' are you planning to use?', select 'Web API'
   - Go to the app settings and get Client ID and Client Secret values
   - To allow other users to use the app, go to 'User Management' and add their email
3. Copy the `docker-compose.yml` file
   - Adjust paths under `volumes` if you want the data Yotify generates to persist, remove otherwise
   - Fill in Client ID and Client Secret values
   - Modify other values if desired (note: if REDIRECT_URI is changed, add it to the app in Spotify dashboard)
4. Start a container
   - Create and run the program with `docker compose up`
   - Visit [http://127.0.0.1:3000/](http://127.0.0.1:3000/)