import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./fetcher";

export const useGithub = () => {
  const KEY = "https://api.github.com/repos/tannerlinsley/react-query";

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: [KEY],
    queryFn: () =>
      fetcher({
        url: KEY,
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
        },
      }),
  });
  return { data, error, isPending, isFetching };
};
