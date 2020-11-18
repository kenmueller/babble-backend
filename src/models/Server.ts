import express, { Application } from 'express'
import { createServer, Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

export default class Server {
	private static readonly PORT = process.env.PORT || '5000'
	private static readonly ORIGIN = process.env.NODE_ENV === 'production'
		? 'https://babble.vercel.app'
		: 'http://localhost:3000'
	
	private readonly app: Application
	private readonly server: HTTPServer
	private readonly io: SocketIOServer
	
	constructor() {
		this.app = express()
		this.server = createServer(this.app)
		this.io = new SocketIOServer(this.server, {
			cors: { origin: Server.ORIGIN }
		})
		
		this.routes()
		this.socket()
	}
	
	private readonly routes = () => {
		this.app.use((_req, res, next) => {
			res.header('Access-Control-Allow-Origin', Server.ORIGIN)
			next()
		})
		
		this.app.get('/', (_req, res) => {
			res.redirect(301, Server.ORIGIN)
		})
	}
	
	private readonly socket = () => {
		this.io.on('connect', () => {})
	}
	
	readonly listen = () =>
		new Promise<string>(resolve => {
			this.server.listen(Server.PORT, () => resolve(Server.PORT))
		})
}
