import admin from 'firebase-admin'
import { Socket } from 'socket.io'

import Room from './Room'
import UserData from './UserData'
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
}
