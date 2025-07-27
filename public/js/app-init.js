window.addEventListener('load', () => {
  const splashScreen = document.querySelector('.splash-screen');
  
  if (splashScreen) {
    setTimeout(() => {
      splashScreen.style.display = 'none';
    }, 3000);
  }
});