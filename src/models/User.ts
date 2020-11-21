import admin from 'firebase-admin'
import webpush, { PushSubscription } from 'web-push'
import { Socket } from 'socket.io'

import Room from './Room'
import UserData from './UserData'
import NotificationPayload from './NotificationPayload'
import snapshotToUserData from '../utils/snapshotToUserData'

const firestore = admin.firestore()

interface Query {
	uid?: string
	room: string
}

export default class User {
	private readonly room: Room
	data?: UserData
	
	constructor(readonly io: Socket) {
		const { uid, room } = io.handshake.query as Query
		
		this.room = Room.get(room)
		this.getData(uid).then(this.join)
	}
	
	private readonly getData = async (uid: string | undefined) => {
		if (!uid)
			return
		
		this.data = snapshotToUserData(await firestore.doc(`users/${uid}`).get())
	}
	
	private readonly join = () => {
		this.room.addUser(this)
		this.io.join(this.room.id)
		
		const { userData } = this.room
		
		this.io.emit('users', userData)
		this.io.to(this.room.id).emit('join', this.io.id, userData)
		
		this.io.on('disconnect', this.leave)
	}
	
	private readonly leave = () => {
		this.room.removeUser(this)
		this.io.to(this.room.id).emit('leave', this.io.id, this.room.userData)
	}
	
	private readonly isSubscribed = async () =>
		this.data
			? (await firestore.doc(`rooms/${this.room.id}/subscribers/${this.data.id}`).get()).exists
			: false
	
	private readonly pushSubscriptions = async (): Promise<PushSubscription[]> =>
		this.data
			? (await firestore.doc(`pushSubscriptions/${this.data.id}`).get())
				.get('subscriptions')?.map(JSON.parse) ?? []
			: []
	
	readonly notify = async (payload: NotificationPayload) => {
		if (!await this.isSubscribed())
			return
		
		const subscriptions = await this.pushSubscriptions()
		const jsonPayload = JSON.stringify(payload)
		
		for (const subscription of subscriptions)
			webpush.sendNotification(subscription, jsonPayload)
	}
}
