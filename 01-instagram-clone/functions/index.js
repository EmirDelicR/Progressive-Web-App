const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const webpush = require('web-push');
const fs = require('fs');
const UUID = require('uuid-v4');
const os = require('os');
const Busboy = require('busboy');
const path = require('path');
/*
Create and Deploy Your First Cloud Functions
https://firebase.google.com/docs/functions/write-firebase-functions

exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});
*/

/**
 *  To set this part go to firebase
 *  click on settings > project settings > Service accounts
 *  Click on button generate new private key
 *
 *  Add this to .gitignore
 *  # firebase credentials
 *  functions/pwagram-adminsdk.json
 */
const serviceAccount = require('./pwagram-adminsdk.json');

/** Check in firebase project settings */
const googleCloudConfig = {
  projectId: 'MY_APP_PROJECT_ID',
  keyFilename: 'pwagram-adminsdk.json'
};

const googleCloudStorage = require('@google-cloud/storage')(googleCloudConfig);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-76764.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const uuid = UUID();

    const busboy = new Busboy({ headers: request.headers });
    // These objects will store the values (file + fields) extracted from busboy
    let upload;
    const fields = {};

    // This callback will be invoked for each file uploaded
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(
        `File [${fieldname}] filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`
      );
      const filepath = path.join(os.tmpdir(), filename);
      upload = { file: filepath, type: mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

    // This will invoked on every field detected
    busboy.on(
      'field',
      (
        fieldname,
        val,
        fieldnameTruncated,
        valTruncated,
        encoding,
        mimetype
      ) => {
        fields[fieldname] = val;
      }
    );

    // This callback will be invoked after all uploaded files are saved.
    busboy.on('finish', () => {
      const bucket = googleCloudStorage.bucket('BUCKET_NAME');
      bucket.upload(
        upload.file,
        {
          uploadType: 'media',
          metadata: {
            metadata: {
              contentType: upload.type,
              firebaseStorageDownloadTokens: uuid
            }
          }
        },
        (err, file) => {
          if (err) {
            console.log('Error: ', error);
            return;
          }
          admin
            .database()
            .ref('posts')
            .push({
              id: fields.id,
              title: fields.title,
              location: fields.location,
              rawLocation: {
                lat: fields.rawLocationLat,
                lng: fields.rawLocationLng
              },
              image: `https://firebasestorage.googleapis.com/v0/b/${
                bucket.name
              }/o/${encodeURIComponent(file.name)}?alt=media&token=${uuid}`
            })
            .then(() => {
              webpush.setVapidDetails(
                'mailto: emirdelictbf@gmail.com',
                'PUBLIC_KEY_FROM_WEB_PUSH',
                'PRIVATE_KEY_FORM_WEB_PUSH'
              );
              return admin
                .database()
                .ref('subscriptions')
                .once('value');
            })
            .then(subscriptions => {
              subscriptions.forEach(sub => {
                const pushConfig = {
                  endpoint: sub.val().endpoint,
                  keys: {
                    auth: sub.val().keys.auth,
                    p256dh: sub.val().keys.p256dh
                  }
                };

                webpush
                  .sendNotification(
                    pushConfig,
                    JSON.stringify({
                      title: 'New Post',
                      content: 'New Post added!',
                      openUrl: '/help/'
                    })
                  )
                  .catch(err => {
                    console.log(err);
                  });
              });
              response
                .status(201)
                .json({ message: 'Data stored', id: fields.id });
            })
            .catch(err => {
              response.status(500).json({ error: err });
            });
        }
      );
    });
    // The raw bytes of the upload will be in request.rawBody.  Send it to busboy, and get
    // a callback when it's finished.
    busboy.end(request.rawBody);
    // formData.parse(request, (err, fields, files) => {
    //   fs.rename(files.file.path, "/tmp/" + files.file.name);
    //   const bucket = gcs.bucket("YOUR_PROJECT_ID.appspot.com");
    // });
  });
});
