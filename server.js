const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const admin = require('firebase-admin');

// Use the provided path to your Firebase service account JSON file
const serviceAccount = require('./stream-f7ced-firebase-adminsdk-ep3ze-9872f76b67.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://stream-f7ced-default-rtdb.firebaseio.com/', // Update with your Firebase Realtime Database URL
  storageBucket: 'stream-f7ced.appspot.com', // Update with your Firebase Storage Bucket URL
});

const app = express();
const WS_PORT = process.env.PORT || 65080;
const HTTP_PORT = 80;

const wsServer = new WebSocket.Server({ port: WS_PORT }, () => console.log(`WS Server is listening at ${WS_PORT}`));

let connectedClients = [];

wsServer.on('connection', (ws, req) => {
  console.log('Connected');
  connectedClients.push(ws);

  ws.on('message', async (data) => {
    connectedClients.forEach((ws, i) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      } else {
        connectedClients.splice(i, 1);
      }
    });
try {
      // Assume data is the binary image data
      await uploadImageToFirebase(data);
    } catch (error) {
      console.error('Error uploading image to Firebase:', error);
    }
  });
});

// Function to upload image to Firebase Realtime Database and Storage
const uploadImageToFirebase = async (imageData) => {
  try {
    // Convert binary image data to base64
    const base64Image = imageData.toString('base64');

    // Get current date and time to create a unique filename
    const currentDate = new Date();
    const uniqueFilename = `${currentDate.toISOString()}.jpg`;

    // Update storage path with "images" folder
    const storagePath = `images/${uniqueFilename}`;

    // Upload to Firebase Realtime Database
    const databaseRef = admin.database().ref('latestImage');
    await databaseRef.set({ base64Image });

    // Upload to Firebase Storage with a unique filename in "images" folder
    const storageRef = admin.storage().bucket().file(storagePath);
    await storageRef.save(Buffer.from(base64Image, 'base64'), {
      metadata: { contentType: 'image/jpeg' },
    });
  } catch (error) {
    throw error;
  }
};

// Route to serve the latest image directly
app.get('/latestImage', async (req, res) => {
  try {
    // Retrieve the latest base64 image data from Firebase Realtime Database
    const snapshot = await admin.database().ref('latestImage').once('value');
    const base64Image = snapshot.val().base64Image;

    // Send the image in the response
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-cache',
    });
    res.end(Buffer.from(base64Image, 'base64'));
  } catch (error) {
    console.error('Error retrieving image from Firebase:', error);
    res.sendStatus(500);
  }
});

app.get('/client', (req, res) => res.sendFile(path.resolve(__dirname, './client.html')));
app.listen(HTTP_PORT, () => console.log(`HTTP server listening at ${HTTP_PORT}`));
                                                                                                                  
