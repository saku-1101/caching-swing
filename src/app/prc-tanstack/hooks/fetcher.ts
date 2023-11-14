export const fetcher = ({
  url,
  headers,
  postObj,
}: {
  url: string;
  headers?: HeadersInit;
  postObj?: {
    method: string;
    body: BodyInit;
  };
}) => fetch(url, { headers: headers, ...postObj }).then((res) => res.json());
