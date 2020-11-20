import UserData from '../models/UserData'

const snapshotToUserData = (snapshot: FirebaseFirestore.DocumentSnapshot) =>
	snapshot.exists
		? { id: snapshot.id, ...snapshot.data() } as UserData
		: undefined

export default snapshotToUserData
