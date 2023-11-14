"use client";
import { broadcastQueryClient } from "@tanstack/query-broadcast-client-experimental";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BackButton from "../_component/back-button";
import LinkButton from "../_component/link-button";
import Content from "./children/content";
import Header from "./children/header";
import { Person } from "./children/user";

export default function TanstackPage() {
	const queryClient = new QueryClient();
	broadcastQueryClient({
		queryClient,
		broadcastChannel: "tanstack-app",
	});
	return (
		<QueryClientProvider client={queryClient}>
			<div>
				<Header />
				<Content />
				<Person />
				<BackButton />
				<LinkButton link="/prc-swr" label="swr" />
				<LinkButton link="/prc-fetch" label="fetch" />
			</div>
		</QueryClientProvider>
	);
}
