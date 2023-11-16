import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./fetcher";

export const useGetUser = () => {
  const KEY = "/api/get/user";

  const { data, error, isFetching } = useQuery({
    queryKey: [KEY],
    queryFn: () => fetcher({ url: KEY }),
  });
  return {
    user: data,
    userError: error,
    userIsFetching: isFetching
  };
};
