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

EXPOSE 80

CMD [ "node", "/app/server.js" ]