import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./fetcher";

export const useGetNumber = () => {
  const KEY = "/api/get/unstable/data";

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: [KEY],
    queryFn: () => fetcher({ url: KEY }),
  });
  return { data, error, isPending, isFetching };
};
