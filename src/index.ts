import admin from 'firebase-admin'

admin.initializeApp({
	credential: admin.credential.cert(
		JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG!, 'base64').toString())
	),
	databaseURL: process.env.FIREBASE_DATABASE_URL
})

import Server from './models/Server'

new Server().listen().then(port => {
	console.log(`Listening on http://localhost:${port}`)
})
