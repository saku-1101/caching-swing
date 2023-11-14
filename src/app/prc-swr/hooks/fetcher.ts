export const fetcher = async (url: string, headers?: HeadersInit) =>
  fetch(url, { headers: headers }).then((res) => res.json());
