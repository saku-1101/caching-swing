import { fetcher } from "../fetcher";

export default async function Header() {
	const data = await fetcher({
		url: "https://api.github.com/repos/vercel/next.js",
	});
	const randomNumber = await fetcher({
		url: `${process.env.BASE_URL}/api/get/unstable/data`,
	});
	const user = await fetcher({
		url: `${process.env.BASE_URL}/api/get/user`,
		tag: "user",
	});
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				padding: "2%",
				border: "1px solid #ccc",
			}}
		>
			<h1 className="text-3xl font-extrabold">{data.name}</h1>
			<p>{data.description}</p>
			<strong>🔢Random Number: {randomNumber.randomNumber}</strong>
			<strong>🌟User: {user.name}</strong>
		</div>
	);
}
