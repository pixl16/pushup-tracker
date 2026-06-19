// Loads the app logic from the last known-good monolithic build.
// This keeps the split-file structure working while the large app script is moved safely.
function hideSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.style.opacity = '0';
  setTimeout(() => {
    splash.style.visibility = 'hidden';
    splash.style.display = 'none';
  }, 600);
}

(async function loadPushAppLogic() {
  const sourceUrl = 'https://raw.githubusercontent.com/pixl16/pushup-tracker/1c7ab8f2f4568c9bdff1cb35f798cced51f8e197/index.html';

  try {
    const response = await fetch(sourceUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to load app source: ${response.status}`);

    const html = await response.text();
    const scriptMatches = [...html.matchAll(/<script(?![^>]*type=["']module["'])[^>]*>([\s\S]*?)<\/script>/gi)];
    const appScript = scriptMatches
      .map(match => match[1])
      .find(script => script.includes('function addXP') && script.includes('const videoElement'));

    if (!appScript) throw new Error('App script not found in source build.');

    const scriptElement = document.createElement('script');
    scriptElement.textContent = appScript;
    document.body.appendChild(scriptElement);

    setTimeout(hideSplashScreen, 300);
    await import('./auth.js');
  } catch (error) {
    console.error(error);
    hideSplashScreen();
    const statusText = document.getElementById('statusText');
    if (statusText) statusText.innerText = 'App failed to load. Please refresh.';
  }
})();
