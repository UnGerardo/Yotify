
const searchBtn = document.getElementById('searchBtn');

searchBtn.addEventListener('click', async () => {
  const response = await fetch('/spotToken');
  const data = await response.json();
  console.log(data);
});