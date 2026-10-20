// Сервер талд ч ашиглаж болох тогтмолууд.

export const APP_NAME = "AuToHub Admin";
export const THEME_KEY = "autohub:theme";
export const SIDEBAR_KEY = "autohub-admin:sidebar";

/** Хадгалсан цайвар горим харанхуй болж анивчихгүйн тулд <head>-д зурагдахаас өмнө ажиллана (apps/web-тэй ижил). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})()`;
