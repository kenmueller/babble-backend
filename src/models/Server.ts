import express, { Application } from 'express'
import { createServer, Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import webpush from 'web-push'

import User from './User'

export default class Server {
	static readonly PORT = process.env.PORT || '5000'
	static readonly ORIGIN = process.env.NODE_ENV === 'production'
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
		
		this.notifications()
		this.routes()
		this.socket()
	}
	
	private readonly notifications = () => {
		webpush.setVapidDetails(
			`mailto:${process.env.VAPID_EMAIL!}`,
			process.env.PUBLIC_VAPID_KEY!,
			process.env.PRIVATE_VAPID_KEY!
		)
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
		this.io.on('connect', (io: Socket) => new User(io))
	}
	
	readonly listen = () =>
		new Promise<string>(resolve => {
			this.server.listen(Server.PORT, () => resolve(Server.PORT))
		})
}
