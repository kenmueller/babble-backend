import admin from 'firebase-admin'

import RoomData from './RoomData'
import User from './User'
import SocketUserData from './SocketUserData'
import NotificationPayload from './NotificationPayload'

const firestore = admin.firestore()

export default class Room {
	private static readonly all: Record<string, Room> = {}
	
	private readonly users: Set<User> = new Set()
	private _data?: RoomData | null
	
	constructor(readonly id: string) {}
	
	static readonly get = (id: string) =>
		Room.all[id] ??= new Room(id)
	
	get userData(): SocketUserData[] {
		return Array.from(this.users.values())
			.map(({ io: { id }, data }) => ({ id, data }))
	}
	
	private readonly data = async () =>
		this._data === undefined
			? this._data = ((await firestore.doc(`rooms/${this.id}`).get()).data() ?? null) as RoomData | null
			: this._data
	
	readonly addUser = async (user: User) => {
		const _users = Array.from(this.users)
		this.users.add(user)
		
		const data = await this.data()
		
		if (!data)
			return
		
		const notification: NotificationPayload = {
			title: `${user.data?.name ?? 'anonymous'} joined ${data.name}`
		}
		
		await Promise.all(_users.map(user => user.notify(notification)))
	}
	
	readonly removeUser = (user: User) => {
		this.users.delete(user)
	}
}
