# MediaSaver

This project is a server that uses the Spotify API to display tracks and allows users to authenticate with Spotify to retrieve their liked songs and playlists. It uses spotdl to download tracks.

# Set up

- Python to install spotdl (ensure spotdl can be run globally)
- ffmpeg to handle audio formats
- NodeJS to run the server
- Create a Spotify API app to get a CLIENT_ID and CLIENT_SECRET values
- Create a .env file with the following values
  - CLIENT_ID=0000000
  - CLIENT_SECRET=000000
  - REDIRECT_URI=http://127.0.0.1:3000/getUserTracks
  - MUSIC_ROOT_PATH=Music
  - PLAYLIST_DATA_PATH=PlaylistData
  - LOG_PATH=Log
  - TRACK_FORMAT=mp3
  - TRACK_OUTPUT={artist}/{artist} - {title}.{output-ext}
- Run 'npm install'
- Run the server with 'node ./server.js'