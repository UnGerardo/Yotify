# Yotify

This program is a web interface that allows a user to save Spotify track information.

## Table of contents
- [Yotify](#yotify)
  - [Table of contents](#table-of-contents)
  - [Manual Installation](#manual-installation)
  - [Use with Docker](#use-with-docker)
  - [Disclaimer](#disclaimer)
  - [License](#license)
  - [Usage Guidelines](#usage-guidelines)

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
   - Add a redirect URI of `http://127.0.0.1:3000/spotify/playlists`
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
   - Add a redirect URI of `http://127.0.0.1:3000/spotify/playlists`
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

## Disclaimer

This software is provided for educational and personal use only. Users are responsible for ensuring their use complies with the terms of service of the APIs and services they access. The developers of this software do not condone or support the use of this software for any illegal activities, including but not limited to piracy or unauthorized downloads of copyrighted material.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Usage Guidelines

- Use this software only for personal backups or offline access to content you have legally purchased or have the right to download.
- Do not use this software to distribute or share copyrighted material without proper authorization.
- Respect the terms of service of the APIs and services you interact with using this software.
