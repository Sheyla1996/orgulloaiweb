// Importa y configura la app de Firebase en tu Service Worker
// Estos scripts están disponibles globalmente en el Service Worker
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

// TODO: Reemplaza con tus credenciales de Firebase (las mismas que en environment.ts)
// Puedes obtenerlas de tu archivo `firebase-config.js` si usaste el script CDN,
// o copiarlas manualmente desde `environment.ts`.
const firebaseConfig = {
  apiKey: "AIzaSyC3jn-ka6ul3x63iSwfaxvc0JIetmOGBX0",
    authDomain: "orgullo-94b10.firebaseapp.com",
    databaseURL: "https://orgullo-94b10-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "orgullo-94b10",
    storageBucket: "orgullo-94b10.firebasestorage.app",
    messagingSenderId: "395150735539",
    appId: "1:395150735539:web:5d8c6a7672b93e3e1298c6",
    vapidKey: 'BNH3azYGYcL40f5om9mh0LUBwh-dK_pAeDlJTmFgaPk-WhPvps_Y07kX7k4f9rtXF_AOGF6xNSl15k09EO9eFqE'
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Lógica para cuando se recibe un mensaje mientras el Service Worker está activo (app cerrada o en segundo plano)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Personaliza la notificación aquí
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/icons/icon-72x72.png' // Puedes usar un icono de tu app
    // Otras opciones como 'image', 'actions', 'data', etc.
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
