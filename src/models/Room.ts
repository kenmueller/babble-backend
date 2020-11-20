import User from './User'
import SocketUserData from './SocketUserData'

export default class Room {
	private static readonly all: Record<string, Room> = {}
	
	private readonly users: Set<User> = new Set()
	
	constructor(readonly id: string) {}
	
	static readonly get = (id: string) =>
		Room.all[id] ??= new Room(id)
	
	get userData(): SocketUserData[] {
		return Array.from(this.users.values())
			.map(({ io: { id }, data }) => ({ id, data }))
	}
	
	readonly addUser = (user: User) => {
		this.users.add(user)
	}
	
	readonly removeUser = (user: User) => {
		this.users.delete(user)
	}
}
