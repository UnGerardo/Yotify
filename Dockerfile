FROM ubuntu:latest

WORKDIR /app

RUN apt-get update && apt-get install -y curl python3 python3-pip python3-venv

RUN apt install -y ffmpeg

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs

RUN python3 -m venv /app/venv && . /app/venv/bin/activate && deactivate

RUN /app/venv/bin/pip install spotdl

# Make spotdl global
RUN ln -s /app/venv/bin/spotdl /usr/local/bin/spotdl

RUN node -v && npm -v && ffmpeg -version && python3 --version

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=3000 \
    REDIRECT_URI=http://127.0.0.1:3000/getUserTracks \
    MUSIC_ROOT_PATH=Music \
    PLAYLIST_DATA_PATH=PlaylistData \
    LOG_PATH=Log \
    TRACK_FORMAT=mp3 \
    TRACK_OUTPUT='{artist}/{artist} - {title}.{output-ext}'

EXPOSE 3000

CMD [ "node", "/app/server.js" ]