import admin from 'firebase-admin'
import webpush from 'web-push'

import Server from './Server'
import RoomData from './RoomData'
import User from './User'
import SocketUserData from './SocketUserData'

const { FieldValue } = admin.firestore
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
			? this._data = (
				(await firestore.doc(`rooms/${this.id}`).get()).data() ?? null
			) as RoomData | null
			: this._data
	
	private readonly notifyUser = async (uid: string, payload: string) => {
		const snapshot = await firestore.doc(`pushSubscriptions/${uid}`).get()
		const subscriptions: string[] = snapshot.get('subscriptions') ?? []
		
		await Promise.all(subscriptions.map(subscription =>
			webpush
				.sendNotification(JSON.parse(subscription), payload)
				.catch(async error => {
					if (error.statusCode !== 410)
						return console.error(error)
					
					await snapshot.ref.set({
						subscriptions: FieldValue.arrayRemove(subscription)
					})
				})
		))
	}
	
	readonly addUser = async (user: User) => {
		this.users.add(user)
		
		const data = await this.data()
		const thisId = user.data?.id
		
		if (!data)
			return
		
		const notification = JSON.stringify({
			title: `${user.data?.name ?? 'anonymous'} joined ${data.name}`,
			body: 'Click to join',
			url: `${Server.ORIGIN}/${this.id}`
		})
		
		await Promise.all(
			(await firestore.collection(`rooms/${this.id}/subscribers`).get())
				.docs
				.map(({ id }) =>
					id === thisId
						? Promise.resolve()
						: this.notifyUser(id, notification)
				)
		)
	}
	
	readonly removeUser = (user: User) => {
		this.users.delete(user)
	}
}
