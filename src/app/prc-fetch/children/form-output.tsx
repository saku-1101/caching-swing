import { fetcher } from "../fetcher";

export default async function FormOutput() {
	const user = await fetcher({
		url: `${process.env.BASE_URL}/api/get/user`,
		tag: "user",
	});
	return (
		<>
			<div>Hello {user.name}!</div>
		</>
	);
}
