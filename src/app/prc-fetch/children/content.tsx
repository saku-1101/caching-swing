import { fetcher } from "../fetcher";

export default async function Content() {
	const data = await fetcher({
		url: "https://api.github.com/repos/vercel/next.js",
	});
	const randomNumber = await fetcher({
		url: `${process.env.BASE_URL}/api/get/unstable/data`,
	});
	if (!randomNumber) {
		return <div>randomNumber is not defined</div>;
	}
	return (
		<p style={{ padding: "2%" }}>
			<strong>👁Subscribers: {data.subscribers_count}</strong>{" "}
			<strong>✨Stars: {data.stargazers_count}</strong>{" "}
			<strong>🍴Forks: {data.forks_count}</strong>
			<strong>🔢Random Number: {randomNumber.randomNumber}</strong>
		</p>
	);
}
