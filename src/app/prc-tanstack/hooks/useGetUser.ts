import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./fetcher";

export const useGetUser = () => {
  const KEY = "/api/get/user";

  const { data, error, isLoading } = useQuery({
    queryKey: [KEY],
    queryFn: () => fetcher({ url: KEY }),
  });
  return {
    user: data,
    userError: error,
    userIsLoading: isLoading, // Is the same as isFetching && isPending
    // Pending is true only when the queryFn is executing for the first time.
    // Fetching is true whenever the queryFn is executing, which includes initial pending as well as background refetches.
  };
};
