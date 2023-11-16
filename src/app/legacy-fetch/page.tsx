"use client";
import { User } from "@prisma/client";
import { useEffect, useState } from "react";
import BackButton from "../_component/back-button";
import LinkButton from "../_component/link-button";
import Content from "./children/content";
import Header from "./children/header";
import { Person } from "./children/user";
const fetcher = (url: string) =>
	fetch(url, {
		headers: {
			Authorization: `Bearer ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
		},
	}).then((res) => res.json());
export default function LegacyFetchPage() {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const [data, setData] = useState<any>();
	const [randomNumber, setRandomNumber] = useState<number>();
	const [user, setUser] = useState<User>();

	useEffect(() => {
		Promise.all([
			fetcher("https://api.github.com/repos/vercel/next.js"),
			fetcher("/api/get/unstable/data"),
			fetcher("/api/get/user"),
		]).then(([data, number, user]) => {
			setData(data);
			setRandomNumber(number.randomNumber);
			setUser(user);
		});
	}, []);
	if (!data) {
		return <div>⏳loading...</div>;
	}
	return (
		<div>
			<Header data={{ ...data }} randomNumber={randomNumber} user={user} />
			<Content data={{ ...data }} randomNumber={randomNumber} />
			<Person user={user} setter={setUser} />
			<BackButton />
			<LinkButton link="/prc-tanstack" label="tanstack" />
			<LinkButton link="/prc-swr" label="swr" />
			<LinkButton link="/prc-fetch" label="fetch" />
		</div>
	);
}
