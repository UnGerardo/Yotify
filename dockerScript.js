const { execSync } = require('child_process');

const username = process.argv[2];
const version = process.argv[3];

if (!username || !version) {
  console.error('Username and Version args are required.');
  process.exit(1);
}

execSync(`docker build -t ${username}/yotify:${version} .`, { stdio: 'inherit' });
execSync(`docker push ${username}/yotify:${version}`, { stdio: 'inherit' });