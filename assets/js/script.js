const hamburger = document.getElementById('hamburger');
const menu      = document.getElementById('mobile-menu');

hamburger.addEventListener('click', () => {
  menu.classList.toggle('active');
});