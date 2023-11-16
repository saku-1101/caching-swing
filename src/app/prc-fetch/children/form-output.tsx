import { fetcher } from "../fetcher";
import { sleep } from "../sleep";

export default async function FormOutput() {
	await sleep(1500);
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
