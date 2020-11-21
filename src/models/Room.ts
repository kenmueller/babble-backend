import admin from 'firebase-admin'
import webpush, { PushSubscription } from 'web-push'

import RoomData from './RoomData'
import User from './User'
import SocketUserData from './SocketUserData'

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
	
	private readonly getPushSubscriptions = async (uid: string) =>
		((await firestore.doc(`pushSubscriptions/${uid}`).get())
			.get('subscriptions')?.map(JSON.parse) ?? []) as PushSubscription[]
	
	private readonly notifyUser = async (uid: string, payload: string) => {
		await Promise.all(
			(await this.getPushSubscriptions(uid))
				.map(subscription => webpush.sendNotification(subscription, payload))
		)
	}
	
	readonly addUser = async (user: User) => {
		this.users.add(user)
		
		const data = await this.data()
		const thisId = user.data?.id
		
		if (!data)
			return
		
		const notification = JSON.stringify({
			title: `${user.data?.name ?? 'anonymous'} joined ${data.name}`
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
