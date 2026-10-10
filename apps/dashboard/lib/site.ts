// Server-safe constants.

export const APP_NAME = "AuToHub Admin";
export const THEME_KEY = "autohub:theme";
export const SIDEBAR_KEY = "autohub-admin:sidebar";

/** Runs in <head> before paint so a saved light theme doesn't flash dark (same as apps/web). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})()`;
