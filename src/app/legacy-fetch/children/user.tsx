import { User } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FormEvent } from "react";

export const Person = ({ user }: { user: User | undefined }) => {
	const router = useRouter();
	async function handleUpdateUserName(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);

		await fetch("/api/update/user", {
			method: "POST",
			body: JSON.stringify({
				name: data.get("name"),
			}),
		});
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
