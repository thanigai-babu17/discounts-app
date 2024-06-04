import admin from "firebase-admin";
import serviceAccount from "../firebase-admin-sdk-key.json";

const serviceAccountConfig = serviceAccount as admin.ServiceAccount;

declare global {
  var firebaseAdmin: admin.app.App | undefined;
  var firestore: FirebaseFirestore.Firestore | undefined;
}

if (!global.firebaseAdmin) {
  global.firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountConfig),
  });
}

if (!global.firestore) {
  global.firestore = admin.firestore();
}

const firestore = global.firestore;

export default firestore;