FROM ubuntu:latest

WORKDIR /yotify

RUN apt-get update && apt-get install -y curl python3 python3-pip python3-venv git

RUN apt install -y ffmpeg

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs

RUN python3 -m venv /yotify/venv && . /yotify/venv/bin/activate && deactivate

RUN /yotify/venv/bin/pip install spotdl

RUN /yotify/venv/bin/pip install git+https://zotify.xyz/zotify/zotify.git

# Make spotdl global
RUN ln -s /yotify/venv/bin/spotdl /usr/local/bin/spotdl

RUN ln -s /yotify/venv/bin/zotify /usr/local/bin/zotify

RUN node -v && npm -v && ffmpeg -version && python3 --version

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 80

CMD [ "zotify" ]