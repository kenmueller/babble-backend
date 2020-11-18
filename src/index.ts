import Server from './models/Server'

new Server().listen().then(port => {
	console.log(`Listening on http://localhost:${port}`)
})
