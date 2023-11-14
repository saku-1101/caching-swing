import { fetcher } from "./fetcher";
import useSWR from "swr";

export const useGetNumber = () => {
  const url = "/api/get/unstable/data";

  const { data, error, isLoading, isValidating } = useSWR(url, fetcher);
  return { data, error, isLoading, isValidating };
};
