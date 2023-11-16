import { User } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Dispatch, FormEvent, SetStateAction } from "react";

export const Person = ({
	user,
	setter,
}: {
	user: User | undefined;
	setter: Dispatch<SetStateAction<User | undefined>>;
}) => {
	const router = useRouter();
	async function handleUpdateUserName(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);

		const res = await fetch("/api/update/user", {
			method: "POST",
			body: JSON.stringify({
				name: data.get("name"),
			}),
		});

		const user = await res.json();
		setter(user);
		router.refresh();
	}
	if (!user) return <div>User is not defined.</div>;
	return (
		<>
			<div>Hello {user.name}!</div>
			<form onSubmit={handleUpdateUserName}>
				<label htmlFor="name">Enter your new name:</label>
				<br />
				<input
					type="text"
					name="name"
					style={{ padding: "2px", margin: "2px" }}
				/>
				<button type="submit" style={{ padding: "2px", margin: "2px" }}>
					Update Name
				</button>
			</form>
		</>
	);
};
