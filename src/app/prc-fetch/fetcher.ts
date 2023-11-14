export const fetcher = ({url, headers, tag}:{url: string, headers?: HeadersInit, tag?: string}) =>
	fetch(url, {
		...(headers ? headers: headers || {}),
        ...(tag ? { next: { tags: [tag] } } : {})
	}).then((res) => res.json());