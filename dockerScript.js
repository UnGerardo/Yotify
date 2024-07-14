const { execSync } = require('child_process');

const name = process.argv[2];
const version = process.argv[3];

if (!name || !version) {
  console.error('Name and Version args are required.');
  process.exit(1);
}

execSync(`docker build -t ${name}/yotify:${version} .`, { stdio: 'inherit' });
execSync(`docker push ${name}/yotify:${version}`, { stdio: 'inherit' });